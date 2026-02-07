import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface DomainSearchProps {
  domain: string;
  setDomain: (domain: string) => void;
  onSearch: () => void;
  loading: boolean;
}

const DomainSearch = ({ domain, setDomain, onSearch, loading }: DomainSearchProps) => {
  const { t } = useLanguage();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      onSearch();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        id="domain"
        type="text"
        placeholder={t('search.placeholder')}
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1"
        disabled={loading}
      />
      <Button onClick={onSearch} disabled={loading} className="min-w-[72px]">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('search.button')}
      </Button>
    </div>
  );
};

export default DomainSearch;
