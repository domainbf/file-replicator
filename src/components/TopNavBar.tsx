import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Globe, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

interface TopNavBarProps {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  onLogoClick?: () => void;
}

const TopNavBar = ({ isDark, setIsDark, onLogoClick }: TopNavBarProps) => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    }
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center py-4">
      {/* Pill-shaped navigation bar */}
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-dashed border-muted-foreground/30 bg-background/80 backdrop-blur-sm">
        {/* Logo/Title - clickable to clear query */}
        <button 
          onClick={handleLogoClick}
          className="flex items-center gap-2 pr-3 border-r border-muted-foreground/20 hover:opacity-80 transition-opacity"
        >
          <span className="font-semibold text-sm tracking-wide">RDAP WHOIS</span>
          <span className="text-xs text-muted-foreground">1.0</span>
        </button>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted"
            onClick={() => setIsDark(!isDark)}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Language toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted"
            onClick={toggleLanguage}
            title={language === 'zh' ? 'English' : '中文'}
          >
            <Globe className="h-4 w-4" />
          </Button>

          {/* User/Login */}
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
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
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" asChild>
              <Link to="/auth" title={t('app.login')}>
                <User className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopNavBar;
