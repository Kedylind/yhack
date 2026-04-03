import { createElement, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Stepper from '@/components/Stepper';
import Navbar from '@/components/layout/Navbar';
import type { UserProfile, InsuranceProfile } from '@/types';
import { CheckCircle2 } from 'lucide-react';
import type { InsurerOptionApi } from '@/api/client';
import {
  fetchInsuranceOptions,
  insuranceProfileToApi,
  patchUserMe,
  postIntake,
  userProfileToApi,
} from '@/api/client';
import { isBcbsInsurerKey } from '@/lib/insurance';
import { maskUsDateDigits, parseUsDateToIso } from '@/lib/usDate';
import {
  DEFAULT_SPECIALTY_ID,
  SPECIALTY_SELECT_OPTIONS,
  getSpecialtyPlugin,
} from '@/lib/specialties';

const STEPS = ['About you', 'Coverage', 'Specialty', 'Procedure'];

/** Used when the API is unreachable or DB has no `hospital_rates` yet (build/deploy still works). */
const FALLBACK_INSURERS: InsurerOptionApi[] = [
  { key: 'bcbs', label: 'Blue Cross Blue Shield (BCBS)', price_column: 'bcbs_price' },
  { key: 'aetna', label: 'Aetna', price_column: 'aetna_price' },
  { key: 'harvard_pilgrim', label: 'Harvard Pilgrim', price_column: 'harvard_pilgrim_price' },
  { key: 'uhc', label: 'UnitedHealthcare (UHC)', price_column: 'uhc_price' },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [specialty, setSpecialty] = useState(DEFAULT_SPECIALTY_ID);
  const [profile, setProfile] = useState<UserProfile>({ fullName: '', zip: '' });
  /** Display MM/DD/YYYY; ISO is stored on `profile.dob` when leaving step 0 */
  const [dobDisplay, setDobDisplay] = useState('');
  const [dobError, setDobError] = useState<string | null>(null);
  const [insurance, setInsurance] = useState<InsuranceProfile>({
    carrier: '', planName: '', planType: 'PPO', deductible: 0, oopMax: 0,
  });
  const [symptomNotes, setSymptomNotes] = useState('');
  /** Opaque per-specialty state (e.g. GiProcedureSelection for Gastroenterology). */
  const [procedureSelection, setProcedureSelection] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const [insurers, setInsurers] = useState<InsurerOptionApi[]>([]);
  const [bcbsPlanOptions, setBcbsPlanOptions] = useState<string[]>([]);
  const [coverageOptionsLoading, setCoverageOptionsLoading] = useState(true);
  const {
    setProfile: saveProfile,
    setInsurance: saveInsurance,
    setIntakePayload,
    completeOnboarding,
    isAuthenticated,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchInsuranceOptions();
        if (cancelled) return;
        setInsurers(data.insurers.length > 0 ? data.insurers : FALLBACK_INSURERS);
        setBcbsPlanOptions(data.bcbs_plan_options);
      } catch {
        if (!cancelled) {
          setInsurers(FALLBACK_INSURERS);
          setBcbsPlanOptions([]);
        }
      } finally {
        if (!cancelled) setCoverageOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedInsurerKey = useMemo(
    () => insurers.find(i => i.label === insurance.carrier)?.key ?? '',
    [insurance.carrier, insurers],
  );
  const bcbsSelected = isBcbsInsurerKey(selectedInsurerKey);
  const bcbsPlanPicklist = bcbsSelected && bcbsPlanOptions.length > 0;

  const next = () => setStep(s => Math.min(s + 1, 3));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const goNextFromAbout = () => {
    const iso = parseUsDateToIso(dobDisplay);
    if (!iso) {
      setDobError('Enter a valid date of birth as MM/DD/YYYY.');
      return;
    }
    setDobError(null);
    setProfile(p => ({ ...p, dob: iso }));
    next();
  };

  const submit = async () => {
    const plugin = getSpecialtyPlugin(specialty);
    if (!plugin || !plugin.isProcedureComplete(procedureSelection)) return;
    saveProfile(profile);
    saveInsurance(insurance);

    if (isAuthenticated) {
      try {
        await patchUserMe({
          user_profile: userProfileToApi(profile),
          insurance_profile: insuranceProfileToApi(insurance),
        });
      } catch {
        /* offline or API */
      }
    }

    const intake: Record<string, unknown> = {
      full_name: profile.fullName,
      date_of_birth: profile.dob,
      zip: profile.zip,
      phone: profile.phone,
      insurance_carrier: insurance.carrier,
      plan_name: insurance.planName,
      member_id: insurance.memberId,
      plan_type: insurance.planType,
      deductible_cents: Math.round(Number(insurance.deductible) * 100),
      oop_max_cents: Math.round(Number(insurance.oopMax) * 100),
      copay_cents: insurance.copay != null ? Math.round(Number(insurance.copay) * 100) : undefined,
      coinsurance_pct: insurance.coinsurance,
      care_focus: specialty,
      ...plugin.buildProcedureIntake(procedureSelection, { symptomNotes }),
    };
    try {
      await postIntake(intake);
    } catch {
      // Still allow demo path if API is down
    }
    setIntakePayload(intake);
    completeOnboarding();
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="text-center max-w-sm">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
            <p className="text-muted-foreground mb-6">Your profile and coverage info are saved. Let's find care.</p>
            <Button className="bg-primary text-primary-foreground hover:bg-primary-hover px-8 h-11 rounded-full" onClick={() => navigate('/map')}>
              View map
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const procedurePlugin = getSpecialtyPlugin(specialty);
  const canFinishProcedure = procedurePlugin?.isProcedureComplete(procedureSelection) ?? false;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-10 max-w-lg animate-fade-in">
        <Stepper steps={STEPS} currentStep={step} />

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">About you</h2>
            <div>
              <Label>Full name</Label>
              <Input value={profile.fullName} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="text"
                inputMode="numeric"
                autoComplete="bday"
                placeholder="MM/DD/YYYY"
                value={dobDisplay}
                onChange={e => {
                  setDobDisplay(maskUsDateDigits(e.target.value));
                  setDobError(null);
                }}
                className="mt-1"
                maxLength={10}
              />
              {dobError && <p className="text-xs text-destructive mt-1">{dobError}</p>}
            </div>
            <div>
              <Label>ZIP code <span className="text-muted-foreground font-normal">(Boston area)</span></Label>
              <Input value={profile.zip} onChange={e => setProfile(p => ({ ...p, zip: e.target.value }))} placeholder="02101" className="mt-1" />
            </div>
            <div>
              <Label>Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={profile.phone || ''} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary-hover h-11 mt-2"
              onClick={goNextFromAbout}
              disabled={!profile.fullName || !profile.zip || !parseUsDateToIso(dobDisplay)}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Your coverage</h2>
            {coverageOptionsLoading && (
              <p className="text-sm text-muted-foreground">Loading insurance options…</p>
            )}
            <div>
              <Label>Insurance carrier</Label>
              <Select
                value={selectedInsurerKey || undefined}
                onValueChange={key => {
                  const opt = insurers.find(o => o.key === key);
                  if (!opt) return;
                  setInsurance(ins => ({
                    ...ins,
                    carrier: opt.label,
                    planName: '',
                  }));
                }}
                disabled={coverageOptionsLoading || insurers.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your insurer" />
                </SelectTrigger>
                <SelectContent>
                  {insurers.map(opt => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan name</Label>
              {bcbsPlanPicklist ? (
                <Select
                  value={insurance.planName || undefined}
                  onValueChange={v => setInsurance(ins => ({ ...ins, planName: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a BCBS plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {bcbsPlanOptions.map(plan => (
                      <SelectItem key={plan} value={plan}>
                        {plan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={insurance.planName}
                  onChange={e => setInsurance(ins => ({ ...ins, planName: e.target.value }))}
                  placeholder={bcbsSelected ? 'BCBS plan name' : 'Plan name'}
                  className="mt-1"
                  disabled={!insurance.carrier}
                />
              )}
            </div>
            <div>
              <Label>Member ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={insurance.memberId || ''} onChange={e => setInsurance(ins => ({ ...ins, memberId: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Plan type</Label>
              <Select value={insurance.planType} onValueChange={v => setInsurance(ins => ({ ...ins, planType: v as InsuranceProfile['planType'] }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['PPO', 'HMO', 'EPO', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Deductible ($)</Label>
                <Input type="number" value={insurance.deductible || ''} onChange={e => setInsurance(ins => ({ ...ins, deductible: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label>OOP max ($)</Label>
                <Input type="number" value={insurance.oopMax || ''} onChange={e => setInsurance(ins => ({ ...ins, oopMax: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Copay ($) <span className="text-muted-foreground font-normal">opt.</span></Label>
                <Input type="number" value={insurance.copay || ''} onChange={e => setInsurance(ins => ({ ...ins, copay: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <Label>Coinsurance (%) <span className="text-muted-foreground font-normal">opt.</span></Label>
                <Input type="number" value={insurance.coinsurance || ''} onChange={e => setInsurance(ins => ({ ...ins, coinsurance: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1 h-11" onClick={back}>Back</Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-11"
                onClick={next}
                disabled={
                  coverageOptionsLoading ||
                  !insurance.carrier ||
                  !insurance.planName
                }
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Choose a specialty</h2>
            <div>
              <Label>Medical specialty</Label>
              <Select
                value={specialty}
                onValueChange={v => {
                  setSpecialty(v);
                  setProcedureSelection(null);
                  setSymptomNotes('');
                }}
              >
                <SelectTrigger className="mt-1">
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
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1 h-11" onClick={back}>
                Back
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-11"
                onClick={next}
                disabled={!specialty}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && procedurePlugin && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{procedurePlugin.procedureStep.title}</h2>
            {procedurePlugin.procedureStep.description && (
              <p className="text-sm text-muted-foreground">{procedurePlugin.procedureStep.description}</p>
            )}
            {createElement(procedurePlugin.ProcedureStep, {
              procedureState: procedureSelection,
              setProcedureState: setProcedureSelection,
              symptomNotes,
              setSymptomNotes,
            })}
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1 h-11" onClick={back}>
                Back
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-11"
                onClick={submit}
                disabled={!canFinishProcedure}
              >
                Finish setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
