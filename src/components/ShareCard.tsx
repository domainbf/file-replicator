import { forwardRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { WhoisData, PricingData } from './DomainResultCard';

interface ShareCardProps {
  data: WhoisData;
  pricing?: PricingData | null;
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ data, pricing }, ref) => {
  const { t, language } = useLanguage();

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }) + ' ' + date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return dateStr;
    }
  };

  const displayStatus = data.status || [];
  const hasRegistrationDate = data.registrationDate && data.registrationDate !== 'N/A';
  const hasExpirationDate = data.expirationDate && data.expirationDate !== 'N/A';
  const hasLastUpdated = data.lastUpdated && data.lastUpdated !== 'N/A';
  const hasRegistrar = data.registrar && data.registrar !== 'N/A' && data.registrar.trim() !== '';
  const hasNameServers = data.nameServers && data.nameServers.length > 0;

  return (
    <div
      ref={ref}
      className="bg-white text-black p-6 rounded-xl shadow-lg"
      style={{ width: '360px', fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <span className="font-bold text-lg">{data.domain.toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-black text-white text-xs rounded-md font-medium">domain</span>
          <span className="text-xs text-gray-500">{data.source.toUpperCase()}</span>
        </div>
      </div>

      {/* Info Table */}
      <div className="space-y-3 text-sm">
        {/* Domain Name */}
        <div className="flex">
          <span className="w-24 text-gray-500 shrink-0">{language === 'zh' ? '名称' : 'Name'}</span>
          <span className="font-medium">{data.domain.toUpperCase()}</span>
        </div>

        {/* Status */}
        {displayStatus.length > 0 && (
          <div className="flex">
            <span className="w-24 text-gray-500 shrink-0">{language === 'zh' ? '状态' : 'Status'}</span>
            <div className="flex flex-wrap gap-1.5">
              {displayStatus.slice(0, 3).map((status, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded border border-gray-200"
                >
                  <span className="text-gray-400">⚡</span>
                  {status}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Registrar */}
        {hasRegistrar && (
          <div className="flex">
            <span className="w-24 text-gray-500 shrink-0">{t('domain.registrar')}</span>
            <span className="font-medium">{data.registrar}</span>
          </div>
        )}

        {/* Source */}
        <div className="flex">
          <span className="w-24 text-gray-500 shrink-0">{language === 'zh' ? '数据源' : 'Source'}</span>
          <span className="font-medium">{data.source === 'rdap' ? 'RDAP Protocol' : 'WHOIS Protocol'}</span>
        </div>

        {/* Registration Date */}
        {hasRegistrationDate && (
          <div className="flex">
            <span className="w-24 text-gray-500 shrink-0">{language === 'zh' ? '创建日期' : 'Created'}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatDate(data.registrationDate)}</span>
              <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">UTC</span>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {hasLastUpdated && (
          <div className="flex">
            <span className="w-24 text-gray-500 shrink-0">{language === 'zh' ? '更新日期' : 'Updated'}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatDate(data.lastUpdated)}</span>
              <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">UTC</span>
            </div>
          </div>
        )}

        {/* Expiration Date */}
        {hasExpirationDate && (
          <div className="flex">
            <span className="w-24 text-gray-500 shrink-0">{language === 'zh' ? '过期日期' : 'Expires'}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{formatDate(data.expirationDate)}</span>
              <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">UTC</span>
            </div>
          </div>
        )}

        {/* Name Servers */}
        {hasNameServers && (
          <div className="flex">
            <span className="w-24 text-gray-500 shrink-0">{language === 'zh' ? '域名服务器' : 'NS'}</span>
            <div className="flex flex-col gap-1">
              {data.nameServers.slice(0, 2).map((ns, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded border border-gray-200"
                >
                  <span className="text-gray-400">📋</span>
                  {ns.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* DNSSEC */}
        <div className="flex">
          <span className="w-24 text-gray-500 shrink-0">DNSSEC</span>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{data.dnssec ? 'signed' : 'unsigned'}</span>
            <span className="text-gray-400 cursor-help" title="DNSSEC Status">❓</span>
          </div>
        </div>
      </div>

      {/* Footer with branding */}
      <div className="mt-5 pt-3 border-t border-gray-200 flex items-center justify-center">
        <span className="text-xs text-gray-400">RDAP 域名查询 · rdap.lovable.app</span>
      </div>
    </div>
  );
});

ShareCard.displayName = 'ShareCard';

export default ShareCard;
