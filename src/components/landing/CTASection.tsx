import { NavLink } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 bg-slate-900 text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0gMSAxIEwgMSA1IEwgNSA1IEwgNSAxIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3N2Zz4=')]"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Ne laissez plus les factures impayées grignoter vos profits.
            </h2>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-lg text-slate-300">
                <CheckCircle2 className="w-6 h-6 text-brand-500" />
                <span>Payé 2× plus rapidement en moyenne</span>
              </li>
              <li className="flex items-center gap-3 text-lg text-slate-300">
                <CheckCircle2 className="w-6 h-6 text-brand-500" />
                <span>Factures professionnelles qui font bonne impression</span>
              </li>
              <li className="flex items-center gap-3 text-lg text-slate-300">
                <CheckCircle2 className="w-6 h-6 text-brand-500" />
                <span>Aucun frais d'installation, annulation à tout moment</span>
              </li>
            </ul>
            <div className="pt-4">
              <NavLink
                to="/signup"
                className="inline-block bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-glow transition-all"
              >
                Créer un compte gratuit
              </NavLink>
            </div>
          </div>

          {/* Decorative Graphic */}
          <div className="md:w-5/12 relative">
            <div className="absolute inset-0 bg-brand-500 rounded-full blur-[100px] opacity-20"></div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-2xl relative rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
                <div className="font-bold text-lg">Facture #3092</div>
                <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded text-sm font-bold">PAYÉE</div>
              </div>
              <div className="space-y-3 opacity-75">
                <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                <div className="h-4 bg-slate-600 rounded w-1/2"></div>
                <div className="h-4 bg-slate-600 rounded w-full"></div>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-slate-400">Montant reçu</div>
                <div className="text-2xl font-bold text-white">1 450,00 €</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
