import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

interface AuthLayoutProps {
  children: React.ReactNode;
  showSignupLink: boolean; // true = page login (montrer lien signup), false = page signup (montrer lien login)
}

export function AuthLayout({ children, showSignupLink }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <LandingHeader authMode={showSignupLink ? 'signin' : 'signup'} />

      <main className="flex-grow flex items-center justify-center py-20 px-4 relative overflow-hidden">
        {/* Gradients décoratifs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-30 pointer-events-none" />

        {/* Container du formulaire */}
        <div className="relative z-10 w-full max-w-md">
          {children}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
