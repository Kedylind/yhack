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
      <div className="container mx-auto px-4 py-20 md:py-32 text-center max-w-3xl animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-foreground rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Heart className="w-4 h-4 fill-primary stroke-primary" />
          Healthcare cost estimate calculator
        </div>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
          Care that doesn't
          <br />
          <span className="text-primary">surprise you</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
          Find providers near you and see personalized cost estimates based on your coverage, before you walk in.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signup">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover px-8 h-12 text-base rounded-full">
              Get started free
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="px-8 h-12 text-base rounded-full">
              Log in
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="py-20 bg-card border-t border-border">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
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
