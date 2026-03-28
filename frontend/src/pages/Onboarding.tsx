import { useState } from 'react';
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
import { postIntake } from '@/api/client';

const STEPS = ['About you', 'Coverage', 'Care focus'];

/** Boston GI demo: single specialty default per product scope. */
const SPECIALTIES = ['Gastroenterology'];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({ fullName: '', zip: '' });
  const [insurance, setInsurance] = useState<InsuranceProfile>({
    carrier: '', planName: '', planType: 'PPO', deductible: 0, oopMax: 0,
  });
  const [careFocus, setCareFocus] = useState('Gastroenterology');
  const [done, setDone] = useState(false);
  const { setProfile: saveProfile, setInsurance: saveInsurance, setIntakePayload, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const next = () => setStep(s => Math.min(s + 1, 2));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    saveProfile(profile);
    saveInsurance(insurance);
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
      care_focus: careFocus,
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
              <Label>Date of birth</Label>
              <Input type="date" value={profile.dob || ''} onChange={e => setProfile(p => ({ ...p, dob: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>ZIP code <span className="text-muted-foreground font-normal">(Boston area)</span></Label>
              <Input value={profile.zip} onChange={e => setProfile(p => ({ ...p, zip: e.target.value }))} placeholder="02101" className="mt-1" />
            </div>
            <div>
              <Label>Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={profile.phone || ''} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
            </div>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary-hover h-11 mt-2" onClick={next} disabled={!profile.fullName || !profile.zip}>
              Continue
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Your coverage</h2>
            <div>
              <Label>Insurance carrier</Label>
              <Input value={insurance.carrier} onChange={e => setInsurance(ins => ({ ...ins, carrier: e.target.value }))} placeholder="e.g. Blue Cross" className="mt-1" />
            </div>
            <div>
              <Label>Plan name</Label>
              <Input value={insurance.planName} onChange={e => setInsurance(ins => ({ ...ins, planName: e.target.value }))} className="mt-1" />
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
              <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-11" onClick={next} disabled={!insurance.carrier || !insurance.planName}>Continue</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">What care are you looking for?</h2>
            <p className="text-sm text-muted-foreground">This sets your default map filter. You can change it anytime.</p>
            <Select value={careFocus} onValueChange={setCareFocus}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a specialty" /></SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1 h-11" onClick={back}>Back</Button>
              <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-11" onClick={submit} disabled={!careFocus}>Finish setup</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
