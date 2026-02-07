interface SpecialDomainBadgeProps {
  domain: string;
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

const SpecialDomainBadge = ({ domain }: SpecialDomainBadgeProps) => {
  const normalizedDomain = domain.toLowerCase().trim();
  
  // Check if the domain matches any special domain
  const isSpecial = SPECIAL_DOMAINS.some(special => 
    normalizedDomain === special || normalizedDomain.endsWith(`.${special}`)
  );

  if (!isSpecial) {
    return null;
  }

  return (
    <span className="shimmer-badge inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white shadow-lg">
      不讲•李
    </span>
  );
};

export default SpecialDomainBadge;
