import { NavLink } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import { InteractiveDemo } from "./InteractiveDemo";

export function HeroSection() {
  const scrollToDemo = () => {
    const uploadArea = document.getElementById("upload-area");
    uploadArea?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-white opacity-80 bg-[linear-gradient(#f1f5f9_1.2px,transparent_1.2px),linear-gradient(90deg,#f1f5f9_1.2px,transparent_1.2px)] [background-size:30px_30px]"></div>
      </div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-200 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-30"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 min-h-[80vh] py-12">
          {/* Left: Copy */}
          <div className="lg:w-1/2 text-center lg:text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-sm font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
              Utilisé par 10 000+ entreprises
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
              Soyez payé pour votre travail.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-600">
                Automatiquement.
              </span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              L'outil simple pour artisans, PME et indépendants. Importez une facture en secondes, programmez des
              relances automatiques et arrêtez de courir après vos paiements.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <NavLink
                to="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-1 hover:shadow-brand-500/50 flex items-center justify-center gap-2"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </NavLink>
              <button
                onClick={scrollToDemo}
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-lg font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 text-brand-500 fill-brand-500" />
                Voir la démo
              </button>
            </div>

            <div className="pt-6 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                <img
                  src="https://randomuser.me/api/portraits/men/32.jpg"
                  className="w-8 h-8 rounded-full border-2 border-white"
                  alt="User"
                />
                <img
                  src="https://randomuser.me/api/portraits/women/44.jpg"
                  className="w-8 h-8 rounded-full border-2 border-white"
                  alt="User"
                />
                <img
                  src="https://randomuser.me/api/portraits/men/85.jpg"
                  className="w-8 h-8 rounded-full border-2 border-white"
                  alt="User"
                />
              </div>
              <p>
                Rejoignez <strong className="text-slate-900">2 400+</strong> professionnels ce mois-ci.
              </p>
            </div>
          </div>

          {/* Right: Interactive Demo */}
          <div className="lg:w-1/2 w-full perspective-1000 relative">
            {/* Decorative background card */}
            <div className="absolute -z-10 top-10 -right-4 w-full h-full bg-slate-200 rounded-2xl transform rotate-2 opacity-50"></div>

            <InteractiveDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
