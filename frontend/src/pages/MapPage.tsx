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
import { Search, List, MapPin } from 'lucide-react';
import type { Provider } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { fetchProviders, postEstimate, type ProviderApi } from '@/api/client';
import { apiEstimateToCostEstimate } from '@/lib/mapEstimate';

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
  };
}

const createPinkIcon = () =>
  L.divIcon({
    html: `<div style="background:hsl(345,50%,77%);width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3" fill="hsl(345,50%,77%)"/></svg>
  </div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

const MapPage = () => {
  const { intakePayload } = useAuth();
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showList, setShowList] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const providersQuery = useQuery({
    queryKey: ['providers', selectedSpecialty],
    queryFn: () =>
      fetchProviders({
        specialty: selectedSpecialty === 'All' ? undefined : selectedSpecialty,
      }),
  });

  const providers = useMemo(
    () => (providersQuery.data ?? []).map(toProvider),
    [providersQuery.data],
  );

  const estimateQuery = useQuery({
    queryKey: ['estimate', intakePayload],
    queryFn: () =>
      postEstimate({
        intake: intakePayload ?? {
          zip: '02118',
          insurance_carrier: 'Blue Cross Blue Shield of Massachusetts',
          care_focus: 'Gastroenterology',
        },
      }),
    enabled: true,
  });

  const estimateById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof apiEstimateToCostEstimate>>();
    for (const e of estimateQuery.data?.estimates ?? []) {
      m.set(e.provider_id, apiEstimateToCostEstimate(e));
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

    const icon = createPinkIcon();
    filtered.forEach(p => {
      const marker = L.marker([p.lat, p.lng], { icon })
        .bindPopup(`<strong>${p.name}</strong><br/><span style="font-size:12px">${p.specialty.join(', ')}</span>`)
        .on('click', () => setSelectedProvider(p));
      markersRef.current!.addLayer(marker);
    });
  }, [filtered]);

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
                Could not load data. Start the API (see README) or check the network tab.
              </p>
            )}
            {providersQuery.isLoading && <p className="text-sm text-muted-foreground">Loading providers…</p>}
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
                  estimate={estimateById.get(selectedProvider.id)}
                  onSave={() => toggleSave(selectedProvider.id)}
                  saved={savedIds.has(selectedProvider.id)}
                />
              </div>
            ) : filtered.length > 0 ? (
              filtered.map(p => (
                <div key={p.id} onClick={() => setSelectedProvider(p)} className="cursor-pointer">
                  <ProviderCard
                    provider={p}
                    estimate={estimateById.get(p.id)}
                    onSave={() => toggleSave(p.id)}
                    saved={savedIds.has(p.id)}
                    compact
                  />
                </div>
              ))
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
