import { useState, useMemo, useRef } from "react";
import { Globe } from "lucide-react";

interface DomainFaviconProps {
  domain?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * favicon memory cache
 */
const faviconCache = new Map<string, string>();

/**
 * normalize domain from URL / domain string
 */
function normalizeDomain(input?: string) {
  if (!input) return "";

  try {
    // support full URL
    const url = new URL(
      input.startsWith("http") ? input : `https://${input}`
    );
    return url.hostname;
  } catch {
    return input
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
  }
}

export default function DomainFavicon({
  domain,
  size = "md",
  className = "",
}: DomainFaviconProps) {
  const cleanDomain = useMemo(() => normalizeDomain(domain), [domain]);

  const sizeMap = {
    sm: { container: "h-5 w-5", icon: "h-2.5 w-2.5", img: 16 },
    md: { container: "h-8 w-8", icon: "h-4 w-4", img: 24 },
    lg: { container: "h-10 w-10", icon: "h-5 w-5", img: 32 },
  };

  const { container, icon, img } = sizeMap[size];

  /**
   * favicon providers (ordered)
   */
  const providers = useMemo(() => {
    if (!cleanDomain) return [];

    const s = img * 2;

    return [
      // Google (fast, most reliable)
      `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${s}`,

      // DuckDuckGo (great backup)
      `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`,

      // Direct favicon (sometimes works best)
      `https://${cleanDomain}/favicon.ico`,
    ];
  }, [cleanDomain, img]);

  /**
   * initial src from cache or first provider
   */
  const initialSrc = faviconCache.get(cleanDomain) || providers[0];

  const [src, setSrc] = useState(initialSrc);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const triedRef = useRef(false);

  /**
   * fallback chain on error
   */
  const handleError = () => {
    if (!providers.length) return;

    const next = index + 1;

    if (next < providers.length) {
      setIndex(next);
      setSrc(providers[next]);
      return;
    }

    // mark tried
    triedRef.current = true;
  };

  /**
   * success → cache result
   */
  const handleLoad = () => {
    setLoaded(true);
    if (cleanDomain && src) faviconCache.set(cleanDomain, src);
  };

  /**
   * no domain OR all providers failed
   */
  if (!cleanDomain || triedRef.current) {
    return (
      <div
        className={`${container} rounded-lg bg-muted flex items-center justify-center shrink-0 ${className}`}
      >
        <Globe className={`${icon} text-primary`} />
      </div>
    );
  }

  return (
    <div
      className={`relative ${container} rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden ${className}`}
    >
      {!loaded && (
        <Globe className={`absolute ${icon} text-primary animate-pulse`} />
      )}

      <img
        src={src}
        alt={`${cleanDomain} favicon`}
        width={img}
        height={img}
        loading="lazy"
        className={`object-contain transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
