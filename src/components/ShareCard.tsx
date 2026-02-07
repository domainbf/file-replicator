import { forwardRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { WhoisData, PricingData } from './DomainResultCard';

interface ShareCardProps {
  data: WhoisData;
  pricing?: PricingData | null;
  isDark?: boolean;
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ data, pricing, isDark = false }, ref) => {
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
  const hasRegistrantInfo = data.registrant && 
    (data.registrant.name || data.registrant.organization || data.registrant.country);

  const getRemainingDaysStyle = (days: number | undefined) => {
    if (days === undefined || days === null) return { bg: colors.tagBg, text: colors.textMuted };
    if (days <= 30) return { bg: colors.dangerBg, text: colors.dangerText };
    if (days <= 90) return { bg: colors.warningBg, text: colors.warningText };
    return { bg: colors.successBg, text: colors.successText };
  };

  return (
    <div
      ref={ref}
      style={{
        width: '440px',
        backgroundColor: colors.bg,
        color: colors.text,
        padding: '24px',
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
        gap: '10px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${colors.border}`
      }}>
        <span style={{ fontSize: '13px', color: colors.textMuted }}>
          {language === 'zh' ? '注册' : 'Register'}: 
          <span style={{ color: colors.blueText, fontWeight: 600, marginLeft: '4px' }}>
            {pricing?.registerPrice ? `¥${pricing.registerPrice}` : '-'}
          </span>
        </span>
        <span style={{ fontSize: '13px', color: colors.textMuted }}>
          {language === 'zh' ? '续费' : 'Renew'}: 
          <span style={{ color: colors.blueText, fontWeight: 600, marginLeft: '4px' }}>
            {pricing?.renewPrice ? `¥${pricing.renewPrice}` : '-'}
          </span>
        </span>
        <span style={{ fontSize: '13px', color: colors.textMuted }}>
          {language === 'zh' ? '溢价' : 'Premium'}: 
          <span style={{ fontWeight: 500, marginLeft: '4px', color: colors.textSecondary }}>
            {pricing?.isPremium ? (language === 'zh' ? '是' : 'Yes') : (language === 'zh' ? '否' : 'No')}
          </span>
        </span>
        <span style={{
          backgroundColor: colors.primaryBg,
          color: colors.primaryText,
          fontSize: '12px',
          padding: '4px 10px',
          borderRadius: '6px',
          fontWeight: 600,
        }}>
          {language === 'zh' ? '已注册' : 'Registered'}
        </span>
        <span style={{
          backgroundColor: colors.tagBg,
          color: colors.tagText,
          fontSize: '12px',
          padding: '4px 10px',
          borderRadius: '6px',
          marginLeft: 'auto',
          fontWeight: 500,
        }}>
          {data.source === 'rdap' ? 'RDAP' : 'WHOIS'}
        </span>
      </div>

      {/* Domain Name Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: 0,
          color: colors.text,
          wordBreak: 'break-all',
        }}>
          {data.domain}
        </h2>
      </div>

      {/* Domain Info Section */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '12px',
          fontSize: '14px',
          fontWeight: 600,
          color: colors.textSecondary,
        }}>
          <span style={{ fontSize: '16px' }}>ℹ️</span>
          <span>{language === 'zh' ? '域名信息' : 'Domain Info'}</span>
        </div>

        <div style={{ 
          border: `1px solid ${colors.border}`,
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          {/* Registrar */}
          {hasRegistrar && (
            <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ 
                width: '100px', 
                padding: '12px 14px',
                backgroundColor: colors.labelBg,
                fontSize: '13px',
                color: colors.textMuted,
                flexShrink: 0,
              }}>
                {language === 'zh' ? '注册商' : 'Registrar'}
              </div>
              <div style={{ 
                flex: 1,
                padding: '12px 14px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <span style={{ wordBreak: 'break-word' }}>
                  {data.registrar}
                </span>
                {data.registrarWebsite && (
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '5px',
                    color: colors.textMuted,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    🔗 {language === 'zh' ? '官网' : 'Website'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Registration Date */}
          {hasRegistrationDate && (
            <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ 
                width: '100px', 
                padding: '12px 14px',
                backgroundColor: colors.labelBg,
                fontSize: '13px',
                color: colors.textMuted,
                flexShrink: 0,
              }}>
                {language === 'zh' ? '注册时间' : 'Registered'}
              </div>
              <div style={{ 
                flex: 1,
                padding: '12px 14px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <span>{data.registrationDateFormatted || data.registrationDate}</span>
                {data.ageLabel && (
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    backgroundColor: colors.successBg,
                    color: colors.successText,
                    borderRadius: '5px',
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
            <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ 
                width: '100px', 
                padding: '12px 14px',
                backgroundColor: colors.labelBg,
                fontSize: '13px',
                color: colors.textMuted,
                flexShrink: 0,
              }}>
                {language === 'zh' ? '更新时间' : 'Updated'}
              </div>
              <div style={{ 
                flex: 1,
                padding: '12px 14px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <span>{data.lastUpdatedFormatted || data.lastUpdated}</span>
                {data.updateLabel && (
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    backgroundColor: colors.tagBg,
                    color: colors.tagText,
                    borderRadius: '5px',
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
            <div style={{ display: 'flex' }}>
              <div style={{ 
                width: '100px', 
                padding: '12px 14px',
                backgroundColor: colors.labelBg,
                fontSize: '13px',
                color: colors.textMuted,
                flexShrink: 0,
              }}>
                {language === 'zh' ? '过期时间' : 'Expires'}
              </div>
              <div style={{ 
                flex: 1,
                padding: '12px 14px',
                fontSize: '14px',
                fontWeight: 500,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <span>{data.expirationDateFormatted || data.expirationDate}</span>
                {data.remainingDays !== undefined && data.remainingDays !== null && (
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    backgroundColor: getRemainingDaysStyle(data.remainingDays).bg,
                    color: getRemainingDaysStyle(data.remainingDays).text,
                    borderRadius: '5px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}>
                    {language === 'zh' ? `剩余${data.remainingDays}天` : `${data.remainingDays} days`}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registrant Info */}
      {hasRegistrantInfo && !data.privacyProtection && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: 600,
            color: colors.textSecondary,
          }}>
            <span style={{ fontSize: '16px' }}>👤</span>
            <span>{language === 'zh' ? '注册人信息' : 'Registrant'}</span>
          </div>

          <div style={{ 
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            {data.registrant?.name && (
              <div style={{ display: 'flex', borderBottom: data.registrant?.organization || data.registrant?.country ? `1px solid ${colors.border}` : 'none' }}>
                <div style={{ 
                  width: '100px', 
                  padding: '10px 14px',
                  backgroundColor: colors.labelBg,
                  fontSize: '13px',
                  color: colors.textMuted,
                  flexShrink: 0,
                }}>
                  {language === 'zh' ? '姓名' : 'Name'}
                </div>
                <div style={{ flex: 1, padding: '10px 14px', fontSize: '14px', color: colors.text, wordBreak: 'break-word' }}>
                  {data.registrant.name}
                </div>
              </div>
            )}
            {data.registrant?.organization && (
              <div style={{ display: 'flex', borderBottom: data.registrant?.country ? `1px solid ${colors.border}` : 'none' }}>
                <div style={{ 
                  width: '100px', 
                  padding: '10px 14px',
                  backgroundColor: colors.labelBg,
                  fontSize: '13px',
                  color: colors.textMuted,
                  flexShrink: 0,
                }}>
                  {language === 'zh' ? '组织' : 'Org'}
                </div>
                <div style={{ flex: 1, padding: '10px 14px', fontSize: '14px', color: colors.text, wordBreak: 'break-word' }}>
                  {data.registrant.organization}
                </div>
              </div>
            )}
            {data.registrant?.country && (
              <div style={{ display: 'flex' }}>
                <div style={{ 
                  width: '100px', 
                  padding: '10px 14px',
                  backgroundColor: colors.labelBg,
                  fontSize: '13px',
                  color: colors.textMuted,
                  flexShrink: 0,
                }}>
                  {language === 'zh' ? '国家' : 'Country'}
                </div>
                <div style={{ flex: 1, padding: '10px 14px', fontSize: '14px', color: colors.text }}>
                  {data.registrant.country}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy Protection Notice */}
      {data.privacyProtection && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            backgroundColor: colors.labelBg,
            borderRadius: '10px',
            border: `1px dashed ${colors.border}`,
          }}>
            <span style={{ fontSize: '22px' }}>🔒</span>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: colors.textMuted, margin: 0 }}>
                {language === 'zh' ? '注册人信息已启用隐私保护' : 'Privacy Protected'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Domain Status */}
      {displayStatus.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: 600,
            color: colors.textSecondary,
          }}>
            <span style={{ fontSize: '16px' }}>🛡️</span>
            <span>{language === 'zh' ? '域名状态' : 'Status'}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {displayStatus.slice(0, 6).map((status, index) => (
              <span 
                key={index}
                style={{
                  fontSize: '12px',
                  padding: '5px 10px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  color: colors.tagText,
                  backgroundColor: colors.cardBg,
                }}
              >
                {status}
              </span>
            ))}
            {displayStatus.length > 6 && (
              <span style={{
                fontSize: '12px',
                padding: '5px 10px',
                color: colors.textMuted,
              }}>
                +{displayStatus.length - 6}
              </span>
            )}
          </div>
        </div>
      )}

      {/* DNSSEC */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        paddingTop: '16px',
        borderTop: `1px solid ${colors.border}`,
        marginBottom: '20px',
      }}>
        <span style={{ fontSize: '13px', color: colors.textMuted }}>DNSSEC:</span>
        <span style={{
          fontSize: '12px',
          padding: '4px 10px',
          borderRadius: '6px',
          backgroundColor: data.dnssec ? colors.primaryBg : colors.tagBg,
          color: data.dnssec ? colors.primaryText : colors.textMuted,
          fontWeight: 500,
        }}>
          {data.dnssec ? (language === 'zh' ? '已启用' : 'Enabled') : (language === 'zh' ? '未启用' : 'Disabled')}
        </span>
      </div>

      {/* Name Servers */}
      {hasNameServers && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: colors.textSecondary,
            }}>
              <span style={{ fontSize: '16px' }}>🖥️</span>
              <span>{language === 'zh' ? '域名服务器' : 'Name Servers'}</span>
            </div>
            {data.dnsProvider && (
              <span style={{
                fontSize: '11px',
                padding: '4px 8px',
                border: `1px solid ${colors.border}`,
                borderRadius: '5px',
                color: colors.textMuted,
              }}>
                {data.dnsProvider.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.nameServers.slice(0, 4).map((ns, index) => (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: colors.labelBg,
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: '"SF Mono", Monaco, "Courier New", monospace',
                  color: colors.text,
                }}
              >
                <span style={{ color: colors.textMuted, marginRight: '10px', fontWeight: 500 }}>NS{index + 1}:</span>
                <span style={{ wordBreak: 'break-all' }}>{ns.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        paddingTop: '16px',
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: '12px', color: colors.textMuted }}>
          RDAP {language === 'zh' ? '域名查询' : 'Domain Lookup'} · rdap.lovable.app
        </span>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';

export default ShareCard;
