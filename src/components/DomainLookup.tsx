import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Star, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import DomainSearch from './DomainSearch';
import DomainResultCard, { WhoisData, PricingData } from './DomainResultCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { addRecentQuery } from './RecentQueries';

interface DomainLookupProps {
  initialDomain?: string;
  onFavoriteAdded?: () => void;
  onDomainQueried?: (domain: string) => void;
}

const DomainLookup = ({ initialDomain, onFavoriteAdded, onDomainQueried }: DomainLookupProps) => {
  const [domain, setDomain] = useState(initialDomain || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisData | null>(null);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [error, setError] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (initialDomain) {
      setDomain(initialDomain);
      handleLookupWithDomain(initialDomain);
    }
  }, [initialDomain]);
  
  useEffect(() => {
    if (initialDomain && !result && !loading && !error) {
      handleLookupWithDomain(initialDomain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateDomain = (input: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5-]{0,61}[a-zA-Z0-9\u4e00-\u9fa5]?\.[a-zA-Z\u4e00-\u9fa5]{2,}$/;
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
    setPricing(null);
    setIsFavorite(false);
    setIsAvailable(false);

    if (!domainToLookup.trim()) {
      setError(t('error.enterDomain'));
      return;
    }

    if (!validateDomain(domainToLookup.trim())) {
      setError(t('error.invalidFormat'));
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('domain-lookup', {
        body: { domain: domainToLookup.trim().toLowerCase() }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        setError(t('error.serviceUnavailable'));
        return;
      }

      if (data.error) {
        if (data.isAvailable) {
          setIsAvailable(true);
        }
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
          statusTranslated: data.primary.statusTranslated || [],
          registrant: data.primary.registrant,
          dnssec: data.primary.dnssec || false,
          source: data.primary.source === 'rdap' ? 'rdap' : 'whois',
          registrarWebsite: data.primary.registrarWebsite,
          registrarIanaId: data.primary.registrarIanaId,
          dnsProvider: data.primary.dnsProvider,
          privacyProtection: data.primary.privacyProtection,
          ageLabel: data.primary.ageLabel,
          updateLabel: data.primary.updateLabel,
          remainingDays: data.primary.remainingDays,
          registrationDateFormatted: data.primary.registrationDateFormatted,
          expirationDateFormatted: data.primary.expirationDateFormatted,
          lastUpdatedFormatted: data.primary.lastUpdatedFormatted,
          rawData: data.primary.rawData,
        };
        setResult(whoisData);
        
        if (data.pricing) {
          setPricing(data.pricing);
        }
        
        onDomainQueried?.(domainToLookup.trim().toLowerCase());
        
        // Add to recent queries (localStorage)
        addRecentQuery(domainToLookup.trim());
        
        await saveToHistory(domainToLookup.trim(), whoisData);
        await checkIsFavorite(domainToLookup.trim());
      } else {
        setError(t('error.notFound'));
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setError(t('error.queryFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    await handleLookupWithDomain(domain);
  };

  const toggleFavorite = async () => {
    if (!user || !result) {
      toast({ description: t('error.loginRequired'), variant: 'destructive' });
      return;
    }

    setFavoriteLoading(true);

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('domain_name', result.domain.toLowerCase());
        
        setIsFavorite(false);
        toast({ description: t('favorites.remove') });
      } else {
        await supabase.from('favorites').insert({
          user_id: user.id,
          domain_name: result.domain.toLowerCase(),
          registrar: result.registrar,
          expiration_date: result.expirationDate,
        });
        
        setIsFavorite(true);
        toast({ description: t('favorites.addSuccess') });
        onFavoriteAdded?.();
      }
    } catch (err) {
      console.error('Favorite error:', err);
      toast({ description: t('error.operationFailed'), variant: 'destructive' });
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <DomainSearch
        domain={domain}
        setDomain={setDomain}
        onSearch={handleLookup}
        loading={loading}
      />

      {error && (
        <div className={`flex items-start gap-3 p-3 border rounded-lg ${
          isAvailable 
            ? 'border-success/20 bg-success/5' 
            : 'border-destructive/20 bg-destructive/5'
        }`}>
          {isAvailable ? (
            <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-sm ${isAvailable ? 'text-success' : 'text-destructive'}`}>
              {error}
            </p>
            {isAvailable && (
              <Badge variant="outline" className="mt-1.5 text-success border-success text-xs">
                {t('pricing.available')}
              </Badge>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3">
          {user && (
            <div className="flex justify-end">
              <Button
                variant={isFavorite ? "default" : "outline"}
                size="sm"
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className="gap-1.5 h-8 text-xs"
              >
                <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? t('favorites.added') : t('favorites.add')}
              </Button>
            </div>
          )}
          <DomainResultCard data={result} pricing={pricing} />
        </div>
      )}
    </div>
  );
};

export default DomainLookup;
