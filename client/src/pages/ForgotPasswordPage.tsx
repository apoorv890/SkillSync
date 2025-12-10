import { Briefcase } from 'lucide-react';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

const ForgotPasswordPage = () => {
  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/login" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-md">
            <Briefcase className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">SkillSync</span>
        </a>
        <ForgotPasswordForm />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
