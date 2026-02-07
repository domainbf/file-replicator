import { useState, useEffect } from 'react';
import { Globe, Clock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface RecentQuery {
  domain: string;
  timestamp: number;
}

interface RecentQueriesProps {
  onSelectDomain: (domain: string) => void;
  refreshTrigger?: number;
}

const MAX_RECENT_QUERIES = 10;
const STORAGE_KEY = 'recent_domain_queries';

// Helper to add a query to recent history
export const addRecentQuery = (domain: string) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let queries: RecentQuery[] = stored ? JSON.parse(stored) : [];
    
    // Remove existing entry for same domain
    queries = queries.filter(q => q.domain.toLowerCase() !== domain.toLowerCase());
    
    // Add to front
    queries.unshift({
      domain: domain.toLowerCase(),
      timestamp: Date.now(),
    });
    
    // Limit size
    queries = queries.slice(0, MAX_RECENT_QUERIES);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
    
    // Dispatch event for listeners
    window.dispatchEvent(new CustomEvent('recent-queries-updated'));
  } catch (e) {
    console.error('Failed to save recent query:', e);
  }
};

const RecentQueries = ({ onSelectDomain, refreshTrigger }: RecentQueriesProps) => {
  const [queries, setQueries] = useState<RecentQuery[]>([]);
  const { language } = useLanguage();

  const loadQueries = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setQueries(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent queries:', e);
    }
  };

  useEffect(() => {
    loadQueries();
    
    // Listen for updates
    const handleUpdate = () => loadQueries();
    window.addEventListener('recent-queries-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('recent-queries-updated', handleUpdate);
    };
  }, [refreshTrigger]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (queries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{language === 'zh' ? '最近查询' : 'Recent Queries'}</span>
      </div>
      
      <div className="space-y-2">
        {queries.slice(0, 5).map((query, index) => (
          <button
            key={`${query.domain}-${index}`}
            onClick={() => onSelectDomain(query.domain)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left group"
          >
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">
                  {query.domain}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border text-muted-foreground shrink-0">
                  DOMAIN
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <span>{formatTime(query.timestamp)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {queries.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          {language === 'zh' ? `还有 ${queries.length - 5} 条记录` : `${queries.length - 5} more`}
        </p>
      )}
    </div>
  );
};

export default RecentQueries;
