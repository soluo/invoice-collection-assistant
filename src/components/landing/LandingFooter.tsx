import { NavLink } from "react-router-dom";
import { Mail, Twitter, Facebook, Instagram } from "lucide-react";

export function LandingFooter() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-1">
            <NavLink to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-brand-600 rounded flex items-center justify-center text-white text-sm">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white">
                Relance<span className="text-brand-500">Zen</span>
              </span>
            </NavLink>
            <p className="text-sm leading-relaxed mb-4">
              Simplifier les relances de factures pour les professionnels et petites entreprises du monde entier.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Produit</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => scrollToSection("features")} className="hover:text-brand-500 transition-colors">
                  Fonctionnalités
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("pricing")} className="hover:text-brand-500 transition-colors">
                  Tarifs
                </button>
              </li>
              <li>
                <a href="#" className="hover:text-brand-500 transition-colors">
                  Intégrations
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-500 transition-colors">
                  Nouveautés
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Ressources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-brand-500 transition-colors">
                  Centre d'aide
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-500 transition-colors">
                  Modèles de factures
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-500 transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-500 transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-brand-500 transition-colors">
                  Confidentialité
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-500 transition-colors">
                  Conditions d'utilisation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-500 transition-colors">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div>&copy; 2025 RelanceZen SAS. Tous droits réservés.</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Systèmes opérationnels
          </div>
        </div>
      </div>
    </footer>
  );
}
