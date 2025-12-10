import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Mail } from "lucide-react";

interface LandingHeaderProps {
  authMode?: 'signin' | 'signup' | null;
}

export function LandingHeader({ authMode = null }: LandingHeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md py-3 border-slate-200"
          : "bg-transparent py-5 border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-105 transition-transform">
            <Mail className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Relance<span className="text-brand-500">Zen</span>
          </span>
        </NavLink>

        {/* Desktop Nav - cacher si authMode */}
        {!authMode && (
          <nav className="hidden md:flex items-center gap-8 font-medium text-slate-600">
            <button
              onClick={() => scrollToSection("features")}
              className="hover:text-brand-600 transition-colors"
            >
              Fonctionnalités
            </button>
            <button
              onClick={() => scrollToSection("testimonials")}
              className="hover:text-brand-600 transition-colors"
            >
              Témoignages
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="hover:text-brand-600 transition-colors"
            >
              Tarifs
            </button>
          </nav>
        )}

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {authMode === 'signup' ? (
            <NavLink
              to="/login"
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Se connecter
            </NavLink>
          ) : authMode === 'signin' ? (
            <NavLink
              to="/signup"
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 transform hover:-translate-y-0.5"
            >
              Créer un compte
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/login"
                className="font-medium text-slate-600 hover:text-slate-900"
              >
                Se connecter
              </NavLink>
              <NavLink
                to="/signup"
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 transform hover:-translate-y-0.5"
              >
                Commencer
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-2xl text-slate-700 focus:outline-none"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-xl p-4 flex flex-col gap-4">
          {!authMode && (
            <>
              <button
                onClick={() => scrollToSection("features")}
                className="text-lg font-medium text-slate-700 py-2 text-left"
              >
                Fonctionnalités
              </button>
              <button
                onClick={() => scrollToSection("testimonials")}
                className="text-lg font-medium text-slate-700 py-2 text-left"
              >
                Témoignages
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-lg font-medium text-slate-700 py-2 text-left"
              >
                Tarifs
              </button>
            </>
          )}
          {authMode === 'signup' ? (
            <NavLink
              to="/login"
              className="text-lg font-medium text-slate-700 py-2"
            >
              Se connecter
            </NavLink>
          ) : authMode === 'signin' ? (
            <NavLink
              to="/signup"
              className="bg-brand-500 text-white text-center py-3 rounded-lg font-bold"
            >
              Créer un compte
            </NavLink>
          ) : (
            <>
              <NavLink
                to="/login"
                className="text-lg font-medium text-slate-700 py-2"
              >
                Se connecter
              </NavLink>
              <NavLink
                to="/signup"
                className="bg-brand-500 text-white text-center py-3 rounded-lg font-bold"
              >
                Commencer gratuitement
              </NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}
