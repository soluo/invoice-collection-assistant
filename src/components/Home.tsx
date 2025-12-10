import { LandingHeader } from "./landing/LandingHeader";
import { HeroSection } from "./landing/HeroSection";
import { SocialProofBar } from "./landing/SocialProofBar";
import { FeaturesSection } from "./landing/FeaturesSection";
import { CTASection } from "./landing/CTASection";
import { TestimonialSection } from "./landing/TestimonialSection";
import { LandingFooter } from "./landing/LandingFooter";

interface HomeProps {
  isAuthenticated: boolean;
}

export function Home({ isAuthenticated }: HomeProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <LandingHeader />
      <main className="flex-grow pt-24 pb-12">
        <HeroSection />
        <SocialProofBar />
        <FeaturesSection />
        <CTASection />
        <TestimonialSection />
      </main>
      <LandingFooter />
    </div>
  );
}
