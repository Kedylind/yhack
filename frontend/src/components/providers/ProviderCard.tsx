import { MapPin, Phone, Bookmark, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Provider, CostEstimate } from '@/types';

interface ProviderCardProps {
  provider: Provider;
  estimate?: CostEstimate;
  onSave?: () => void;
  saved?: boolean;
  compact?: boolean;
}

const ProviderCard = ({ provider, estimate, onSave, saved = false, compact = false }: ProviderCardProps) => (
  <div className="bg-card rounded-2xl border border-border shadow-card p-5 animate-fade-in">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="font-semibold text-lg leading-tight">{provider.name}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{provider.specialty.join(', ')}</p>
      </div>
      {provider.distance !== undefined && (
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{provider.distance.toFixed(1)} mi</span>
      )}
    </div>

    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
      <MapPin className="w-3.5 h-3.5 shrink-0" />
      <span>{provider.address}</span>
    </div>
    {provider.phone && (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <Phone className="w-3.5 h-3.5 shrink-0" />
        <span>{provider.phone}</span>
      </div>
    )}

    {provider.inNetwork !== undefined && (
      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${
        provider.inNetwork ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
      }`}>
        {provider.inNetwork ? 'In-network' : 'Out-of-network'}
      </span>
    )}

    {estimate && !compact && (
      <div className="bg-muted rounded-xl p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cost Estimate</p>
        {estimate.procedureName && <p className="text-sm font-medium mb-2">{estimate.procedureName}</p>}
        <div className="space-y-1 text-sm">
          {estimate.deductibleApplied !== undefined && (
            <div className="flex justify-between"><span className="text-muted-foreground">Deductible applied</span><span>${estimate.deductibleApplied}</span></div>
          )}
          {estimate.copay !== undefined && (
            <div className="flex justify-between"><span className="text-muted-foreground">Copay</span><span>${estimate.copay}</span></div>
          )}
          {estimate.coinsurance !== undefined && (
            <div className="flex justify-between"><span className="text-muted-foreground">Coinsurance</span><span>${estimate.coinsurance}</span></div>
          )}
          <div className="flex justify-between font-semibold pt-1 border-t border-border">
            <span>Your estimated cost</span>
            <span className="text-foreground">${estimate.patientResponsibility}</span>
          </div>
        </div>
        {estimate.note && <p className="text-xs text-muted-foreground mt-2">{estimate.note}</p>}
      </div>
    )}

    {estimate && compact && (
      <p className="text-sm font-medium mb-3">
        Est. <span className="text-foreground">${estimate.patientResponsibility}</span>
      </p>
    )}

    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={onSave}
      >
        <Bookmark className={`w-4 h-4 mr-1 ${saved ? 'fill-primary' : ''}`} />
        {saved ? 'Saved' : 'Save'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`, '_blank')}
      >
        <ExternalLink className="w-4 h-4 mr-1" />
        Directions
      </Button>
    </div>
  </div>
);

export default ProviderCard;
