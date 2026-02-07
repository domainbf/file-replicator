import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface DomainSearchProps {
  domain: string;
  setDomain: (domain: string) => void;
  onSearch: () => void;
  loading: boolean;
}

const DomainSearch = ({ domain, setDomain, onSearch, loading }: DomainSearchProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      onSearch();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="domain" className="text-sm font-medium">
        域名或 IDN
      </Label>
      <div className="flex gap-2">
        <Input
          id="domain"
          type="text"
          placeholder="e.g., example.com or münich.de"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={loading}
        />
        <Button onClick={onSearch} disabled={loading} className="min-w-[80px]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '查询'}
        </Button>
      </div>
    </div>
  );
};

export default DomainSearch;
