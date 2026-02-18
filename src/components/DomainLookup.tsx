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
import { getFromCache, saveToCache } from '@/hooks/useQueryCache';
import { useTldSuggestions, autoCompleteDomain } from '@/hooks/useTldSuggestions';

interface DomainLookupProps {
  initialDomain?: string;
  onFavoriteAdded?: () => void;
  onDomainQueried?: (domain: string) => void;
}

const DomainLookup = ({ initialDomain, onFavoriteAdded, onDomainQueried }: DomainLookupProps) => {
  const [domain, setDomain] = useState(initialDomain || '');
  const [loading, setLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [result, setResult] = useState<WhoisData | null>(null);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [error, setError] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { allTlds } = useTldSuggestions();

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

  // Check if domain is ccTLD (country code TLD)
  const isCcTLD = (domain: string): boolean => {
    const tld = domain.split('.').pop()?.toLowerCase() || '';
    // Most ccTLDs are 2 characters
    return tld.length === 2;
  };

  const handleLookupWithDomain = async (domainToLookup: string) => {
    setError('');
    setResult(null);
    setPricing(null);
    setIsFavorite(false);
    setIsAvailable(false);
    setFromCache(false);

    if (!domainToLookup.trim()) {
      setError(t('error.enterDomain'));
      return;
    }

    if (!validateDomain(domainToLookup.trim())) {
      setError(t('error.invalidFormat'));
      return;
    }

    const normalizedDomain = domainToLookup.trim().toLowerCase();

    // Check cache first for faster response
    const cached = getFromCache(normalizedDomain);
    if (cached) {
      setResult(cached.whoisData);
      setPricing(cached.pricing);
      setFromCache(true);
      onDomainQueried?.(normalizedDomain);
      addRecentQuery(normalizedDomain, cached.isRegistered);
      await checkIsFavorite(normalizedDomain);
      
      // Optionally refresh in background for ccTLD or old cache
      const cacheAge = Date.now() - cached.timestamp;
      if (cacheAge > 10 * 60 * 1000) { // Refresh if > 10 min old
        refreshInBackground(normalizedDomain);
      }
      return;
    }

    setLoading(true);

    try {
      // For ccTLD domains, skip pricing initially for faster response
      const skipInitialPricing = isCcTLD(normalizedDomain);
      
      const { data, error: fnError } = await supabase.functions.invoke('domain-lookup', {
        body: { 
          domain: normalizedDomain,
          skipPricing: skipInitialPricing,
        }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        setError(t('error.serviceUnavailable'));
        return;
      }

      if (data.error) {
        if (data.isAvailable) {
          setIsAvailable(true);
          addRecentQuery(normalizedDomain, false);
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
        
        // Handle pricing
        if (data.pricing) {
          setPricing(data.pricing);
          saveToCache(normalizedDomain, whoisData, data.pricing, true);
        } else if (skipInitialPricing) {
          // Fetch pricing in background for ccTLD
          saveToCache(normalizedDomain, whoisData, null, true);
          fetchPricingAsync(normalizedDomain, whoisData);
        } else {
          saveToCache(normalizedDomain, whoisData, null, true);
        }
        
        onDomainQueried?.(normalizedDomain);
        addRecentQuery(normalizedDomain, true);
        
        await saveToHistory(normalizedDomain, whoisData);
        await checkIsFavorite(normalizedDomain);
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

  // Fetch pricing asynchronously (after main result)
  const fetchPricingAsync = async (domainName: string, whoisData: WhoisData) => {
    setPricingLoading(true);
    try {
      const { data } = await supabase.functions.invoke('domain-lookup', {
        body: { 
          domain: domainName,
          pricingOnly: true,
        }
      });
      
      if (data?.pricing) {
        setPricing(data.pricing);
        saveToCache(domainName, whoisData, data.pricing, true);
      }
    } catch (e) {
      console.log('Pricing fetch failed:', e);
    } finally {
      setPricingLoading(false);
    }
  };

  // Refresh data in background without blocking UI
  const refreshInBackground = async (domainName: string) => {
    try {
      const { data } = await supabase.functions.invoke('domain-lookup', {
        body: { domain: domainName }
      });
      
      if (data?.primary) {
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
        
        saveToCache(domainName, whoisData, data.pricing || null, true);
      }
    } catch (e) {
      console.log('Background refresh failed:', e);
    }
  };

  const handleLookup = async () => {
    // Auto-complete with .com if no valid TLD
    const completedDomain = autoCompleteDomain(domain, allTlds);
    if (completedDomain !== domain) {
      setDomain(completedDomain);
    }
    await handleLookupWithDomain(completedDomain);
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

  // Reserve space for results to prevent layout shift
  const showResultArea = loading || result || error;

  return (
    <div className="w-full space-y-4">
      <DomainSearch
        domain={domain}
        setDomain={setDomain}
        onSearch={handleLookup}
        loading={loading}
      />

      {/* Fixed height container to prevent layout shift */}
      {showResultArea && (
        <div className="min-h-[300px]">
          {error && !loading && (
            <div className={`flex items-start gap-3 p-3 border rounded-lg animate-in fade-in-0 duration-300 ${
              isAvailable 
                ? 'border-success/20 bg-success/5' 
                : 'border-destructive/20 bg-destructive/5'
            }`}>
              {isAvailable ? (
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm ${isAvailable ? 'text-success' : 'text-destructive'}`}>
                  {error}
                </p>
                {isAvailable && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-success border-success text-xs">
                      {t('pricing.available')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {language === 'zh' ? '溢价: 未知' : 'Premium: Unknown'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('misc.loading')}
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              {user && (
                <div className="flex items-center justify-between">
                  {fromCache && (
                    <span className="text-xs text-muted-foreground">
                      ⚡ {language === 'zh' ? '来自缓存' : 'From cache'}
                    </span>
                  )}
                  <div className="flex-1" />
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
              <DomainResultCard 
                data={result} 
                pricing={pricing} 
                pricingLoading={pricingLoading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DomainLookup;
