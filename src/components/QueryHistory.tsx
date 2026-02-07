import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Trash2, Search, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';

interface HistoryItem {
  id: string;
  domain_name: string;
  registrar: string | null;
  expiration_date: string | null;
  source: string | null;
  created_at: string;
}

interface QueryHistoryProps {
  onSelectDomain: (domain: string) => void;
}

const QueryHistory = ({ onSelectDomain }: QueryHistoryProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('domain_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setHistory(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('domain_history')
      .delete()
      .eq('id', id);

    if (!error) {
      setHistory(history.filter(item => item.id !== id));
    }
  };

  const getLocale = () => language === 'zh' ? zhCN : enUS;

  if (!user) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" />
            {t('history.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-3">
            {t('history.loginRequired')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4" />
          {t('history.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            {t('history.empty')}
          </p>
        ) : (
          <ScrollArea className="h-[250px]">
            <div className="space-y-1.5">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.domain_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { 
                        addSuffix: true, 
                        locale: getLocale()
                      })}
                    </p>
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
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default QueryHistory;
