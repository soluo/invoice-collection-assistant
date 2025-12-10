import { NavLink } from "react-router-dom";
import { Mail } from "lucide-react";

interface SimpleAuthLayoutProps {
  children: React.ReactNode;
}

export function SimpleAuthLayout({ children }: SimpleAuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header simplifié */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md shadow-sm py-4">
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              Relance<span className="text-brand-500">Zen</span>
            </span>
          </NavLink>

          <div className="hidden md:flex items-center gap-6">
            <span className="text-sm text-slate-500">Pas encore de compte ?</span>
            <NavLink to="/signup" className="text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors">
              Créer un compte
            </NavLink>
          </div>

          {/* Mobile: menu bouton si besoin */}
          <NavLink to="/signup" className="md:hidden text-sm font-bold text-slate-900 hover:text-brand-600">
            S'inscrire
          </NavLink>
        </div>
      </header>

      {/* Main: Formulaire centré */}
      <main className="flex-grow flex items-center justify-center relative w-full pt-20 pb-12 md:px-4 bg-slate-50 overflow-hidden">
        {/* Background grid pattern + gradients */}
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-white opacity-80 bg-[linear-gradient(#f1f5f9_1.2px,transparent_1.2px),linear-gradient(90deg,#f1f5f9_1.2px,transparent_1.2px)] [background-size:30px_30px] pointer-events-none"></div>
        </div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-brand-200 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-20 pointer-events-none" />

        {/* Container formulaire centré */}
        <div className="w-full max-w-md md:bg-white md:rounded-3xl md:shadow-2xl p-6 sm:p-8 md:p-12 relative z-10 md:border md:border-slate-100">
          {children}
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">Relance<span className="text-brand-500">Zen</span></span>
            <span className="mx-2 text-slate-600">|</span>
            <span>© 2025</span>
          </div>
          <div className="flex gap-6 text-xs">
            <a href="#" className="hover:text-brand-500 transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-brand-500 transition-colors">CGU</a>
            <a href="#" className="hover:text-brand-500 transition-colors">Aide</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
