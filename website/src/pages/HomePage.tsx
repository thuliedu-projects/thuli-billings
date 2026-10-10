import { Features } from '../components/Features';
import { Footer } from '../components/Footer';
import { Hero } from '../components/Hero';
import { Pricing } from '../components/Pricing';

export function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </>
  );
}
