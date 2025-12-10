import { Quote } from "lucide-react";

export function TestimonialSection() {
  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 text-brand-500 text-3xl">
            <Quote className="w-12 h-12 mx-auto" />
          </div>
          <blockquote className="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed mb-8">
            "Je passais mes dimanches soirs à envoyer des emails aux clients qui avaient oublié de payer. RelanceZen
            le fait automatiquement maintenant. J'ai retrouvé mes week-ends."
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <img
              src="https://randomuser.me/api/portraits/women/46.jpg"
              className="w-14 h-14 rounded-full border-4 border-slate-100 shadow-sm"
              alt="Sophie Martin"
            />
            <div className="text-left">
              <div className="font-bold text-slate-900">Sophie Martin</div>
              <div className="text-sm text-slate-500">Martin Électricité</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
