import { MapPin, Phone, Bookmark, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { computeYourPlanEstimate } from '@/lib/payerPrice';
import type { Provider, CostEstimate } from '@/types';

interface ProviderCardProps {
  provider: Provider;
  estimate?: CostEstimate;
  /** Shown above your-plan pricing (e.g. carrier from onboarding). */
  insuranceLabel?: string;
  /** Hospital-level negotiated rate from hospital_rates (primary price source). */
  hospitalPayerPrice?: number | null;
  /** User's deductible from insurance profile. */
  deductible?: number;
  /** User's coinsurance % from insurance profile. */
  coinsurancePct?: number;
  onSave?: () => void;
  saved?: boolean;
  compact?: boolean;
}

interface PriceDisplay {
  label: string;
  sectionTitle: string;
  lineLabel: string;
  tooltip: string;
}

function buildPriceDisplay(
  hospitalPayerPrice: number | null | undefined,
  deductible: number | undefined,
  coinsurancePct: number | undefined,
  estimate: CostEstimate | undefined,
): PriceDisplay {
  const hasFullPlan = deductible != null && coinsurancePct != null;

  // Priority 1: hospital_rates price (most reliable)
  if (hospitalPayerPrice != null) {
    if (hasFullPlan) {
      const est = computeYourPlanEstimate(hospitalPayerPrice, deductible, coinsurancePct);
      return {
        label: `$${est.toLocaleString()}`,
        sectionTitle: 'Your plan',
        lineLabel: 'Est. cost (your insurance)',
        tooltip: `Estimated as ($${hospitalPayerPrice.toLocaleString()} negotiated rate − $${deductible.toLocaleString()} deductible) × ${coinsurancePct}% coinsurance. Call your plan to verify.`,
      };
    }
    return {
      label: `$${Math.round(hospitalPayerPrice).toLocaleString()}`,
      sectionTitle: 'Negotiated rate',
      lineLabel: 'Base price',
      tooltip: 'This is the negotiated rate between your insurer and this hospital. Enter your deductible and coinsurance for a personalized estimate.',
    };
  }

  // Priority 2: estimate pipeline's allowed amount (fallback)
  if (estimate) {
    const allowed = estimate.allowedMaxDollars ?? estimate.allowedMinDollars;
    if (allowed != null && allowed > 0) {
      if (hasFullPlan) {
        const est = computeYourPlanEstimate(allowed, deductible, coinsurancePct);
        return {
          label: `$${est.toLocaleString()}`,
          sectionTitle: 'Your plan',
          lineLabel: 'Est. cost (your insurance)',
          tooltip: `Estimated from provider-level rate ($${allowed.toLocaleString()}). Call your plan to verify.`,
        };
      }
      return {
        label: `$${allowed.toLocaleString()}`,
        sectionTitle: 'Negotiated rate',
        lineLabel: 'Base price',
        tooltip: 'Provider-level negotiated rate. Enter your deductible and coinsurance for a personalized estimate.',
      };
    }
  }

  return {
    label: '—',
    sectionTitle: 'Pricing',
    lineLabel: 'Price',
    tooltip: 'Price data is not available for this provider.',
  };
}

const ProviderCard = ({
  provider,
  estimate,
  insuranceLabel = 'Your plan',
  hospitalPayerPrice,
  deductible,
  coinsurancePct,
  onSave,
  saved = false,
  compact = false,
}: ProviderCardProps) => {
  const hasPrice = hospitalPayerPrice != null || (estimate?.allowedMaxDollars ?? 0) > 0;
  const price = buildPriceDisplay(hospitalPayerPrice, deductible, coinsurancePct, estimate);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg leading-tight">{provider.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{provider.specialty.join(', ')}</p>
          {provider.hospital && <p className="text-xs text-muted-foreground">{provider.hospital}</p>}
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

      {hasPrice && !compact && (
        <div className="bg-muted rounded-xl p-4 mb-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{price.sectionTitle}</p>
            <p className="text-xs text-muted-foreground mb-2">{insuranceLabel}</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between items-center font-semibold pt-1 border-t border-border">
                <span className="flex items-center gap-1">
                  {price.lineLabel}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>{price.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-foreground">{price.label}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasPrice && compact && (
        <div className="mb-3 space-y-1">
          <p className="text-sm font-medium">
            <span className="text-muted-foreground font-normal text-xs block">{insuranceLabel}</span>
            {price.sectionTitle === 'Your plan' ? 'Est.' : 'Rate'}{' '}
            <span className="text-foreground">{price.label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 inline ml-1 -mt-0.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <p>{price.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </p>
        </div>
      )}

      {!hasPrice && !compact && (
        <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-muted-foreground italic">Price data was not disclosed by this provider</p>
        </div>
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
};

export default ProviderCard;
