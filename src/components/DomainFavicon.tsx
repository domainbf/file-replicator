import { useState } from 'react';
import { Globe } from 'lucide-react';

interface DomainFaviconProps {
  domain: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DomainFavicon = ({ domain, size = 'md', className = '' }: DomainFaviconProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeMap = {
    sm: { container: 'h-6 w-6', icon: 'h-3 w-3', img: 16 },
    md: { container: 'h-10 w-10', icon: 'h-5 w-5', img: 32 },
    lg: { container: 'h-12 w-12', icon: 'h-6 w-6', img: 48 },
  };

  const { container, icon, img } = sizeMap[size];
  
  // Use Google's favicon service for reliable favicon fetching
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=${img * 2}`;

  if (hasError || !domain) {
    return (
      <div className={`${container} rounded-lg bg-muted flex items-center justify-center shrink-0 ${className}`}>
        <Globe className={`${icon} text-primary`} />
      </div>
    );
  }

  return (
    <div className={`${container} rounded-lg bg-muted flex items-center justify-center shrink-0 ${className} overflow-hidden`}>
      {isLoading && <Globe className={`${icon} text-primary absolute`} />}
      <img
        src={faviconUrl}
        alt={`${domain} favicon`}
        width={img}
        height={img}
        className={`object-contain ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
};

export default DomainFavicon;
