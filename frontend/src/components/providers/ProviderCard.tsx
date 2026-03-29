import { MapPin, Phone, Bookmark, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { Provider, CostEstimate } from '@/types';

interface ProviderCardProps {
  provider: Provider;
  estimate?: CostEstimate;
  /** Shown above your-plan pricing (e.g. carrier from onboarding). */
  insuranceLabel?: string;
  /** When false, show negotiated rate instead of OOP range. */
  hasFullPlanData?: boolean;
  onSave?: () => void;
  saved?: boolean;
  compact?: boolean;
}

/** Format the primary price line based on whether we have full plan data. */
function formatPrice(estimate: CostEstimate, hasFullPlanData: boolean): { label: string; tooltip: string } {
  if (hasFullPlanData) {
    const min = estimate.oopMin;
    const max = estimate.oopMax ?? estimate.patientResponsibility;
    const price = min !== undefined && max !== undefined && min !== max
      ? `$${min.toLocaleString()}–$${max.toLocaleString()}`
      : `$${max.toLocaleString()}`;
    return { label: price, tooltip: 'Estimated as (negotiated rate - your deductible) x your coinsurance %. Call your plan to verify.' };
  }
  // No full plan data — show negotiated rate as the base price
  const allowed = estimate.allowedMaxDollars ?? estimate.allowedMinDollars;
  if (allowed != null && allowed > 0) {
    return { label: `$${allowed.toLocaleString()}`, tooltip: 'This is the negotiated rate. Enter your deductible and coinsurance for a personalized estimate.' };
  }
  const max = estimate.oopMax ?? estimate.patientResponsibility;
  return { label: `$${max.toLocaleString()}`, tooltip: 'Enter your deductible and coinsurance for a personalized estimate.' };
}

const ProviderCard = ({
  provider,
  estimate,
  insuranceLabel = 'Your plan',
  hasFullPlanData = false,
  onSave,
  saved = false,
  compact = false,
}: ProviderCardProps) => {
  const priceInfo = estimate ? formatPrice(estimate, hasFullPlanData) : null;

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

      {estimate && !compact && (
        <div className="bg-muted rounded-xl p-4 mb-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {hasFullPlanData ? 'Your plan' : 'Negotiated rate'}
            </p>
            <p className="text-xs text-muted-foreground mb-2">{insuranceLabel}</p>
            {estimate.procedureName && <p className="text-sm font-medium mb-2">{estimate.procedureName}</p>}
            <div className="space-y-1 text-sm">
              {hasFullPlanData && estimate.deductibleApplied !== undefined && (
                <div className="flex justify-between"><span className="text-muted-foreground">Deductible applied</span><span>${estimate.deductibleApplied}</span></div>
              )}
              {hasFullPlanData && estimate.copay !== undefined && (
                <div className="flex justify-between"><span className="text-muted-foreground">Copay</span><span>${estimate.copay}</span></div>
              )}
              {hasFullPlanData && estimate.coinsurance !== undefined && (
                <div className="flex justify-between"><span className="text-muted-foreground">Coinsurance</span><span>${estimate.coinsurance}</span></div>
              )}
              <div className="flex justify-between items-center font-semibold pt-1 border-t border-border">
                <span className="flex items-center gap-1">
                  {hasFullPlanData ? 'Est. cost (your insurance)' : 'Base price'}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      <p>{priceInfo?.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-foreground">{priceInfo?.label}</span>
              </div>
            </div>
          </div>
          {estimate.otherInsurersOopMin !== undefined && estimate.otherInsurersOopMax !== undefined && (
            <div className="pt-2 border-t border-border/80">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Other insurances (est.)</p>
              <p className="text-sm text-foreground">
                ${estimate.otherInsurersOopMin.toLocaleString()} – ${estimate.otherInsurersOopMax.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Range across other payer rates in our data (not your plan).</p>
            </div>
          )}
          {estimate.note && <p className="text-xs text-muted-foreground pt-1">{estimate.note}</p>}
        </div>
      )}

      {estimate && compact && (
        <div className="mb-3 space-y-1">
          <p className="text-sm font-medium">
            <span className="text-muted-foreground font-normal text-xs block">{insuranceLabel}</span>
            {hasFullPlanData ? 'Est.' : 'Rate'}{' '}
            <span className="text-foreground">{priceInfo?.label}</span>
            {!hasFullPlanData && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 inline ml-1 -mt-0.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p>{priceInfo?.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </p>
          {estimate.otherInsurersOopMin !== undefined && estimate.otherInsurersOopMax !== undefined && (
            <p className="text-xs text-muted-foreground">
              Others: ${estimate.otherInsurersOopMin.toLocaleString()}–${estimate.otherInsurersOopMax.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {!estimate && !compact && (
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
