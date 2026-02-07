import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import DomainLookup from '@/components/DomainLookup';
import QueryHistory from '@/components/QueryHistory';
import Favorites from '@/components/Favorites';
import { useAuth } from '@/hooks/useAuth';
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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Update selected domain when prop changes
  useEffect(() => {
    if (propDomain) {
      setSelectedDomain(propDomain);
    }
  }, [propDomain]);

  const handleSelectDomain = (domain: string) => {
    setSelectedDomain(domain);
    // Update URL when selecting a domain
    navigate(`/${domain}`);
  };

  const handleFavoriteAdded = () => {
    setFavoriteRefresh(prev => prev + 1);
  };

  // Callback when domain is queried - update URL
  const handleDomainQueried = (domain: string) => {
    if (domain && location.pathname !== `/${domain}`) {
      navigate(`/${domain}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-6xl mx-auto px-4 py-8 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">RDAP 域名查询</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              输入域名或 IDN。我们将验证、规范化整理信息显示。如果 RDAP 不可用，将回退到 WHOIS。
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Languages className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            {loading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
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
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth">登录</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className={`grid grid-cols-1 ${user ? 'lg:grid-cols-3' : ''} gap-6`}>
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
            <div className="space-y-6">
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
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <p className="text-xs text-muted-foreground text-center">
            © 2026 RDAP Domain Lookup. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
