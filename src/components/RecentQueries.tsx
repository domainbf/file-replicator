import { useState, useEffect } from 'react';
import { Clock, Trash2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import DomainFavicon from './DomainFavicon';

interface RecentQuery {
  domain: string;
  timestamp: number;
  status: 'registered' | 'available' | 'unknown'; // 强化状态判定
}

interface RecentQueriesProps {
  onSelectDomain: (domain: string) => void;
  refreshTrigger?: number;
}

const STORAGE_KEY = 'recent_domain_queries';
const ITEMS_PER_PAGE = 6;

/** 智能保存记录 */
export const addRecentQuery = (domain: string, status: 'registered' | 'available' | 'unknown' = 'unknown') => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let queries: RecentQuery[] = stored ? JSON.parse(stored) : [];

    // 去重并置顶
    queries = queries.filter(q => q.domain.toLowerCase() !== domain.toLowerCase());
    queries.unshift({
      domain: domain.toLowerCase(),
      timestamp: Date.now(),
      status,
    });

    // 限制总量 50 条
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queries.slice(0, 50)));
    window.dispatchEvent(new Event('storage')); // 触发跨标签/组件同步
  } catch (e) {
    console.error('Save failed:', e);
  }
};

const RecentQueries = ({ onSelectDomain, refreshTrigger }: RecentQueriesProps) => {
  const [queries, setQueries] = useState<RecentQuery[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { language, t } = useLanguage();

  const loadQueries = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setQueries(stored ? JSON.parse(stored) : []);
    } catch (e) {
      setQueries([]);
    }
  };

  useEffect(() => {
    loadQueries();
    window.addEventListener('storage', loadQueries);
    return () => window.removeEventListener('storage', loadQueries);
  }, [refreshTrigger]);

  const handleDelete = (domain: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = queries.filter(q => q.domain !== domain);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setQueries(updated);
    // 如果当前页变空，自动回到上一页
    if (updated.length <= (currentPage - 1) * ITEMS_PER_PAGE && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleClearAll = () => {
    if (confirm(language === 'zh' ? '确定要清空所有记录吗？' : 'Clear all records?')) {
      localStorage.removeItem(STORAGE_KEY);
      setQueries([]);
      setCurrentPage(1);
    }
  };

  // 分页逻辑
  const totalPages = Math.ceil(queries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = queries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return language === 'zh' ? '刚刚' : 'Just now';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return language === 'zh' ? `${mins}m前` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return language === 'zh' ? `${hours}h前` : `${hours}h ago`;
  };

  if (!queries.length) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* 头部统计与操作 */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          <span>{language === 'zh' ? '最近查询' : 'Recent Queries'}</span>
          <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {queries.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
          onClick={handleClearAll}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          {language === 'zh' ? '清空' : 'Clear'}
        </Button>
      </div>

      {/* 记录网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {currentItems.map((query) => (
          <div
            key={query.domain}
            onClick={() => onSelectDomain(query.domain)}
            className="group relative flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
          >
            <DomainFavicon domain={query.domain} size="sm" />
            
            <div className="flex-1 min-w-0 pr-6">
              <div className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                {query.domain}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatTimeAgo(query.timestamp)}
              </div>
            </div>

            {/* 状态映射 */}
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant={query.status === 'available' ? 'default' : 'outline'}
                className={`
                  text-[9px] px-1.5 h-4 pointer-events-none capitalize
                  ${query.status === 'registered' ? 'border-amber-500/50 text-amber-600' : ''}
                  ${query.status === 'unknown' ? 'border-slate-300 text-slate-400' : ''}
                `}
              >
                {query.status === 'unknown' && <AlertCircle className="w-2 h-2 mr-1" />}
                {query.status === 'available' ? (language === 'zh' ? '未注册' : 'Available') : 
                 query.status === 'registered' ? (language === 'zh' ? '已注册' : 'Registered') :
                 (language === 'zh' ? '未知' : 'Unknown')}
              </Badge>
            </div>

            <button
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
              onClick={(e) => handleDelete(query.domain, e)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* 分页控制 */}
      {totalPages > 1 && (
        <Pagination className="justify-end pt-2">
          <PaginationContent>
            <PaginationItem>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="text-xs text-muted-foreground px-2">
                {currentPage} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default RecentQueries;
