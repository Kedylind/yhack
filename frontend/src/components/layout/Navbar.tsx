import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import CareCostLogo from '@/components/CareCostLogo';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compactLogo, setCompactLogo] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setCompactLogo(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const navLinkClass = 'text-foreground justify-start font-medium';
  const sheetBtnClass = 'w-full h-12 justify-start text-base';

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border',
        'pt-[max(0px,env(safe-area-inset-top))]',
      )}
    >
      <div className="container mx-auto flex items-center justify-between gap-2 min-h-14 md:h-16 py-2 md:py-0 px-4">
        <Link to="/" className="flex items-center min-w-0 pr-2" onClick={closeMobile}>
          <CareCostLogo
            showTagline={!isAuthenticated && !compactLogo}
            compact={isAuthenticated || compactLogo}
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <Link to="/why-it-matters">
            <Button variant="ghost" size="sm">Why it matters</Button>
          </Link>
          <Link to="/team">
            <Button variant="ghost" size="sm">Team</Button>
          </Link>
          <Link to="/our-data">
            <Button variant="ghost" size="sm">Our Data</Button>
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/map">
                <Button variant="ghost" size="sm">Map</Button>
              </Link>
              <Link to="/saved">
                <Button variant="ghost" size="sm">Saved</Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="sm">My Profile</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/'); }}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <div className="flex md:hidden items-center shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 touch-manipulation"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,20rem)] flex flex-col">
              <SheetHeader className="text-left border-b border-border pb-4 mb-2">
                <SheetTitle className="text-base">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 py-2 overflow-y-auto flex-1">
                <Link to="/why-it-matters" onClick={closeMobile}>
                  <Button variant="ghost" className={cn(sheetBtnClass, navLinkClass)}>Why it matters</Button>
                </Link>
                <Link to="/team" onClick={closeMobile}>
                  <Button variant="ghost" className={cn(sheetBtnClass, navLinkClass)}>Team</Button>
                </Link>
                <Link to="/our-data" onClick={closeMobile}>
                  <Button variant="ghost" className={cn(sheetBtnClass, navLinkClass)}>Our Data</Button>
                </Link>
                {isAuthenticated ? (
                  <>
                    <Link to="/map" onClick={closeMobile}>
                      <Button variant="ghost" className={cn(sheetBtnClass, navLinkClass)}>Map</Button>
                    </Link>
                    <Link to="/saved" onClick={closeMobile}>
                      <Button variant="ghost" className={cn(sheetBtnClass, navLinkClass)}>Saved</Button>
                    </Link>
                    <Link to="/settings" onClick={closeMobile}>
                      <Button variant="ghost" className={cn(sheetBtnClass, navLinkClass)}>My Profile</Button>
                    </Link>
                    <Button
                      variant="outline"
                      className={cn(sheetBtnClass, 'mt-2')}
                      onClick={() => {
                        closeMobile();
                        logout();
                        navigate('/');
                      }}
                    >
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={closeMobile}>
                      <Button variant="ghost" className={cn(sheetBtnClass, navLinkClass)}>Log in</Button>
                    </Link>
                    <Link to="/signup" onClick={closeMobile}>
                      <Button className={cn(sheetBtnClass, 'mt-1 bg-primary text-primary-foreground hover:bg-primary-hover')}>
                        Get started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
