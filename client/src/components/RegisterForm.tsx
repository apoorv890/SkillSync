import type { ComponentProps } from 'react';
import { cn } from '../lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { FieldDescription, FieldGroup } from './ui/field';
import { GoogleSignInSection } from './GoogleSignInSection';

export function RegisterForm({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Sign up with your Google account</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <GoogleSignInSection />
            <FieldDescription className="text-center">
              Already have an account?{' '}
              <a href="/login" className="underline underline-offset-4 hover:text-primary">
                Sign in
              </a>
            </FieldDescription>
          </FieldGroup>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our{' '}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  );
}
