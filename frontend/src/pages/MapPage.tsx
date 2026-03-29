import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProviderCard from '@/components/providers/ProviderCard';
import ProcedureGateDialog from '@/components/ProcedureGateDialog';
import { getGiLeafSelectOptions } from '@/lib/giDecisionTree';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, List, MapPin, Building2, ChevronDown, ChevronRight, RefreshCw, Info } from 'lucide-react';
import type { Provider } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { fetchProviders, fetchHospitals, postEstimate, type ProviderApi, type HospitalApi } from '@/api/client';
import { apiEstimateToCostEstimate } from '@/lib/mapEstimate';
import { getPayerPrice, computeYourPlanEstimate, carrierKeyFromLabel } from '@/lib/payerPrice';

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

/** Payer key → human label for display. */
function payerDisplayLabel(carrier: string): string {
  const key = carrierKeyFromLabel(carrier);
  const labels: Record<string, string> = {
    bcbs: 'BCBS',
    aetna: 'Aetna',
    harvard_pilgrim: 'Harvard Pilgrim',
    uhc: 'UHC',
  };
  return labels[key] ?? 'BCBS';
}

const MapPage = () => {
  const { intakePayload, insurance } = useAuth();
  const insuranceCarrierLabel =
    (typeof intakePayload?.insurance_carrier === 'string' && intakePayload.insurance_carrier) ||
    insurance?.carrier ||
    'Your plan';

  // --- CRT selection state ---
  const [selectedCrt, setSelectedCrt] = useState<{ cpt: string; label: string; bundleId: string } | null>(null);

  const giLeafOptions = useMemo(() => getGiLeafSelectOptions(), []);

  // Pre-populate from onboarding if user already completed GI procedure selection
  useEffect(() => {
    if (selectedCrt) return;
    const cpt = intakePayload?.cpt_code;
    const bundleId = intakePayload?.bundle_id;
    const label = intakePayload?.procedure_label;
    if (typeof cpt === 'string' && cpt && typeof bundleId === 'string' && bundleId) {
      setSelectedCrt({
        cpt,
        label: typeof label === 'string' && label ? label : 'Selected procedure',
        bundleId,
      });
    }
  }, [intakePayload, selectedCrt]);

  // --- Filter / search state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showList, setShowList] = useState(false);
  const [collapsedHospitals, setCollapsedHospitals] = useState<Set<string>>(new Set());
  const [scrollToHospital, setScrollToHospital] = useState<string | null>(null);
  const hospitalRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const providersQuery = useQuery({
    queryKey: ['providers'],
    queryFn: () => fetchProviders({ specialty: 'Gastroenterology' }),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const hospitalsQuery = useQuery({
    queryKey: ['hospitals', selectedCrt?.cpt],
    queryFn: () => fetchHospitals(selectedCrt!.cpt),
    enabled: selectedCrt !== null,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always' as const,
  });

  const hospitals = useMemo(() => hospitalsQuery.data ?? [], [hospitalsQuery.data]);

  const providers = useMemo(
    () => (providersQuery.data ?? []).map(toProvider),
    [providersQuery.data],
  );

  const estimateQuery = useQuery({
    queryKey: ['estimate', intakePayload, selectedCrt?.bundleId],
    queryFn: () => {
      const fallback = {
        zip: '02118',
        insurance_carrier: 'Blue Cross Blue Shield of Massachusetts',
        care_focus: 'Gastroenterology',
        scenario_id: selectedCrt?.bundleId ?? 'colonoscopy_screening',
        bundle_id: selectedCrt?.bundleId ?? 'colonoscopy_screening',
      };
      const intake = { ...fallback, ...(intakePayload ?? {}) };
      const bundle_id = selectedCrt?.bundleId ?? (typeof intake.bundle_id === 'string' && intake.bundle_id ? intake.bundle_id : 'colonoscopy_screening');
      const scenario_id = typeof intake.scenario_id === 'string' && intake.scenario_id ? intake.scenario_id : bundle_id;
      return postEstimate({ intake, bundle_id, scenario_id });
    },
    enabled: selectedCrt !== null,
  });

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
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [providers, searchQuery]);

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

  // Collapse ALL hospitals by default when data loads
  useEffect(() => {
    if (hospitals.length > 0) {
      setCollapsedHospitals(new Set(hospitals.map(h => h.name)));
    }
  }, [hospitals]);

  // Scroll to hospital after pin click (fires after DOM commit)
  useEffect(() => {
    if (!scrollToHospital) return;
    requestAnimationFrame(() => {
      hospitalRefsMap.current.get(scrollToHospital)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setScrollToHospital(null);
    });
  }, [scrollToHospital, collapsedHospitals]);

  const hasFullPlanData = insurance?.deductible != null && insurance?.coinsurance != null;

  const toggleHospital = (name: string) => {
    setCollapsedHospitals(s => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const container = mapContainerRef.current;

    const ro = new ResizeObserver(() => {
      if (mapRef.current || container.clientHeight < 100 || container.clientWidth < 100) return;
      const map = L.map(container, { zoomAnimation: false, fadeAnimation: false })
        .setView([42.3601, -71.0589], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a>',
      }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Payer-aware map markers
  useEffect(() => {
    if (!markersRef.current || !mapRef.current) return;
    markersRef.current.clearLayers();

    const payerLabel = payerDisplayLabel(insuranceCarrierLabel);

    hospitals.forEach(h => {
      const payerPrice = getPayerPrice(h, insuranceCarrierLabel);
      const priceLabel = payerPrice != null ? `$${Math.round(payerPrice).toLocaleString()}` : '—';
      const icon = createPricePinIcon(priceLabel);

      const rangeText = h.de_identified_min != null && h.de_identified_max != null
        ? `<br/><span style="font-size:11px;color:#666;">Range: $${Math.round(h.de_identified_min).toLocaleString()} – $${Math.round(h.de_identified_max).toLocaleString()}</span>`
        : '<br/><span style="font-size:11px;color:#999;font-style:italic;">Price range was not disclosed</span>';

      const marker = L.marker([h.lat, h.lng], { icon })
        .bindPopup(
          `<strong>${h.name}</strong><br/>` +
          `<span style="font-size:12px">${h.doctor_count} GI doctors</span>` +
          (payerPrice != null ? `<br/><span style="font-size:12px;font-weight:600;color:hsl(345,42%,45%);">${payerLabel}: ${priceLabel}</span>` : '') +
          rangeText,
        )
        .on('click', () => {
          // Collapse all, expand only this one, scroll to it
          setCollapsedHospitals(() => {
            const allCollapsed = new Set(hospitals.map(x => x.name));
            allCollapsed.delete(h.name);
            return allCollapsed;
          });
          setSelectedProvider(null);
          setScrollToHospital(h.name);
        });
      markersRef.current!.addLayer(marker);
    });
  }, [hospitals, insuranceCarrierLabel]);

  const toggleSave = (id: string) => {
    setSavedIds(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const loadError = providersQuery.isError || estimateQuery.isError || hospitalsQuery.isError;
  const payerLabel = payerDisplayLabel(insuranceCarrierLabel);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Specialty → symptoms / AI → procedure; skip if onboarding already sent bundle + CPT */}
      <ProcedureGateDialog
        open={selectedCrt === null}
        onComplete={sel => setSelectedCrt(sel)}
      />

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
            {selectedCrt && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Estimates for</p>
                <p className="font-medium text-foreground leading-snug">{selectedCrt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">CPT {selectedCrt.cpt}</p>
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
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search providers…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={providersQuery.isFetching}
                onClick={() => {
                  void providersQuery.refetch();
                  void estimateQuery.refetch();
                  void hospitalsQuery.refetch();
                }}
                title="Reload providers from the API (use after re-seeding MongoDB)"
              >
                <RefreshCw className={`w-4 h-4 ${providersQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Procedure filter — all GI demo leaves (bundleId is unique) */}
            <div className="flex items-center gap-2">
              <Select
                value={selectedCrt?.bundleId ?? ''}
                onValueChange={bundleId => {
                  const opt = giLeafOptions.find(o => o.bundleId === bundleId);
                  if (opt) setSelectedCrt({ cpt: opt.cptCode, label: opt.title, bundleId: opt.bundleId });
                }}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select procedure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Gastroenterology</SelectLabel>
                    {giLeafOptions.map(opt => (
                      <SelectItem key={opt.bundleId} value={opt.bundleId}>
                        {opt.title} (CPT {opt.cptCode})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
                  hasFullPlanData={hasFullPlanData}
                  onSave={() => toggleSave(selectedProvider.id)}
                  saved={savedIds.has(selectedProvider.id)}
                />
              </div>
            ) : groupedByHospital.length > 0 ? (
              groupedByHospital.map(([hospitalName, hospitalProviders]) => {
                const isCollapsed = collapsedHospitals.has(hospitalName);
                const hData = hospitals.find(h => h.name === hospitalName);
                const hospitalPayerPrice = hData ? getPayerPrice(hData, insuranceCarrierLabel) : null;
                const yourPlanEst = hospitalPayerPrice != null && hasFullPlanData
                  ? computeYourPlanEstimate(hospitalPayerPrice, insurance!.deductible, insurance!.coinsurance!)
                  : null;
                return (
                  <div
                    key={hospitalName}
                    className="mb-2"
                    ref={el => { if (el) hospitalRefsMap.current.set(hospitalName, el); else hospitalRefsMap.current.delete(hospitalName); }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleHospital(hospitalName)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                      <Building2 className="w-4 h-4 shrink-0 text-primary" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm truncate block">{hospitalName}</span>
                        {hospitalPayerPrice != null ? (
                          <span className="text-xs text-muted-foreground">{payerLabel} ${Math.round(hospitalPayerPrice).toLocaleString()}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Price not disclosed</span>
                        )}
                        {yourPlanEst != null ? (
                          <span className="text-xs text-primary ml-2">
                            Your est. ${yourPlanEst.toLocaleString()}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 inline ml-0.5 -mt-0.5" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                <p>Estimated as ({payerLabel} rate − your ${insurance!.deductible.toLocaleString()} deductible) × {insurance!.coinsurance}% coinsurance</p>
                              </TooltipContent>
                            </Tooltip>
                          </span>
                        ) : hospitalPayerPrice != null && !hasFullPlanData ? (
                          <span className="text-xs text-muted-foreground ml-2">
                            ${Math.round(hospitalPayerPrice).toLocaleString()}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 inline ml-0.5 -mt-0.5" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                <p>This is the {payerLabel} negotiated rate. Enter your deductible and coinsurance for a personalized estimate.</p>
                              </TooltipContent>
                            </Tooltip>
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">{hospitalProviders.length}</span>
                    </button>
                    {!isCollapsed && (
                      <div className="mt-2 space-y-2 pl-2">
                        {/* Price range with info tooltip */}
                        {hData?.de_identified_min != null && hData?.de_identified_max != null ? (
                          <div className="bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 text-xs flex items-center gap-1">
                            <span className="font-semibold">Price range:</span>{' '}
                            ${Math.round(hData.de_identified_min).toLocaleString()} – ${Math.round(hData.de_identified_max).toLocaleString()}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                <p>De-identified minimum and maximum negotiated rate across all payers at this hospital, as required by federal price transparency rules.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ) : (
                          <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground italic">
                            Price range was not disclosed by this facility
                          </div>
                        )}
                        {hospitalProviders.map(p => (
                          <div key={p.id} onClick={() => setSelectedProvider(p)} className="cursor-pointer">
                            <ProviderCard
                              provider={p}
                              estimate={estimateById.get(String(p.id))}
                              insuranceLabel={insuranceCarrierLabel}
                              hasFullPlanData={hasFullPlanData}
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
