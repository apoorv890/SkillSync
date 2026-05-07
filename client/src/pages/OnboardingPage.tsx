import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { OnboardingForm } from '../components/OnboardingForm';
import { ONBOARDING_STORAGE_KEY } from '../lib/googleAuthApi';
import { useAuth } from '../hooks/useAuth';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }
    const t = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!t) {
      navigate('/login', { replace: true });
      return;
    }
    setToken(t);
  }, [isAuthenticated, navigate]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="/login" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-md">
            <Briefcase className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">SkillSync</span>
        </a>
        <OnboardingForm tempToken={token} />
      </div>
    </div>
  );
};

export default OnboardingPage;
