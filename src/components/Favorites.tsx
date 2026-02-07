import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Star, Trash2, Search, Loader2, AlertTriangle, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FavoriteItem {
  id: string;
  domain_name: string;
  registrar: string | null;
  expiration_date: string | null;
  created_at: string;
}

interface FavoritesProps {
  onSelectDomain: (domain: string) => void;
  refreshTrigger?: number;
}

function parseExpirationDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  const chineseMatch = dateStr.match(/(\d{4})年(\d{2})月(\d{2})日/);
  if (chineseMatch) {
    const [, year, month, day] = chineseMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

function getRemainingDays(dateStr: string | null): number | null {
  const expDate = parseExpirationDate(dateStr);
  if (!expDate) return null;
  
  const now = new Date();
  const diffTime = expDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getExpirationBadge(remainingDays: number | null, t: (key: string) => string): { variant: 'destructive' | 'secondary' | 'default'; text: string; className?: string } | null {
  if (remainingDays === null) return null;
  
  if (remainingDays <= 0) {
    return { variant: 'destructive', text: t('expiration.expired') };
  }
  if (remainingDays <= 30) {
    return { variant: 'destructive', text: `${remainingDays}d` };
  }
  if (remainingDays <= 90) {
    return { variant: 'secondary', text: `${remainingDays}d`, className: 'bg-warning/20 text-warning border-warning/30' };
  }
  if (remainingDays <= 180) {
    return { variant: 'secondary', text: `${remainingDays}d` };
  }
  
  return null;
}

const Favorites = ({ onSelectDomain, refreshTrigger }: FavoritesProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiringCount, setExpiringCount] = useState(0);
  const { toast } = useToast();

  const fetchFavorites = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFavorites(data);
      
      const expiring = data.filter(item => {
        const days = getRemainingDays(item.expiration_date);
        return days !== null && days <= 90;
      });
      setExpiringCount(expiring.length);
      
      if (expiring.length > 0) {
        const critical = expiring.filter(item => {
          const days = getRemainingDays(item.expiration_date);
          return days !== null && days <= 30;
        });
        
        if (critical.length > 0) {
          toast({
            title: t('expiration.alert'),
            description: t('expiration.alertMessage').replace('{count}', String(critical.length)),
            variant: 'destructive',
          });
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFavorites();
  }, [user, refreshTrigger]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', id);

    if (!error) {
      setFavorites(favorites.filter(item => item.id !== id));
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4" />
            {t('favorites.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-3">
            {t('favorites.loginRequired')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            {t('favorites.title')}
          </div>
          {expiringCount > 0 && (
            <Badge variant="destructive" className="gap-1 text-xs h-5">
              <Bell className="h-3 w-3" />
              {expiringCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : favorites.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            {t('favorites.empty')}
          </p>
        ) : (
          <ScrollArea className="h-[250px]">
            <div className="space-y-1.5">
              {favorites.map((item) => {
                const remainingDays = getRemainingDays(item.expiration_date);
                const expirationBadge = getExpirationBadge(remainingDays, t);
                const isExpiring = remainingDays !== null && remainingDays <= 90;
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
                      isExpiring ? 'border-destructive/50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">{item.domain_name}</p>
                        {remainingDays !== null && remainingDays <= 30 && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.expiration_date && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.expiration_date}
                          </p>
                        )}
                        {expirationBadge && (
                          <Badge 
                            variant={expirationBadge.variant}
                            className={`text-[10px] px-1 py-0 h-4 ${expirationBadge.className || ''}`}
                          >
                            {expirationBadge.text}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onSelectDomain(item.domain_name)}
                      >
                        <Search className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default Favorites;
