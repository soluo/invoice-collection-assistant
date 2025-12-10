import { FileText, Bell, TrendingUp } from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32 bg-slate-50 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Conçu pour les professionnels, pas pour les comptables
          </h2>
          <p className="text-lg text-slate-600">
            Vous n'avez pas créé votre entreprise pour gérer de la paperasse. RelanceZen s'occupe du travail
            administratif pour que vous puissiez vous concentrer sur votre métier.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-2xl shadow-card border border-slate-100 hover:border-brand-200 transition-colors group">
            <div className="w-14 h-14 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Import facile en un clic</h3>
            <p className="text-slate-600 leading-relaxed">
              Prenez une photo de votre facture ou importez un PDF en 30 secondes depuis votre téléphone.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-2xl shadow-card border border-slate-100 hover:border-brand-200 transition-colors group">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Relances automatiques</h3>
            <p className="text-slate-600 leading-relaxed">
              Les conversations d'argent gênantes ? Laissez-nous gérer. Nous envoyons des rappels polis par email et
              SMS jusqu'à ce que vous soyez payé.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-2xl shadow-card border border-slate-100 hover:border-brand-200 transition-colors group">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Suivi de trésorerie</h3>
            <p className="text-slate-600 leading-relaxed">
              Sachez exactement qui vous doit quoi. Visualisez les factures payées, en attente et en retard dans une
              seule liste simple.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
