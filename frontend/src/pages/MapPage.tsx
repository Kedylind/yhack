import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProviderCard from '@/components/providers/ProviderCard';
import Chip from '@/components/Chip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, List, MapPin, Building2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import type { Provider } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { fetchProviders, postEstimate, type ProviderApi } from '@/api/client';
import { apiEstimateToCostEstimate, formatPinPrice } from '@/lib/mapEstimate';

const SPECIALTIES = ['All', 'Gastroenterology'];

function toProvider(p: ProviderApi): Provider {
  return {
    id: p.id,
    name: p.name,
    specialty: p.specialties,
    address: `${p.address}, ${p.city}, MA ${p.zip}`,
    lat: p.lat,
    lng: p.lng,
    phone: p.phone,
    hospital: p.hospital,
  };
}

/** Airbnb-style: price pill + pin (CareCost pink). */
const createPricePinIcon = (priceLabel: string) => {
  const safe = priceLabel.replace(/[<>]/g, '');
  return L.divIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;width:max-content;pointer-events:none;">
      <div style="background:#fff;border:1px solid hsl(345,40%,88%);border-radius:14px;padding:4px 10px;font-size:13px;font-weight:700;color:hsl(340,6%,17%);box-shadow:0 2px 10px rgba(0,0,0,0.1);white-space:nowrap;">${safe}</div>
      <div style="width:2px;height:5px;background:hsl(345,40%,85%);"></div>
      <div style="width:13px;height:13px;border-radius:50%;background:hsl(345,50%,77%);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.18);"></div>
    </div>`,
    className: '',
    iconSize: [96, 56],
    iconAnchor: [48, 56],
  });
};

const MapPage = () => {
  const { intakePayload, insurance } = useAuth();
  const insuranceCarrierLabel =
    (typeof intakePayload?.insurance_carrier === 'string' && intakePayload.insurance_carrier) ||
    insurance?.carrier ||
    'Your plan';
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showList, setShowList] = useState(false);
  const [collapsedHospitals, setCollapsedHospitals] = useState<Set<string>>(new Set());

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const providersQuery = useQuery({
    queryKey: ['providers', selectedSpecialty],
    queryFn: () =>
      fetchProviders({
        specialty: selectedSpecialty === 'All' ? undefined : selectedSpecialty,
      }),
    /** After Mongo re-seed, old data must not stick while you stay on /map */
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const providers = useMemo(
    () => (providersQuery.data ?? []).map(toProvider),
    [providersQuery.data],
  );

  const estimateQuery = useQuery({
    queryKey: ['estimate', intakePayload],
    queryFn: () => {
      const fallback = {
        zip: '02118',
        insurance_carrier: 'Blue Cross Blue Shield of Massachusetts',
        care_focus: 'Gastroenterology',
        scenario_id: 'colonoscopy_screening',
        bundle_id: 'colonoscopy_screening',
      };
      const intake = { ...fallback, ...(intakePayload ?? {}) };
      const bundle_id =
        typeof intake.bundle_id === 'string' && intake.bundle_id
          ? intake.bundle_id
          : 'colonoscopy_screening';
      const scenario_id =
        typeof intake.scenario_id === 'string' && intake.scenario_id ? intake.scenario_id : bundle_id;
      return postEstimate({ intake, bundle_id, scenario_id });
    },
    enabled: true,
  });

  const procedureSummary =
    typeof intakePayload?.procedure_label === 'string'
      ? intakePayload.procedure_label
      : typeof intakePayload?.cpt_code === 'string'
        ? `CPT ${intakePayload.cpt_code}`
        : null;

  const estimatesLackRates = useMemo(() => {
    const rows = estimateQuery.data?.estimates ?? [];
    if (rows.length === 0 || estimateQuery.isError) return false;
    return !rows.some(r => r.allowed_amount_range.max > 0 || r.oop_range.max > 0);
  }, [estimateQuery.data, estimateQuery.isError]);

  const estimateById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof apiEstimateToCostEstimate>>();
    for (const e of estimateQuery.data?.estimates ?? []) {
      const row = apiEstimateToCostEstimate(e);
      m.set(row.providerId, row);
    }
    return m;
  }, [estimateQuery.data]);

  const filtered = useMemo(() => {
    return providers.filter(p => {
      const matchSpec =
        selectedSpecialty === 'All' || p.specialty.some(s => s.includes(selectedSpecialty));
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSpec && matchSearch;
    });
  }, [providers, selectedSpecialty, searchQuery]);

  const groupedByHospital = useMemo(() => {
    const groups = new Map<string, Provider[]>();
    for (const p of filtered) {
      const key = p.hospital || 'Other';
      const list = groups.get(key) ?? [];
      list.push(p);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const toggleHospital = (name: string) => {
    setCollapsedHospitals(s => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([42.3601, -71.0589], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a>',
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    filtered.forEach(p => {
      const est = estimateById.get(String(p.id));
      const priceLabel = est ? formatPinPrice(est) : '—';
      const icon = createPricePinIcon(priceLabel);
      const marker = L.marker([p.lat, p.lng], { icon })
        .bindPopup(
          `<strong>${p.name}</strong><br/><span style="font-size:12px">${p.specialty.join(', ')}</span>` +
            (est
              ? `<br/><span style="font-size:12px;margin-top:4px;display:inline-block;font-weight:600;color:hsl(345,42%,45%);">Est. OOP: ${priceLabel}</span>`
              : ''),
        )
        .on('click', () => setSelectedProvider(p));
      markersRef.current!.addLayer(marker);
    });
  }, [filtered, estimateById]);

  const toggleSave = (id: string) => {
    setSavedIds(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const loadError = providersQuery.isError || estimateQuery.isError;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 relative min-h-[400px] lg:min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />

          <div className="absolute top-3 right-3 z-[1000] lg:hidden">
            <Button size="sm" variant="outline" className="bg-card shadow-card" onClick={() => setShowList(!showList)}>
              {showList ? (
                <>
                  <MapPin className="w-4 h-4 mr-1" /> Map
                </>
              ) : (
                <>
                  <List className="w-4 h-4 mr-1" /> List
                </>
              )}
            </Button>
          </div>
        </div>

        <div
          className={`lg:w-[420px] bg-card border-l border-border overflow-y-auto ${showList ? 'block' : 'hidden lg:block'}`}
        >
          <div className="p-4 border-b border-border space-y-3">
            {loadError && (
              <p className="text-sm text-destructive">
                Could not load map data. Run the API on port 8000, ensure MongoDB is running, and seed providers
                (see the repo README). The Vite dev server proxies <code className="text-xs">/api</code> to{' '}
                <code className="text-xs">127.0.0.1:8000</code>.
              </p>
            )}
            {procedureSummary && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Estimates for</p>
                <p className="font-medium text-foreground leading-snug">{procedureSummary}</p>
                {typeof intakePayload?.cpt_code === 'string' && (
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">CPT {intakePayload.cpt_code}</p>
                )}
              </div>
            )}
            {estimatesLackRates && (
              <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 rounded-lg px-3 py-2">
                No hospital rates found in the database for this CPT/bundle — pins cannot show dollars. From the repo
                root run{' '}
                <code className="text-[11px] bg-background/80 px-1 rounded">python scripts/import_csv_to_mongo.py --az-mvp</code>{' '}
                (same Mongo as the API), then refresh.
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              {providersQuery.isLoading && <p className="text-sm text-muted-foreground">Loading providers…</p>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto shrink-0"
                disabled={providersQuery.isFetching}
                onClick={() => {
                  void providersQuery.refetch();
                  void estimateQuery.refetch();
                }}
                title="Reload providers from the API (use after re-seeding MongoDB)"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${providersQuery.isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search providers…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map(s => (
                <Chip key={s} label={s} active={selectedSpecialty === s} onClick={() => setSelectedSpecialty(s)} />
              ))}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {selectedProvider ? (
              <div>
                <button type="button" onClick={() => setSelectedProvider(null)} className="text-sm text-primary hover:underline mb-3">
                  ← Back to list
                </button>
                <ProviderCard
                  provider={selectedProvider}
                  estimate={estimateById.get(String(selectedProvider.id))}
                  insuranceLabel={insuranceCarrierLabel}
                  onSave={() => toggleSave(selectedProvider.id)}
                  saved={savedIds.has(selectedProvider.id)}
                />
              </div>
            ) : groupedByHospital.length > 0 ? (
              groupedByHospital.map(([hospitalName, hospitalProviders]) => {
                const isCollapsed = collapsedHospitals.has(hospitalName);
                return (
                  <div key={hospitalName} className="mb-2">
                    <button
                      type="button"
                      onClick={() => toggleHospital(hospitalName)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      <Building2 className="w-4 h-4 shrink-0 text-primary" />
                      <span className="font-semibold text-sm flex-1 truncate">{hospitalName}</span>
                      <span className="text-xs text-muted-foreground">{hospitalProviders.length}</span>
                    </button>
                    {!isCollapsed && (
                      <div className="mt-2 space-y-2 pl-2">
                        {hospitalProviders.map(p => (
                          <div key={p.id} onClick={() => setSelectedProvider(p)} className="cursor-pointer">
                            <ProviderCard
                              provider={p}
                              estimate={estimateById.get(String(p.id))}
                              insuranceLabel={insuranceCarrierLabel}
                              onSave={() => toggleSave(p.id)}
                              saved={savedIds.has(p.id)}
                              compact
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No providers found</p>
                <p className="text-sm text-muted-foreground mt-1">Try another specialty or widen your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MapPage;
