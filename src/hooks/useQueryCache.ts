import { WhoisData, PricingData } from '@/components/DomainResultCard';

interface CachedResult {
  whoisData: WhoisData;
  pricing: PricingData | null;
  timestamp: number;
  isRegistered: boolean;
}

const CACHE_KEY = 'domain_query_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache
const MAX_CACHE_SIZE = 50;

export const getFromCache = (domain: string): CachedResult | null => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return null;
    
    const cache: Record<string, CachedResult> = JSON.parse(stored);
    const normalizedDomain = domain.toLowerCase().trim();
    const cached = cache[normalizedDomain];
    
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      // Remove expired entry
      delete cache[normalizedDomain];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    
    return cached;
  } catch (e) {
    console.error('Failed to read from cache:', e);
    return null;
  }
};

export const saveToCache = (
  domain: string, 
  whoisData: WhoisData, 
  pricing: PricingData | null,
  isRegistered: boolean = true
): void => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    let cache: Record<string, CachedResult> = stored ? JSON.parse(stored) : {};
    
    const normalizedDomain = domain.toLowerCase().trim();
    
    // Clean old entries if cache is too large
    const entries = Object.entries(cache);
    if (entries.length >= MAX_CACHE_SIZE) {
      // Sort by timestamp and remove oldest
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      cache = Object.fromEntries(entries.slice(0, MAX_CACHE_SIZE - 1));
    }
    
    cache[normalizedDomain] = {
      whoisData,
      pricing,
      timestamp: Date.now(),
      isRegistered,
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save to cache:', e);
  }
};

export const clearCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.error('Failed to clear cache:', e);
  }
};
