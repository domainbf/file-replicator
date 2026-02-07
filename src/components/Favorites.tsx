import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

// Parse date string to Date object
function parseExpirationDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  // Try parsing Chinese format: 2026年05月01日
  const chineseMatch = dateStr.match(/(\d{4})年(\d{2})月(\d{2})日/);
  if (chineseMatch) {
    const [, year, month, day] = chineseMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try parsing standard formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

// Calculate remaining days
function getRemainingDays(dateStr: string | null): number | null {
  const expDate = parseExpirationDate(dateStr);
  if (!expDate) return null;
  
  const now = new Date();
  const diffTime = expDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get expiration badge color and text
function getExpirationBadge(remainingDays: number | null): { variant: 'destructive' | 'secondary' | 'default'; text: string; className?: string } | null {
  if (remainingDays === null) return null;
  
  if (remainingDays <= 0) {
    return { variant: 'destructive', text: '已过期' };
  }
  if (remainingDays <= 30) {
    return { variant: 'destructive', text: `剩余${remainingDays}天` };
  }
  if (remainingDays <= 90) {
    return { variant: 'secondary', text: `剩余${remainingDays}天`, className: 'bg-warning/20 text-warning border-warning/30' };
  }
  if (remainingDays <= 180) {
    return { variant: 'secondary', text: `剩余${remainingDays}天` };
  }
  
  return null; // Don't show badge for domains with more than 180 days
}

const Favorites = ({ onSelectDomain, refreshTrigger }: FavoritesProps) => {
  const { user } = useAuth();
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
      
      // Count expiring domains (within 90 days)
      const expiring = data.filter(item => {
        const days = getRemainingDays(item.expiration_date);
        return days !== null && days <= 90;
      });
      setExpiringCount(expiring.length);
      
      // Show notification for domains expiring soon
      if (expiring.length > 0) {
        const critical = expiring.filter(item => {
          const days = getRemainingDays(item.expiration_date);
          return days !== null && days <= 30;
        });
        
        if (critical.length > 0) {
          toast({
            title: '域名到期提醒',
            description: `您有 ${critical.length} 个域名将在30天内到期，请及时续费！`,
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4" />
            收藏夹
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            登录后可查看收藏
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            收藏夹
          </div>
          {expiringCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Bell className="h-3 w-3" />
              {expiringCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            暂无收藏
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {favorites.map((item) => {
                const remainingDays = getRemainingDays(item.expiration_date);
                const expirationBadge = getExpirationBadge(remainingDays);
                const isExpiring = remainingDays !== null && remainingDays <= 90;
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
                      isExpiring ? 'border-destructive/50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{item.domain_name}</p>
                        {remainingDays !== null && remainingDays <= 30 && (
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {item.expiration_date && (
                          <p className="text-xs text-muted-foreground">
                            到期: {item.expiration_date}
                          </p>
                        )}
                        {expirationBadge && (
                          <Badge 
                            variant={expirationBadge.variant}
                            className={`text-[10px] px-1.5 py-0 ${expirationBadge.className || ''}`}
                          >
                            {expirationBadge.text}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onSelectDomain(item.domain_name)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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
