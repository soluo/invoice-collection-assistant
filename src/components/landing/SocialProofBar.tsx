import { Hammer, Wrench, Zap, Building } from "lucide-react";

export function SocialProofBar() {
  return (
    <section className="border-y border-slate-200 bg-white py-10">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">
          Partenaires de confiance
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          {/* Mock Logos */}
          <div className="flex items-center gap-2 text-xl font-bold text-slate-700">
            <Hammer className="w-6 h-6" /> MaîtresBâtisseurs
          </div>
          <div className="flex items-center gap-2 text-xl font-bold text-slate-700">
            <Zap className="w-6 h-6" /> ElectriciensFrance
          </div>
          <div className="flex items-center gap-2 text-xl font-bold text-slate-700">
            <Wrench className="w-6 h-6" /> ArtisansPro
          </div>
          <div className="flex items-center gap-2 text-xl font-bold text-slate-700">
            <Building className="w-6 h-6" /> PlombiersFédération
          </div>
        </div>
      </div>
    </section>
  );
}
