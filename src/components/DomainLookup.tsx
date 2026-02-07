import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DomainSearch from './DomainSearch';
import DomainResultCard, { WhoisData } from './DomainResultCard';

const DomainLookup = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoisData | null>(null);
  const [error, setError] = useState<string>('');

  const validateDomain = (input: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(input.trim());
  };

  const handleLookup = async () => {
    setError('');
    setResult(null);

    if (!domain.trim()) {
      setError('请输入要查询的域名');
      return;
    }

    if (!validateDomain(domain.trim())) {
      setError('域名格式无效，请输入正确的域名格式（如 example.com）');
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('domain-lookup', {
        body: { domain: domain.trim().toLowerCase() }
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

      {result && !loading && <DomainResultCard data={result} />}
    </div>
  );
};

export default DomainLookup;
