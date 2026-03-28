import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import CareCostLogo from '@/components/CareCostLogo';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center">
          <CareCostLogo showTagline={!isAuthenticated} compact={isAuthenticated} />
        </Link>

        <div className="flex items-center gap-3">
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
      </div>
    </nav>
  );
};

export default Navbar;
