import { useState, useRef, useEffect } from 'react';
import punycode from 'punycode/';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useTldSuggestions } from '@/hooks/useTldSuggestions';
import { cn } from '@/lib/utils';

interface Props {
  domain: string;
  setDomain: (v: string) => void;
  onSearch: () => void;
  loading: boolean;
}

/* =========================
   ⭐ 超级域名提取器（核心）
========================= */
function extractDomain(raw: string) {
  if (!raw) return '';

  let v = raw
    .toLowerCase()
    .trim()

    // 删除协议
    .replace(/https?:\/\//g, '')
    .replace(/ftp:\/\//g, '')

    // 删除 www
    .replace(/^www\./, '')

    // 中文标点
    .replace(/[，。]/g, '.')

    // 空格转点
    .replace(/\s+/g, '.')

    // 删除路径
    .split('/')[0]

    // 删除邮箱前缀
    .split('@').pop() || '';

  // 只留合法字符
  v = v.replace(/[^a-z0-9.-]/g, '');

  // 合并多个 .
  v = v.replace(/\.{2,}/g, '.');

  // 防极端段数
  const parts = v.split('.');
  if (parts.length > 5) {
    v = parts.slice(-4).join('.');
  }

  // ⭐ 中文域名 → punycode
  try {
    if (/[^ -~]/.test(v)) {
      v = punycode.toASCII(v);
    }
  } catch {}

  return v;
}

/* =========================
   自动补全 .com
========================= */
function autoTld(v: string) {
  if (!v) return v;
  if (v.includes('.')) return v;
  return v + '.com';
}

export default function DomainSearch({
  domain,
  setDomain,
  onSearch,
  loading,
}: Props) {

  const { t } = useLanguage();
  const { getSuggestions } = useTldSuggestions();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [index, setIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  /* =========================
     ⭐ iOS Safari终极防补全
  ========================= */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    el.setAttribute('autocomplete', 'new-password');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('autocapitalize', 'off');
    el.setAttribute('spellcheck', 'false');
  }, []);

  /* =========================
     suggestions 防抖
  ========================= */
  useEffect(() => {

    const timer = setTimeout(() => {

      const cleaned = extractDomain(domain);

      if (!cleaned) {
        setSuggestions([]);
        setShow(false);
        return;
      }

      setSuggestions(getSuggestions(cleaned));
      setIndex(-1);
      setShow(true);

    }, 120);

    return () => clearTimeout(timer);

  }, [domain, getSuggestions]);

  /* =========================
     点击外部关闭
  ========================= */
  useEffect(() => {

    const fn = (e: MouseEvent) => {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !boxRef.current?.contains(e.target as Node)
      ) {
        setShow(false);
      }
    };

    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);

  }, []);

  /* =========================
     输入变化（核心）
  ========================= */
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = extractDomain(e.target.value);
    setDomain(cleaned);
    setShow(true);
  };

  /* =========================
     ⭐ 粘贴清洗（Google级关键）
  ========================= */
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    setDomain(extractDomain(text));
    setShow(true);
  };

  /* =========================
     搜索
  ========================= */
  const handleSearch = () => {

    let cleaned = extractDomain(domain);
    if (!cleaned) return;

    cleaned = autoTld(cleaned);

    setDomain(cleaned);
    setShow(false);

    setTimeout(onSearch, 0);
  };

  /* =========================
     键盘控制
  ========================= */
  const onKeyDown = (e: React.KeyboardEvent) => {

    if (loading) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShow(true);
      setIndex(i => Math.min(i + 1, suggestions.length - 1));
    }

    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(i => Math.max(i - 1, -1));
    }

    else if (e.key === 'Enter') {
      e.preventDefault();

      if (show && index >= 0) {
        setDomain(suggestions[index]);
        setShow(false);
      } else {
        handleSearch();
      }
    }

    else if (e.key === 'Escape') {
      setShow(false);
    }
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

          /* ⭐ 必须随机 name（Safari关键） */
          name="domain-input-83921"

          inputMode="url"
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}

          placeholder={t('search.placeholder')}

          onChange={onChange}
          onPaste={onPaste}
          onKeyDown={onKeyDown}

          onFocus={() => setShow(true)}
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
                  'px-4 py-2.5 text-sm cursor-pointer hover:bg-accent',
                  i === index && 'bg-accent'
                )}
              >
                {s}
              </div>
            ))}

          </div>
        )}

      </div>

      <Button
        onClick={handleSearch}
        disabled={loading}
        className="min-w-[80px]"
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin"/>
          : t('search.button')}
      </Button>

    </div>
  );
}
