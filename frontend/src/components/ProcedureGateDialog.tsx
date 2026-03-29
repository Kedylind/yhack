import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GiProcedureWizard from '@/components/GiProcedureWizard';
import { SPECIALTY_SELECT_OPTIONS } from '@/lib/specialties';
import { isGastroProcedureComplete } from '@/lib/specialties/gastro/intake';
import type { GiProcedureSelection } from '@/lib/giDecisionTree';
import { loadGiContinuity } from '@/lib/giContinuity';
import { useAuth } from '@/context/AuthContext';

interface ProcedureGateDialogProps {
  open: boolean;
  onComplete: (sel: { cpt: string; label: string; bundleId: string }) => void;
  onDismiss: () => void;
}

/**
 * Map entry gate: specialty (Gastro vs Dermatology coming soon) → symptom + AI GI wizard → CPT/bundle for estimates.
 */
const ProcedureGateDialog = ({ open, onComplete, onDismiss }: ProcedureGateDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [specialty, setSpecialty] = useState('');
  const [procedureSelection, setProcedureSelection] = useState<GiProcedureSelection | null>(null);
  const [symptomNotes, setSymptomNotes] = useState('');
  const didCompleteRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    didCompleteRef.current = false;
    const c = loadGiContinuity(user?.email);
    const hasText = (c?.symptomNotes?.trim().length ?? 0) > 0;
    if (c?.procedure || hasText) {
      setStep(2);
      setSpecialty('Gastroenterology');
      setSymptomNotes(c?.symptomNotes ?? '');
      setProcedureSelection(
        c?.procedure
          ? {
              bundleId: c.procedure.bundleId,
              scenarioId: c.procedure.scenarioId,
              cptCode: c.procedure.cptCode,
              title: c.procedure.title,
              description: c.procedure.description ?? '',
              pathIds: c.procedure.pathIds ?? [],
            }
          : null,
      );
    } else {
      setStep(1);
      setSpecialty('');
      setProcedureSelection(null);
      setSymptomNotes('');
    }
  }, [open, user?.email]);

  const handleProcedureChange = (v: GiProcedureSelection | null) => {
    setProcedureSelection(v);
    if (v != null && isGastroProcedureComplete(v)) {
      didCompleteRef.current = true;
      onComplete({ cpt: v.cptCode, label: v.title, bundleId: v.bundleId });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !didCompleteRef.current) onDismiss();
      }}
    >
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0"
      >
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {step === 1 ? 'Choose a specialty' : 'Your symptoms & procedure'}
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? 'Select a specialty. Only Gastroenterology is available in this demo; more specialties are coming soon.'
                : 'Tell us about your symptoms first. The assistant refines what you share until we pick the most likely procedure code for your estimate—not the other way around.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 min-h-0">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Medical specialty</Label>
                <Select value={specialty || undefined} onValueChange={setSpecialty}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select a specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTY_SELECT_OPTIONS.map(opt => (
                      <SelectItem key={opt.id} value={opt.id} disabled={!opt.available}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
                disabled={specialty !== 'Gastroenterology'}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Button type="button" variant="ghost" size="sm" className="-mt-1 -ml-2" onClick={() => setStep(1)}>
                ← Back to specialty
              </Button>
              <GiProcedureWizard
                value={procedureSelection}
                onChange={handleProcedureChange}
                symptomNotes={symptomNotes}
                onSymptomNotesChange={setSymptomNotes}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProcedureGateDialog;
