import { forwardRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { WhoisData, PricingData } from './DomainResultCard';

interface ShareCardProps {
  data: WhoisData;
  pricing?: PricingData | null;
  isDark?: boolean;
  siteUrl?: string;
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ data, pricing, isDark = false, siteUrl = '' }, ref) => {
  const { language } = useLanguage();

  // Theme colors
  const colors = isDark ? {
    bg: '#171717',
    cardBg: '#1f1f1f',
    text: '#fafafa',
    textSecondary: '#a3a3a3',
    textMuted: '#737373',
    border: '#333333',
    labelBg: '#262626',
    tagBg: '#262626',
    tagText: '#d4d4d4',
    primaryBg: '#fafafa',
    primaryText: '#171717',
    successBg: 'rgba(34, 197, 94, 0.15)',
    successText: '#4ade80',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    warningText: '#fbbf24',
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    dangerText: '#f87171',
    blueBg: 'rgba(59, 130, 246, 0.15)',
    blueText: '#60a5fa',
  } : {
    bg: '#ffffff',
    cardBg: '#ffffff',
    text: '#171717',
    textSecondary: '#525252',
    textMuted: '#737373',
    border: '#e5e5e5',
    labelBg: '#f5f5f5',
    tagBg: '#f5f5f5',
    tagText: '#525252',
    primaryBg: '#171717',
    primaryText: '#ffffff',
    successBg: 'rgba(34, 197, 94, 0.1)',
    successText: '#16a34a',
    warningBg: 'rgba(245, 158, 11, 0.1)',
    warningText: '#d97706',
    dangerBg: 'rgba(239, 68, 68, 0.1)',
    dangerText: '#dc2626',
    blueBg: 'rgba(59, 130, 246, 0.1)',
    blueText: '#2563eb',
  };

  const displayStatus = data.statusTranslated || data.status || [];
  const hasRegistrationDate = data.registrationDate && data.registrationDate !== 'N/A';
  const hasExpirationDate = data.expirationDate && data.expirationDate !== 'N/A';
  const hasLastUpdated = data.lastUpdated && data.lastUpdated !== 'N/A';
  const hasRegistrar = data.registrar && data.registrar !== 'N/A' && data.registrar.trim() !== '';
  const hasNameServers = data.nameServers && data.nameServers.length > 0;

  const getRemainingDaysStyle = (days: number | undefined) => {
    if (days === undefined || days === null) return { bg: colors.tagBg, text: colors.textMuted };
    if (days <= 30) return { bg: colors.dangerBg, text: colors.dangerText };
    if (days <= 90) return { bg: colors.warningBg, text: colors.warningText };
    return { bg: colors.successBg, text: colors.successText };
  };

  // Get display hostname from siteUrl
  const displayHost = siteUrl ? new URL(siteUrl).hostname : 'rdap.lovable.app';

  return (
    <div
      ref={ref}
      style={{
        width: '380px',
        backgroundColor: colors.bg,
        color: colors.text,
        padding: '20px',
        borderRadius: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
        boxShadow: isDark 
          ? '0 8px 32px rgba(0,0,0,0.4)' 
          : '0 8px 32px rgba(0,0,0,0.08)',
      }}
    >
      {/* Price Tags Row */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '16px',
        paddingBottom: '14px',
        borderBottom: `1px solid ${colors.border}`
      }}>
        <span style={{ fontSize: '12px', color: colors.textMuted }}>
          {language === 'zh' ? '注册' : 'Reg'}: 
          <span style={{ color: colors.blueText, fontWeight: 600, marginLeft: '2px' }}>
            {pricing?.registerPrice ? `¥${pricing.registerPrice}` : '-'}
          </span>
        </span>
        <span style={{ fontSize: '12px', color: colors.textMuted }}>
          {language === 'zh' ? '续费' : 'Renew'}: 
          <span style={{ color: colors.blueText, fontWeight: 600, marginLeft: '2px' }}>
            {pricing?.renewPrice ? `¥${pricing.renewPrice}` : '-'}
          </span>
        </span>
        <span style={{ fontSize: '12px', color: colors.textMuted }}>
          {language === 'zh' ? '溢价' : 'Premium'}: 
          <span style={{ fontWeight: 500, marginLeft: '2px', color: colors.textSecondary }}>
            {pricing?.isPremium ? (language === 'zh' ? '是' : 'Yes') : (language === 'zh' ? '否' : 'No')}
          </span>
        </span>
        <span style={{
          backgroundColor: colors.primaryBg,
          color: colors.primaryText,
          fontSize: '11px',
          padding: '3px 8px',
          borderRadius: '5px',
          fontWeight: 600,
        }}>
          {language === 'zh' ? '已注册' : 'Registered'}
        </span>
        <span style={{
          backgroundColor: colors.tagBg,
          color: colors.tagText,
          fontSize: '11px',
          padding: '3px 8px',
          borderRadius: '5px',
          marginLeft: 'auto',
          fontWeight: 500,
        }}>
          {data.source === 'rdap' ? 'RDAP' : 'WHOIS'}
        </span>
      </div>

      {/* Domain Name Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ 
          fontSize: '22px', 
          fontWeight: 700, 
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
          margin: 0,
          color: colors.text,
          wordBreak: 'break-all',
          lineHeight: 1.3,
        }}>
          {data.domain}
        </h2>
      </div>

      {/* Domain Info Section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          marginBottom: '10px',
          fontSize: '13px',
          fontWeight: 600,
          color: colors.textSecondary,
        }}>
          <span style={{ fontSize: '14px' }}>ℹ️</span>
          <span>{language === 'zh' ? '域名信息' : 'Domain Info'}</span>
        </div>

        <div style={{ 
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          {/* Registrar */}
          {hasRegistrar && (
            <div style={{ 
              display: 'flex', 
              borderBottom: `1px solid ${colors.border}`,
              minHeight: '40px',
            }}>
              <div style={{ 
                width: '80px', 
                minWidth: '80px',
                padding: '10px 12px',
                backgroundColor: colors.labelBg,
                fontSize: '12px',
                color: colors.textMuted,
                display: 'flex',
                alignItems: 'center',
              }}>
                {language === 'zh' ? '注册商' : 'Registrar'}
              </div>
              <div style={{ 
                flex: 1,
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px',
                lineHeight: 1.4,
              }}>
                <span style={{ wordBreak: 'break-word' }}>
                  {data.registrar}
                </span>
                {data.registrarWebsite && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    color: colors.textMuted,
                    whiteSpace: 'nowrap',
                  }}>
                    🔗 {language === 'zh' ? '官网' : 'Web'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Registration Date */}
          {hasRegistrationDate && (
            <div style={{ 
              display: 'flex', 
              borderBottom: `1px solid ${colors.border}`,
              minHeight: '40px',
            }}>
              <div style={{ 
                width: '80px', 
                minWidth: '80px',
                padding: '10px 12px',
                backgroundColor: colors.labelBg,
                fontSize: '12px',
                color: colors.textMuted,
                display: 'flex',
                alignItems: 'center',
              }}>
                {language === 'zh' ? '注册时间' : 'Created'}
              </div>
              <div style={{ 
                flex: 1,
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px',
              }}>
                <span>{data.registrationDateFormatted || data.registrationDate}</span>
                {data.ageLabel && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: colors.successBg,
                    color: colors.successText,
                    borderRadius: '4px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}>
                    {data.ageLabel}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Last Updated */}
          {hasLastUpdated && (
            <div style={{ 
              display: 'flex', 
              borderBottom: `1px solid ${colors.border}`,
              minHeight: '40px',
            }}>
              <div style={{ 
                width: '80px', 
                minWidth: '80px',
                padding: '10px 12px',
                backgroundColor: colors.labelBg,
                fontSize: '12px',
                color: colors.textMuted,
                display: 'flex',
                alignItems: 'center',
              }}>
                {language === 'zh' ? '更新时间' : 'Updated'}
              </div>
              <div style={{ 
                flex: 1,
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px',
              }}>
                <span>{data.lastUpdatedFormatted || data.lastUpdated}</span>
                {data.updateLabel && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: colors.tagBg,
                    color: colors.tagText,
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                  }}>
                    {data.updateLabel}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Expiration Date */}
          {hasExpirationDate && (
            <div style={{ 
              display: 'flex',
              minHeight: '40px',
            }}>
              <div style={{ 
                width: '80px', 
                minWidth: '80px',
                padding: '10px 12px',
                backgroundColor: colors.labelBg,
                fontSize: '12px',
                color: colors.textMuted,
                display: 'flex',
                alignItems: 'center',
              }}>
                {language === 'zh' ? '过期时间' : 'Expires'}
              </div>
              <div style={{ 
                flex: 1,
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px',
              }}>
                <span>{data.expirationDateFormatted || data.expirationDate}</span>
                {data.remainingDays !== undefined && data.remainingDays !== null && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: getRemainingDaysStyle(data.remainingDays).bg,
                    color: getRemainingDaysStyle(data.remainingDays).text,
                    borderRadius: '4px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}>
                    {language === 'zh' ? `剩余${data.remainingDays}天` : `${data.remainingDays}d`}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Domain Status */}
      {displayStatus.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            marginBottom: '10px',
            fontSize: '13px',
            fontWeight: 600,
            color: colors.textSecondary,
          }}>
            <span style={{ fontSize: '14px' }}>🛡️</span>
            <span>{language === 'zh' ? '域名状态' : 'Status'}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {displayStatus.slice(0, 4).map((status, index) => (
              <span 
                key={index}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '5px',
                  color: colors.tagText,
                  backgroundColor: colors.cardBg,
                }}
              >
                {status}
              </span>
            ))}
            {displayStatus.length > 4 && (
              <span style={{
                fontSize: '11px',
                padding: '4px 8px',
                color: colors.textMuted,
              }}>
                +{displayStatus.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* DNSSEC */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingTop: '12px',
        borderTop: `1px solid ${colors.border}`,
        marginBottom: '16px',
      }}>
        <span style={{ fontSize: '12px', color: colors.textMuted }}>DNSSEC:</span>
        <span style={{
          fontSize: '11px',
          padding: '3px 8px',
          borderRadius: '5px',
          backgroundColor: data.dnssec ? colors.primaryBg : colors.tagBg,
          color: data.dnssec ? colors.primaryText : colors.textMuted,
          fontWeight: 500,
        }}>
          {data.dnssec ? (language === 'zh' ? '已启用' : 'Enabled') : (language === 'zh' ? '未启用' : 'Disabled')}
        </span>
      </div>

      {/* Name Servers */}
      {hasNameServers && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: colors.textSecondary,
            }}>
              <span style={{ fontSize: '14px' }}>🖥️</span>
              <span>{language === 'zh' ? '域名服务器' : 'NS'}</span>
            </div>
            {data.dnsProvider && (
              <span style={{
                fontSize: '10px',
                padding: '3px 6px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                color: colors.textMuted,
              }}>
                {data.dnsProvider.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.nameServers.slice(0, 3).map((ns, index) => (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 10px',
                  backgroundColor: colors.labelBg,
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: '"SF Mono", Monaco, "Courier New", monospace',
                  color: colors.text,
                }}
              >
                <span style={{ color: colors.textMuted, marginRight: '8px', fontWeight: 500 }}>NS{index + 1}:</span>
                <span style={{ wordBreak: 'break-all' }}>{ns.toUpperCase()}</span>
              </div>
            ))}
            {data.nameServers.length > 3 && (
              <span style={{ fontSize: '11px', color: colors.textMuted, paddingLeft: '10px' }}>
                +{data.nameServers.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        paddingTop: '14px',
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: '11px', color: colors.textMuted }}>
          {data.source === 'rdap' ? 'RDAP' : 'WHOIS'} {language === 'zh' ? '域名查询' : 'Lookup'} · {displayHost}
        </span>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';

export default ShareCard;
