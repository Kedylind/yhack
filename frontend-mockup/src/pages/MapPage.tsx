import { useState, useMemo, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProviderCard from '@/components/providers/ProviderCard';
import Chip from '@/components/Chip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, List, MapPin } from 'lucide-react';
import type { Provider, CostEstimate } from '@/types';

const SPECIALTIES = ['All', 'Primary Care', 'Dermatology', 'Cardiology', 'Orthopedics', 'OB/GYN', 'Urgent Care'];

// TODO: Replace with API call to API_BASE_URL/providers
const MOCK_PROVIDERS: Provider[] = [
  { id: '1', name: 'Boston Medical Center', specialty: ['Primary Care'], address: '1 Boston Medical Center Pl, Boston, MA', lat: 42.3346, lng: -71.0721, phone: '(617) 638-8000', inNetwork: true, distance: 1.2 },
  { id: '2', name: 'Mass General Hospital', specialty: ['Cardiology', 'Primary Care'], address: '55 Fruit St, Boston, MA', lat: 42.3632, lng: -71.0686, phone: '(617) 726-2000', inNetwork: true, distance: 2.4 },
  { id: '3', name: 'Brigham & Women\'s Hospital', specialty: ['Orthopedics', 'OB/GYN'], address: '75 Francis St, Boston, MA', lat: 42.3358, lng: -71.1065, phone: '(617) 732-5500', inNetwork: true, distance: 3.1 },
  { id: '4', name: 'Beth Israel Deaconess', specialty: ['Dermatology'], address: '330 Brookline Ave, Boston, MA', lat: 42.3381, lng: -71.1063, phone: '(617) 667-7000', inNetwork: false, distance: 3.3 },
  { id: '5', name: 'Tufts Medical Center', specialty: ['Urgent Care', 'Primary Care'], address: '800 Washington St, Boston, MA', lat: 42.3492, lng: -71.0637, phone: '(617) 636-5000', inNetwork: true, distance: 1.8 },
];

// TODO: Replace with API call to API_BASE_URL/estimates
const MOCK_ESTIMATES: Record<string, CostEstimate> = {
  '1': { providerId: '1', procedureName: 'Office Visit (New Patient)', totalCost: 250, deductibleApplied: 50, copay: 30, patientResponsibility: 80 },
  '2': { providerId: '2', procedureName: 'Cardiology Consultation', totalCost: 400, deductibleApplied: 100, copay: 50, coinsurance: 40, patientResponsibility: 190 },
  '3': { providerId: '3', procedureName: 'Orthopedic Evaluation', totalCost: 350, deductibleApplied: 75, copay: 40, patientResponsibility: 115 },
  '4': { providerId: '4', procedureName: 'Dermatology Visit', totalCost: 300, deductibleApplied: 0, copay: 60, patientResponsibility: 180, note: 'Out-of-network rates may apply' },
  '5': { providerId: '5', procedureName: 'Urgent Care Visit', totalCost: 200, copay: 35, patientResponsibility: 35 },
};

const createPinkIcon = () => L.divIcon({
  html: `<div style="background:hsl(345,50%,77%);width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3" fill="hsl(345,50%,77%)"/></svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const MapPage = () => {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showList, setShowList] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const filtered = useMemo(() => {
    return MOCK_PROVIDERS.filter(p => {
      const matchSpec = selectedSpecialty === 'All' || p.specialty.includes(selectedSpecialty);
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSpec && matchSearch;
    });
  }, [selectedSpecialty, searchQuery]);

  // Initialize map
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

  // Update markers when filtered changes
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Map */}
        <div className="flex-1 relative min-h-[400px] lg:min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />

          {/* Mobile toggle */}
          <div className="absolute top-3 right-3 z-[1000] lg:hidden">
            <Button size="sm" variant="outline" className="bg-card shadow-card" onClick={() => setShowList(!showList)}>
              {showList ? <><MapPin className="w-4 h-4 mr-1" /> Map</> : <><List className="w-4 h-4 mr-1" /> List</>}
            </Button>
          </div>
        </div>

        {/* Side panel */}
        <div className={`lg:w-[420px] bg-card border-l border-border overflow-y-auto ${showList ? 'block' : 'hidden lg:block'}`}>
          <div className="p-4 border-b border-border space-y-3">
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
                <button onClick={() => setSelectedProvider(null)} className="text-sm text-primary hover:underline mb-3">← Back to list</button>
                <ProviderCard
                  provider={selectedProvider}
                  estimate={MOCK_ESTIMATES[selectedProvider.id]}
                  onSave={() => toggleSave(selectedProvider.id)}
                  saved={savedIds.has(selectedProvider.id)}
                />
              </div>
            ) : filtered.length > 0 ? (
              filtered.map(p => (
                <div key={p.id} onClick={() => setSelectedProvider(p)} className="cursor-pointer">
                  <ProviderCard
                    provider={p}
                    estimate={MOCK_ESTIMATES[p.id]}
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
