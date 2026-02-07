import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import DomainSearch from './DomainSearch';
import DomainResultCard, { WhoisData } from './DomainResultCard';
import { Button } from '@/components/ui/button';

interface DomainLookupProps {
  initialDomain?: string;
  onFavoriteAdded?: () => void;
}

const DomainLookup = ({ initialDomain, onFavoriteAdded }: DomainLookupProps) => {
  const [domain, setDomain] = useState(initialDomain || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisData | null>(null);
  const [error, setError] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (initialDomain && initialDomain !== domain) {
      setDomain(initialDomain);
      // Auto-search when domain is selected from history/favorites
      handleLookupWithDomain(initialDomain);
    }
  }, [initialDomain]);

  const validateDomain = (input: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(input.trim());
  };

  const checkIsFavorite = async (domainName: string) => {
    if (!user) return;
    
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('domain_name', domainName.toLowerCase())
      .single();
    
    setIsFavorite(!!data);
  };

  const saveToHistory = async (domainName: string, whoisData: WhoisData) => {
    if (!user) return;

    await supabase.from('domain_history').insert({
      user_id: user.id,
      domain_name: domainName.toLowerCase(),
      registrar: whoisData.registrar,
      expiration_date: whoisData.expirationDate,
      source: whoisData.source,
    });
  };

  const handleLookupWithDomain = async (domainToLookup: string) => {
    setError('');
    setResult(null);
    setIsFavorite(false);

    if (!domainToLookup.trim()) {
      setError('请输入要查询的域名');
      return;
    }

    if (!validateDomain(domainToLookup.trim())) {
      setError('域名格式无效，请输入正确的域名格式（如 example.com）');
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('domain-lookup', {
        body: { domain: domainToLookup.trim().toLowerCase() }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        setError('查询服务暂时不可用，请稍后重试');
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.primary) {
        const whoisData: WhoisData = {
          domain: data.primary.domain,
          registrar: data.primary.registrar || 'N/A',
          registrationDate: data.primary.registrationDate || 'N/A',
          expirationDate: data.primary.expirationDate || 'N/A',
          lastUpdated: data.primary.lastUpdated || 'N/A',
          nameServers: data.primary.nameServers || [],
          status: data.primary.status || [],
          registrant: data.primary.registrant,
          dnssec: data.primary.dnssec || false,
          source: data.primary.source === 'rdap' ? 'rdap' : 'whois',
        };
        setResult(whoisData);
        
        // Save to history and check favorite status
        await saveToHistory(domainToLookup.trim(), whoisData);
        await checkIsFavorite(domainToLookup.trim());
      } else {
        setError('未找到该域名的信息');
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setError('查询失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    await handleLookupWithDomain(domain);
  };

  const toggleFavorite = async () => {
    if (!user || !result) {
      toast({ description: '请先登录', variant: 'destructive' });
      return;
    }

    setFavoriteLoading(true);

    try {
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('domain_name', result.domain.toLowerCase());
        
        setIsFavorite(false);
        toast({ description: '已从收藏中移除' });
      } else {
        // Add to favorites
        await supabase.from('favorites').insert({
          user_id: user.id,
          domain_name: result.domain.toLowerCase(),
          registrar: result.registrar,
          expiration_date: result.expirationDate,
        });
        
        setIsFavorite(true);
        toast({ description: '已添加到收藏' });
        onFavoriteAdded?.();
      }
    } catch (err) {
      console.error('Favorite error:', err);
      toast({ description: '操作失败', variant: 'destructive' });
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <DomainSearch
        domain={domain}
        setDomain={setDomain}
        onSearch={handleLookup}
        loading={loading}
      />

      {error && (
        <div className="flex items-start gap-3 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {user && (
            <div className="flex justify-end">
              <Button
                variant={isFavorite ? "default" : "outline"}
                size="sm"
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className="gap-2"
              >
                <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? '已收藏' : '收藏'}
              </Button>
            </div>
          )}
          <DomainResultCard data={result} />
        </div>
      )}
    </div>
  );
};

export default DomainLookup;
