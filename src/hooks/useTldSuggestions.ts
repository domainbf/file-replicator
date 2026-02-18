import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Common TLDs to prioritize in suggestions
const COMMON_TLDS = ['com', 'net', 'org', 'io', 'co', 'ai', 'app', 'dev', 'cn', 'rw'];

// Module-level cache to avoid refetching
let cachedTlds: string[] | null = null;
let cachePromise: Promise<string[]> | null = null;

// Fetch TLDs with caching
const fetchTldsWithCache = async (): Promise<string[]> => {
  if (cachedTlds) return cachedTlds;
  if (cachePromise) return cachePromise;
  
  cachePromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('whois_servers')
        .select('tld')
        .order('tld');

      if (!error && data) {
        cachedTlds = data.map(item => item.tld);
        return cachedTlds;
      }
    } catch (e) {
      console.error('Failed to fetch TLDs:', e);
    }
    return [];
  })();
  
  return cachePromise;
};

export const useTldSuggestions = () => {
  const [allTlds, setAllTlds] = useState<string[]>(cachedTlds || []);
  const [loading, setLoading] = useState(!cachedTlds);

  useEffect(() => {
    if (cachedTlds) {
      setAllTlds(cachedTlds);
      setLoading(false);
      return;
    }

    fetchTldsWithCache().then(tlds => {
      setAllTlds(tlds);
      setLoading(false);
    });
  }, []);

  const getSuggestions = useMemo(() => {
    return (input: string, maxResults = 8): string[] => {
      if (!input.trim()) return [];

      const trimmed = input.trim().toLowerCase();
      
      if (trimmed.includes('.')) {
        const parts = trimmed.split('.');
        const prefix = parts.slice(0, -1).join('.');
        const tldPart = parts[parts.length - 1];
        
        if (!prefix) return [];
        
        const matchingTlds = allTlds
          .filter(tld => tld.startsWith(tldPart))
          .slice(0, maxResults * 2);
        
        return matchingTlds
          .sort((a, b) => {
            const aCommon = COMMON_TLDS.indexOf(a);
            const bCommon = COMMON_TLDS.indexOf(b);
            if (aCommon !== -1 && bCommon === -1) return -1;
            if (aCommon === -1 && bCommon !== -1) return 1;
            if (aCommon !== -1 && bCommon !== -1) return aCommon - bCommon;
            return a.localeCompare(b);
          })
          .slice(0, maxResults)
          .map(tld => `${prefix}.${tld}`);
      }
      
      const suggestions: string[] = [];
      const matchingTld = allTlds.find(tld => tld === trimmed);
      if (matchingTld) {
        suggestions.push(`${trimmed}.${matchingTld}`);
      }
      
      COMMON_TLDS.forEach(tld => {
        if (allTlds.includes(tld) && !suggestions.some(s => s.endsWith(`.${tld}`))) {
          suggestions.push(`${trimmed}.${tld}`);
        }
      });
      
      return suggestions.slice(0, maxResults);
    };
  }, [allTlds]);

  return { allTlds, getSuggestions, loading };
};

/**
 * 优化后的域名自动补全逻辑
 * 1. 输入 "google" -> "google.com"
 * 2. 输入 "google." -> "google.com"
 * 3. 输入 "nic.bn" -> "nic.bn" (不再补全 .com)
 */
export const autoCompleteDomain = (input: string): string => {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';

  const dotIndex = trimmed.lastIndexOf('.');

  // 场景：完全没有点，或者点是最后一位字符 (如 "example.")
  if (dotIndex === -1 || dotIndex === trimmed.length - 1) {
    // 移除末尾可能存在的点，统一补全 .com
    const cleanInput = trimmed.replace(/\.$/, '');
    return `${cleanInput}.com`;
  }

  // 场景：点之后已经有字符了 (如 "hello.sn", "nic.bn")，直接返回原内容
  return trimmed;
};
