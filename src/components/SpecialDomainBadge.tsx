interface SpecialDomainBadgeProps {
  domain: string;
  position?: 'inline' | 'fixed-right';
}

/**
 * 可维护的配置结构
 * 后期只要在这里加域名即可
 */
const SPECIAL_DOMAIN_CONFIG = [
  {
    name: '不讲•李',
    domains: [
      'nic.bn',
      'nic.rw',
      'f.af',
      'x.rw',
      'l.ke',
      'top.vg',
      'domain.bf',
      'hello.sn',
    ],
  },
];


/**
 * 查找匹配的 badge
 */
function getBadgeForDomain(domain: string) {
  const normalized = domain.toLowerCase().trim();

  for (const badge of SPECIAL_DOMAIN_CONFIG) {
    const matched = badge.domains.some(
      d => normalized === d || normalized.endsWith(`.${d}`)
    );

    if (matched) return badge;
  }

  return null;
}


const SpecialDomainBadge = ({ domain, position = 'inline' }: SpecialDomainBadgeProps) => {

  const badge = getBadgeForDomain(domain);

  if (!badge) return null;

  const baseClass =
    "inline-flex items-center whitespace-nowrap px-2.5 py-[2px] rounded-md text-[11px] font-semibold text-white shadow-md";

  // 更高级的 shimmer + 渐变
  const shimmerClass = `
    bg-gradient-to-r 
    from-purple-500 via-pink-500 to-orange-400
    bg-[length:200%_100%]
    animate-[shimmer_3s_linear_infinite]
  `;

  const fixedClass =
    position === 'fixed-right'
      ? "absolute -top-1 -right-1 z-10"
      : "";

  return (
    <span className={`${baseClass} ${shimmerClass} ${fixedClass}`}>
      {badge.name}
    </span>
  );
};

export default SpecialDomainBadge;
