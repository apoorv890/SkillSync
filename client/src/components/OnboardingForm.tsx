import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { postOnboarding } from '../lib/googleAuthApi';
import { ONBOARDING_STORAGE_KEY } from '../lib/googleAuthApi';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from './ui/field';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

function splitList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function OnboardingForm({ tempToken }: { tempToken: string }) {
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser } = useAuth();
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [profession, setProfession] = useState('');
  const [interests, setInterests] = useState('');
  const [targetRoles, setTargetRoles] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hiringFor, setHiringFor] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const profile =
        role === 'user'
          ? {
              profession: profession.trim(),
              interests: splitList(interests),
              targetRoles: splitList(targetRoles),
            }
          : {
              companyName: companyName.trim(),
              hiringFor: hiringFor.trim(),
              companySize: companySize.trim(),
            };

      if (role === 'user' && !profile.profession) {
        toast.error('Please enter your profession');
        setSubmitting(false);
        return;
      }
      if (role === 'admin' && !profile.companyName) {
        toast.error('Please enter your company name');
        setSubmitting(false);
        return;
      }

      const { accessToken, user } = await postOnboarding(tempToken, role, profile);
      sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);
      toast.success('Profile saved. Welcome to VoiceHire!');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Tell us about you</CardTitle>
        <CardDescription>
          Choose how you use VoiceHire. You can tighten this with invite codes later for production.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel>I am a</FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant={role === 'user' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setRole('user')}
                >
                  Candidate
                </Button>
                <Button
                  type="button"
                  variant={role === 'admin' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setRole('admin')}
                >
                  Recruiter / admin
                </Button>
              </div>
            </Field>

            {role === 'user' ? (
              <>
                <Field>
                  <FieldLabel htmlFor="profession">Profession</FieldLabel>
                  <Input
                    id="profession"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="e.g. Software engineer"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="interests">Interests (comma-separated)</FieldLabel>
                  <Textarea
                    id="interests"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="e.g. Backend systems, developer experience, climate tech"
                    rows={3}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="targetRoles">Jobs you are looking for (comma-separated)</FieldLabel>
                  <Textarea
                    id="targetRoles"
                    value={targetRoles}
                    onChange={(e) => setTargetRoles(e.target.value)}
                    placeholder="e.g. Senior backend, Staff engineer, Tech lead"
                    rows={3}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="companyName">Company name</FieldLabel>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your organization"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="hiringFor">Hiring for (teams or roles)</FieldLabel>
                  <Textarea
                    id="hiringFor"
                    value={hiringFor}
                    onChange={(e) => setHiringFor(e.target.value)}
                    placeholder="e.g. Engineering, IT, product design"
                    rows={2}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="companySize">Company size</FieldLabel>
                  <Input
                    id="companySize"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    placeholder="e.g. 10–50 people"
                  />
                </Field>
              </>
            )}
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Saving…' : 'Continue'}
          </Button>
          <FieldDescription className="text-center text-xs">
            Admin access here is self-selected for this private build only.
          </FieldDescription>
        </form>
      </CardContent>
    </Card>
  );
}
