import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Search, Shield, MapPin, Heart } from 'lucide-react';

const steps = [
  { icon: Shield, title: 'Add your coverage', desc: 'Enter your insurance details so we can personalize estimates.' },
  { icon: Search, title: 'Tell us what you need', desc: 'Pick a specialty or visit type to narrow your search.' },
  { icon: MapPin, title: 'Compare on the map', desc: 'See providers near you with estimated costs before you book.' },
];

const Index = () => (
  <div className="min-h-screen flex flex-col">
    <Navbar />

    {/* Hero */}
    <section className="flex-1 flex items-center">
      <div className="container mx-auto px-4 py-12 sm:py-20 md:py-32 text-center max-w-3xl animate-fade-in">
        <div className="inline-flex items-center justify-center gap-2 bg-primary/10 text-foreground rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium mb-5 sm:mb-6 max-w-[min(100%,20rem)] mx-auto text-center leading-snug">
          <Heart className="w-4 h-4 shrink-0 fill-primary stroke-primary" />
          <span>Healthcare cost estimate calculator</span>
        </div>
        <h1 className="text-[1.75rem] leading-tight sm:text-4xl md:text-6xl font-bold mb-5 sm:mb-6">
          Care that doesn't
          <br />
          <span className="text-primary">surprise you</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed px-1">
          Find providers near you and see personalized cost estimates based on your coverage, before you walk in.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto sm:max-w-none">
          <Link to="/signup" className="w-full sm:w-auto touch-manipulation">
            <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary-hover px-8 min-h-12 h-12 text-base rounded-full">
              Get started free
            </Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto touch-manipulation">
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 min-h-12 h-12 text-base rounded-full">
              Log in
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="py-12 sm:py-20 bg-card border-t border-border">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-12 px-2">How it works</h2>
        <div className="grid md:grid-cols-3 gap-y-10 gap-x-6 md:gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className="text-center animate-slide-up" style={{ animationDelay: `${i * 120}ms` }}>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Step {i + 1}</p>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Index;
