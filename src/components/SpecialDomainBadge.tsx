interface SpecialDomainBadgeProps {
  domain: string;
  position?: 'inline' | 'fixed-right';
}

// List of special domains that get the shimmering "不讲•李" badge
const SPECIAL_DOMAINS = [
  'nic.bn',
  'nic.rw', 
  'f.af',
  'x.rw',
  'l.ke',
  'top.vg',
  'domain.bf',
];

const SpecialDomainBadge = ({ domain, position = 'inline' }: SpecialDomainBadgeProps) => {
  const normalizedDomain = domain.toLowerCase().trim();
  
  // Check if the domain matches any special domain
  const isSpecial = SPECIAL_DOMAINS.some(special => 
    normalizedDomain === special || normalizedDomain.endsWith(`.${special}`)
  );

  if (!isSpecial) {
    return null;
  }

  // Horizontal badge with inline text (not vertical)
  if (position === 'fixed-right') {
    return (
      <span className="shimmer-badge absolute -top-1 -right-1 inline-flex flex-row items-center whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-lg z-10">
        不讲•李
      </span>
    );
  }

  return (
    <span className="shimmer-badge inline-flex flex-row items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold text-white shadow-lg">
      不讲•李
    </span>
  );
};

export default SpecialDomainBadge;
