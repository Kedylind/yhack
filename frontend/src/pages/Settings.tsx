import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import type { InsuranceProfile } from '@/types';
import { toast } from 'sonner';
import { insuranceProfileToApi, patchUserMe, userProfileToApi } from '@/api/client';
import { isAuth0Configured } from '@/config/auth';

const Settings = () => {
  const { profile, insurance, setProfile, setInsurance } = useAuth();
  const [name, setName] = useState(profile?.fullName || '');
  const [zip, setZip] = useState(profile?.zip || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [dob, setDob] = useState(profile?.dob || '');
  const [carrier, setCarrier] = useState(insurance?.carrier || '');
  const [planName, setPlanName] = useState(insurance?.planName || '');
  const [memberId, setMemberId] = useState(insurance?.memberId || '');
  const [planType, setPlanType] = useState<InsuranceProfile['planType']>(insurance?.planType || 'PPO');
  const [deductible, setDeductible] = useState(insurance?.deductible || 0);
  const [oopMax, setOopMax] = useState(insurance?.oopMax || 0);
  const [copay, setCopay] = useState(insurance?.copay || 0);
  const [coinsurance, setCoinsurance] = useState(insurance?.coinsurance || 0);

  const save = async () => {
    const nextProfile = { fullName: name, zip, phone, dob };
    const nextInsurance = {
      carrier,
      planName,
      memberId,
      planType,
      deductible,
      oopMax,
      copay,
      coinsurance,
    };
    setProfile(nextProfile);
    setInsurance(nextInsurance);
    if (isAuth0Configured()) {
      try {
        await patchUserMe({
          user_profile: userProfileToApi(nextProfile),
          insurance_profile: insuranceProfileToApi(nextInsurance),
        });
      } catch {
        toast.error('Could not sync profile to the server');
        return;
      }
    }
    toast.success('Profile updated');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-10 max-w-lg animate-fade-in">
        <h1 className="text-2xl font-bold mb-8">Settings</h1>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Personal info</h2>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1" /></div>
            <div><Label>Date of birth</Label><Input type="date" value={dob} onChange={e => setDob(e.target.value)} className="mt-1" /></div>
            <div><Label>ZIP code</Label><Input value={zip} onChange={e => setZip(e.target.value)} className="mt-1" /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" /></div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Insurance</h2>
          <div className="space-y-3">
            <div><Label>Carrier</Label><Input value={carrier} onChange={e => setCarrier(e.target.value)} className="mt-1" /></div>
            <div><Label>Plan name</Label><Input value={planName} onChange={e => setPlanName(e.target.value)} className="mt-1" /></div>
            <div><Label>Member ID</Label><Input value={memberId} onChange={e => setMemberId(e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Plan type</Label>
              <Select value={planType} onValueChange={v => setPlanType(v as InsuranceProfile['planType'])}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['PPO', 'HMO', 'EPO', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Deductible ($)</Label><Input type="number" value={deductible || ''} onChange={e => setDeductible(Number(e.target.value))} className="mt-1" /></div>
              <div><Label>OOP max ($)</Label><Input type="number" value={oopMax || ''} onChange={e => setOopMax(Number(e.target.value))} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Copay ($)</Label><Input type="number" value={copay || ''} onChange={e => setCopay(Number(e.target.value))} className="mt-1" /></div>
              <div><Label>Coinsurance (%)</Label><Input type="number" value={coinsurance || ''} onChange={e => setCoinsurance(Number(e.target.value))} className="mt-1" /></div>
            </div>
          </div>
        </section>

        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary-hover h-11" onClick={save}>
          Save changes
        </Button>
      </div>
      <Footer />
    </div>
  );
};

export default Settings;
