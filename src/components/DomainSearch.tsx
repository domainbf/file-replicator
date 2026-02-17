import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useTldSuggestions } from '@/hooks/useTldSuggestions';
import { cn } from '@/lib/utils';

interface DomainSearchProps {
  domain: string;
  setDomain: (domain: string) => void;
  onSearch: () => void;
  loading: boolean;
}

/**
 * 强化输入清洗 + 限制段数
 */
function cleanDomainInput(value: string) {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[，。]/g, '.')        // 中文标点 → .
    .replace(/[, ]+/g, '.')         // 逗号空格 → .
    .replace(/\.{2,}/g, '.')        // 多个点 → 一个
    .replace(/[^a-z0-9.-]/g, '');   // 只保留合法字符

  // 最多允许 4 段（防止 api.i.io.io... 这种极端情况）
  const parts = cleaned.split('.');
  if (parts.length > 5) {
    return parts.slice(-4).join('.');
  }
  return cleaned;
}

/**
 * 简单智能补全（只在必要时加常见后缀）
 */
function smartAutoComplete(input: string, popularTlds: string[] = ['.com', '.ai', '.io', '.co', '.app']) {
  if (!input) return input;
  if (input.includes('.')) {
    // 已有点，不强制补全
    return input;
  }
  // 纯单词 → 加最常见后缀（可根据用户偏好调整顺序）
  return input + popularTlds[0]; // 默认 .com，也可换成 .ai
}

const DomainSearch = ({
  domain,
  setDomain,
  onSearch,
  loading,
}: DomainSearchProps) => {
  const { t } = useLanguage();
  const { allTlds, getSuggestions } = useTldSuggestions();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [index, setIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // 输入变化 → 轻量防抖建议
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!domain.trim()) {
        setSuggestions([]);
        setShow(false);
        return;
      }
      setSuggestions(getSuggestions(domain));
      setIndex(-1);
      setShow(true);
    }, 120);

    return () => clearTimeout(timer);
  }, [domain, getSuggestions]);

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !boxRef.current?.contains(e.target as Node)
      ) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    let cleaned = cleanDomainInput(domain);
    if (!cleaned) return;

    // 仅当无点时补全
    if (!cleaned.includes('.')) {
      cleaned = smartAutoComplete(cleaned);
    }

    setDomain(cleaned);
    setShow(false);
    setTimeout(onSearch, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (loading) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShow(true);
      setIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (show && index >= 0) {
        setDomain(suggestions[index]);
        setShow(false);
      } else {
        handleSearch();
      }
    } else if (e.key === 'Escape') {
      setShow(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = cleanDomainInput(e.target.value);
    setDomain(cleaned);
    setShow(true);
  };

  const choose = (s: string) => {
    setDomain(s);
    setShow(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex gap-2">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={domain}
          placeholder={t('search.placeholder')}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length && setShow(true)}
          autoComplete="off"
          disabled={loading}
        />

        {show && suggestions.length > 0 && (
          <div
            ref={boxRef}
            className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto"
          >
            {suggestions.slice(0, 8).map((s, i) => (
              <div
                key={s}
                onClick={() => choose(s)}
                className={cn(
                  'px-4 py-2.5 text-sm cursor-pointer hover:bg-accent transition',
                  i === index && 'bg-accent'
                )}
              >
                {s}
              </div>
            ))}

            <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/40">
              ↑↓ 选择 · Enter 搜索 · Esc 关闭
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={handleSearch}
        disabled={loading}
        className="min-w-[80px]"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('search.button')}
      </Button>
    </div>
  );
};

export default DomainSearch;
