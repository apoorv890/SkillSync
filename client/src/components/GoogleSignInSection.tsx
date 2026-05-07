import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { Field } from './ui/field';
import { ONBOARDING_STORAGE_KEY, postGoogleCredential } from '../lib/googleAuthApi';

export function GoogleSignInSection() {
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <Field>
        <p className="text-sm text-muted-foreground text-center">
          Set <code className="text-xs">VITE_GOOGLE_CLIENT_ID</code> in your root{' '}
          <code className="text-xs">.env</code> (same value as <code className="text-xs">GOOGLE_CLIENT_ID</code>),
          then restart Vite.
        </p>
      </Field>
    );
  }

  return (
    <Field>
      <div className="flex w-full justify-center [&>div]:!w-full">
        <GoogleLogin
          text="continue_with"
          theme="outline"
          shape="rectangular"
          size="large"
          width="384"
          onSuccess={async (cred) => {
            if (!cred.credential) {
              toast.error('Google did not return a credential');
              return;
            }
            try {
              const result = await postGoogleCredential(cred.credential);
              if (result.needsOnboarding) {
                sessionStorage.setItem(ONBOARDING_STORAGE_KEY, result.tempToken);
                toast.success('Complete your profile to finish sign-up');
                navigate('/onboarding', { replace: true });
                return;
              }
              localStorage.setItem('token', result.accessToken);
              localStorage.setItem('user', JSON.stringify(result.user));
              setUser(result.user);
              setIsAuthenticated(true);
              toast.success("Welcome! You're signed in.");
              navigate('/', { replace: true });
            } catch (err: unknown) {
              toast.error(err instanceof Error ? err.message : 'Sign-in failed');
            }
          }}
          onError={() => {
            toast.error('Google sign-in was cancelled or failed');
          }}
        />
      </div>
    </Field>
  );
}
