export function AuthVisualPanel() {
  return (
    <div className="relative z-10 w-full max-w-sm">
      {/* Testimonial Card (floating animation) */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl animate-float">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            JD
          </div>
          <div>
            <div className="font-bold text-white text-sm">Julie Durand</div>
            <div className="text-xs text-slate-300">Durand Électricité</div>
          </div>
          <div className="ml-auto text-brand-400">
            ⭐⭐⭐⭐⭐
          </div>
        </div>

        <p className="text-slate-200 text-sm leading-relaxed mb-4">
          "RelanceZen m'a fait gagner 5 heures par semaine sur la paperasse.
          Les relances automatiques sont un vrai plus pour ma trésorerie."
        </p>

        {/* Stats */}
        <div className="flex gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Factures envoyées
            </div>
            <div className="text-lg font-bold text-white">142</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Recouvrées
            </div>
            <div className="text-lg font-bold text-brand-400">12k€+</div>
          </div>
        </div>
      </div>

      {/* Value Prop */}
      <div className="mt-12 text-center">
        <h3 className="text-2xl font-bold mb-2">Construisez Plus. Administrez Moins.</h3>
        <p className="text-slate-400 text-sm">
          Rejoignez plus de 10 000 artisans qui gèrent leur entreprise depuis leur poche.
        </p>

        {/* Partner Logos (grayscale/opacity) */}
        <div className="mt-8 flex justify-center gap-6 opacity-40">
          <span className="text-2xl">💳</span>
          <span className="text-2xl">🏦</span>
          <span className="text-2xl">🔒</span>
        </div>
      </div>
    </div>
  );
}
