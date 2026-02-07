import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import DomainLookup from '@/components/DomainLookup';
import QueryHistory from '@/components/QueryHistory';
import Favorites from '@/components/Favorites';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Sun, Moon, Languages, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IndexProps {
  initialDomain?: string;
}

const Index = ({ initialDomain: propDomain }: IndexProps) => {
  const [isDark, setIsDark] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(propDomain || '');
  const [favoriteRefresh, setFavoriteRefresh] = useState(0);
  const { user, loading, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    if (propDomain) {
      setSelectedDomain(propDomain);
    }
  }, [propDomain]);

  const handleSelectDomain = (domain: string) => {
    setSelectedDomain(domain);
    navigate(`/${domain}`);
  };

  const handleFavoriteAdded = () => {
    setFavoriteRefresh(prev => prev + 1);
  };

  const handleDomainQueried = (domain: string) => {
    if (domain && location.pathname !== `/${domain}`) {
      navigate(`/${domain}`, { replace: true });
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-6xl mx-auto px-4 py-6 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="space-y-1.5 flex-1 min-w-0 pr-4">
            <h1 className="text-xl font-bold">{t('app.title')}</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('app.description')}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={toggleLanguage}
            >
              <Languages className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            {loading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('app.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                <Link to="/auth">{t('app.login')}</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className={`grid grid-cols-1 ${user ? 'lg:grid-cols-3' : ''} gap-5`}>
          {/* Main Lookup Component */}
          <div className={user ? 'lg:col-span-2' : ''}>
            <DomainLookup 
              initialDomain={selectedDomain} 
              onFavoriteAdded={handleFavoriteAdded}
              onDomainQueried={handleDomainQueried}
            />
          </div>

          {/* Sidebar - Only show when logged in */}
          {user && (
            <div className="space-y-5">
              <QueryHistory onSelectDomain={handleSelectDomain} />
              <Favorites 
                onSelectDomain={handleSelectDomain} 
                refreshTrigger={favoriteRefresh}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
            <p>{t('footer.copyright')}</p>
            <div className="flex items-center gap-3">
              <a href="https://hello.sn" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {t('footer.about')}
              </a>
              <span className="hidden sm:inline">·</span>
              <a href="https://0451.me" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {t('footer.register')}
              </a>
              <span className="hidden sm:inline">·</span>
              <a href="https://l.ke" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {t('footer.shortlink')}
              </a>
              <span className="hidden sm:inline">·</span>
              <a href="https://f.af" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {t('footer.updates')}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
