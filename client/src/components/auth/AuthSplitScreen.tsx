import { Briefcase, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { FieldGroup, FieldDescription } from '../ui/field';
import { GoogleSignInSection } from '../GoogleSignInSection';

interface AuthSplitScreenProps {
  mode: 'login' | 'register';
}

export function AuthSplitScreen({ mode }: AuthSplitScreenProps) {
  const isLogin = mode === 'login';

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative flex w-full flex-col justify-center overflow-hidden px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20 xl:px-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-16 h-80 w-80 rounded-full bg-primary/[0.05] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-40 top-64 h-72 w-72 rounded-full bg-primary/[0.04] blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-sm">
          <a href="/" className="mb-10 flex items-center gap-2 font-medium">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">VoiceHire</span>
          </a>

          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-powered hiring platform
          </div>

          <h1 className="font-serif text-4xl leading-[1.15] text-foreground sm:text-5xl">
            Hire smarter.
            <br />
            Get hired faster.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            AI-led interviews and resume scoring for candidates and recruiters — one
            sign-in for everyone.
          </p>

          <Card className="mt-10 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </CardTitle>
              <CardDescription>
                {isLogin
                  ? 'Sign in with your Google account'
                  : 'Sign up with your Google account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <GoogleSignInSection />
                <FieldDescription className="text-center">
                  {isLogin ? (
                    'New here? The same button above works for sign-up too.'
                  ) : (
                    <>
                      Already have an account?{' '}
                      <a
                        href="/login"
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Sign in
                      </a>
                    </>
                  )}
                </FieldDescription>
              </FieldGroup>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      <div className="relative hidden lg:block lg:w-1/2 lg:p-4">
        <div className="relative flex h-full w-full items-end overflow-hidden rounded-3xl bg-primary p-10 xl:p-14">
          <Briefcase
            className="pointer-events-none absolute -right-12 -top-12 h-72 w-72 text-primary-foreground/5"
            strokeWidth={1}
          />
          <div className="relative">
            <p className="font-serif text-3xl leading-snug text-primary-foreground xl:text-4xl">
              Great hiring starts
              <br />
              with a great conversation.
            </p>
            <p className="mt-4 text-sm text-primary-foreground/60">
              AI-led interviews, live scheduling, and resume scoring — all in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
