import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Info, Shield, Server, Copy, Check, ExternalLink, User, 
  Lock, Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import ShareDialog from './ShareDialog';
import DomainFavicon from './DomainFavicon';
import SpecialDomainBadge from './SpecialDomainBadge';

export interface WhoisData {
  domain: string;
  registrar: string;
  registrationDate: string;
  expirationDate: string;
  nameServers: string[];
  status: string[];
  statusTranslated?: string[];
  registrant?: {
    name?: string;
    organization?: string;
    country?: string;
    email?: string;
  };
  dnssec: boolean;
  lastUpdated: string;
  source: 'rdap' | 'whois';
  registrarWebsite?: string;
  registrarIanaId?: string;
  dnsProvider?: { name: string; website: string };
  privacyProtection?: boolean;
  ageLabel?: string;
  updateLabel?: string;
  remainingDays?: number;
  registrationDateFormatted?: string;
  expirationDateFormatted?: string;
  lastUpdatedFormatted?: string;
  rawData?: any;
}

export interface PricingData {
  registerPrice?: number | null;
  renewPrice?: number | null;
  isPremium?: boolean;
  registerPriceUsd?: number | null;
  renewPriceUsd?: number | null;
  cached?: boolean;
}

interface DomainResultCardProps {
  data: WhoisData;
  pricing?: PricingData | null;
}

const DomainResultCard = ({ data, pricing }: DomainResultCardProps) => {
  const [copiedNs, setCopiedNs] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const copyToClipboard = async (text: string, isJson = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isJson) {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
      } else {
        setCopiedNs(text);
        setTimeout(() => setCopiedNs(null), 2000);
      }
      toast({ description: t('misc.copySuccess') });
    } catch {
      toast({ description: t('misc.copyFailed'), variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getRemainingDaysColor = (days: number | undefined) => {
    if (days === undefined || days === null) return 'text-muted-foreground';
    if (days <= 30) return 'text-destructive';
    if (days <= 90) return 'text-warning';
    return 'text-success';
  };

  const getRemainingDaysText = (days: number) => {
    if (language === 'zh') {
      return `剩余${days}天`;
    }
    return `${days} days`;
  };

  const hasRegistrantInfo = data.registrant && 
    (data.registrant.name || data.registrant.organization || data.registrant.country || data.registrant.email);

  const displayStatus = data.statusTranslated || data.status;
  const rawJsonString = data.rawData ? JSON.stringify(data.rawData, null, 2) : '';
  
  // Check if dates are valid
  const hasRegistrationDate = data.registrationDate && data.registrationDate !== 'N/A';
  const hasExpirationDate = data.expirationDate && data.expirationDate !== 'N/A';
  const hasLastUpdated = data.lastUpdated && data.lastUpdated !== 'N/A';
  const hasRegistrar = data.registrar && data.registrar !== 'N/A' && data.registrar.trim() !== '';
  const hasNameServers = data.nameServers && data.nameServers.length > 0;

  return (
    <div className="space-y-4">
      {/* Price Tags Row */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {pricing?.registerPrice || pricing?.renewPrice ? (
            <>
              <span className="whitespace-nowrap">
                <span className="text-muted-foreground">{t('pricing.register')}:</span>
                <span className="font-medium text-primary ml-1">
                  {pricing?.registerPrice ? `¥${pricing.registerPrice}` : '-'}
                </span>
              </span>
              <span className="whitespace-nowrap">
                <span className="text-muted-foreground">{t('pricing.renew')}:</span>
                <span className="font-medium text-primary ml-1">
                  {pricing?.renewPrice ? `¥${pricing.renewPrice}` : '-'}
                </span>
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground/70">
              {language === 'zh' ? '价格获取失败！' : 'Price fetch failed!'}
            </span>
          )}
          {/* Always show premium status */}
          <span className="whitespace-nowrap">
            <span className="text-muted-foreground">{language === 'zh' ? '溢价' : 'Premium'}:</span>
            <span className={`font-medium ml-1 ${pricing?.isPremium ? 'text-warning' : 'text-muted-foreground'}`}>
              {pricing?.isPremium ? (language === 'zh' ? '是' : 'Yes') : (language === 'zh' ? '否' : 'No')}
            </span>
          </span>
          <Badge variant="default" className="text-xs">{t('pricing.registered')}</Badge>
        </div>
        
        {/* Data Source - only show RDAP/WHOIS without IANA ID */}
        <Badge variant="outline" className="shrink-0 gap-1.5 text-xs h-7 px-2.5">
          <Database className="h-3 w-3" />
          {data.source === 'rdap' ? 'RDAP' : 'WHOIS'}
        </Badge>
      </div>

      {/* Main Card */}
      <Card>
        <CardContent className="pt-5 pb-5">
          {/* Domain Name Header with Favicon and Special Badge */}
          <div className="mb-4 flex items-center gap-3">
            <DomainFavicon domain={data.domain} size="lg" />
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold uppercase tracking-wide">{data.domain}</h2>
              <SpecialDomainBadge domain={data.domain} />
            </div>
          </div>

          <Tabs defaultValue="standard" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4" />
                {t('domain.info')}
              </h3>
              <div className="flex items-center gap-2">
                <TabsList className="grid grid-cols-2 w-auto h-8">
                  <TabsTrigger value="standard" className="px-3 text-xs h-7">{t('domain.standard')}</TabsTrigger>
                  <TabsTrigger value="data" className="px-3 text-xs h-7">{t('domain.data')}</TabsTrigger>
                </TabsList>
                <ShareDialog data={data} pricing={pricing} />
              </div>
            </div>

            <TabsContent value="standard" className="space-y-0 mt-0">
              <div className="border rounded-lg overflow-hidden">
                {/* Registrar - always show if has data */}
                {hasRegistrar && (
                  <div className="flex border-b last:border-b-0">
                    <div className="w-28 shrink-0 px-3 py-2.5 bg-muted/30 text-xs text-muted-foreground flex items-center">
                      {t('domain.registrar')}
                    </div>
                    <div className="flex-1 px-3 py-2.5 flex items-center justify-between gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{data.registrar}</span>
                      {data.registrarWebsite && (
                        <Badge 
                          variant="outline" 
                          className="shrink-0 cursor-pointer hover:bg-accent gap-1 text-xs h-6"
                          onClick={() => window.open(data.registrarWebsite, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t('domain.website')}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Registration Date - only show if has valid data */}
                {hasRegistrationDate && (
                  <div className="flex border-b last:border-b-0">
                    <div className="w-28 shrink-0 px-3 py-2.5 bg-muted/30 text-xs text-muted-foreground flex items-center">
                      {t('domain.registrationDate')}
                    </div>
                    <div className="flex-1 px-3 py-2.5 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {data.registrationDateFormatted || formatDate(data.registrationDate)}
                      </span>
                      {data.ageLabel && (
                        <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20 shrink-0">
                          {data.ageLabel}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Updated - only show if has valid data */}
                {hasLastUpdated && (
                  <div className="flex border-b last:border-b-0">
                    <div className="w-28 shrink-0 px-3 py-2.5 bg-muted/30 text-xs text-muted-foreground flex items-center">
                      {t('domain.updateDate')}
                    </div>
                    <div className="flex-1 px-3 py-2.5 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {data.lastUpdatedFormatted || formatDate(data.lastUpdated)}
                      </span>
                      {data.updateLabel && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {data.updateLabel}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Expiration Date - only show if has valid data */}
                {hasExpirationDate && (
                  <div className="flex border-b last:border-b-0">
                    <div className="w-28 shrink-0 px-3 py-2.5 bg-muted/30 text-xs text-muted-foreground flex items-center">
                      {t('domain.expirationDate')}
                    </div>
                    <div className="flex-1 px-3 py-2.5 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {data.expirationDateFormatted || formatDate(data.expirationDate)}
                      </span>
                      {data.remainingDays !== undefined && data.remainingDays !== null && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs shrink-0 ${getRemainingDaysColor(data.remainingDays)}`}
                        >
                          {getRemainingDaysText(data.remainingDays)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Registrant Info - only show section if there's data or privacy protection */}
              {(hasRegistrantInfo || data.privacyProtection) && (
                <div className="mt-5">
                  <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
                    <User className="h-4 w-4" />
                    {t('registrant.title')}
                  </h4>
                  {hasRegistrantInfo && !data.privacyProtection ? (
                    <div className="border rounded-lg overflow-hidden">
                      {data.registrant?.name && (
                        <div className="flex border-b last:border-b-0">
                          <div className="w-28 shrink-0 px-3 py-2 bg-muted/30 text-xs text-muted-foreground">{t('registrant.name')}</div>
                          <div className="flex-1 px-3 py-2 text-sm">{data.registrant.name}</div>
                        </div>
                      )}
                      {data.registrant?.organization && (
                        <div className="flex border-b last:border-b-0">
                          <div className="w-28 shrink-0 px-3 py-2 bg-muted/30 text-xs text-muted-foreground">{t('registrant.organization')}</div>
                          <div className="flex-1 px-3 py-2 text-sm">{data.registrant.organization}</div>
                        </div>
                      )}
                      {data.registrant?.country && (
                        <div className="flex border-b last:border-b-0">
                          <div className="w-28 shrink-0 px-3 py-2 bg-muted/30 text-xs text-muted-foreground">{t('registrant.country')}</div>
                          <div className="flex-1 px-3 py-2 text-sm">{data.registrant.country}</div>
                        </div>
                      )}
                      {data.registrant?.email && (
                        <div className="flex border-b last:border-b-0">
                          <div className="w-28 shrink-0 px-3 py-2 bg-muted/30 text-xs text-muted-foreground">{t('registrant.email')}</div>
                          <div className="flex-1 px-3 py-2 text-sm">{data.registrant.email}</div>
                        </div>
                      )}
                    </div>
                  ) : data.privacyProtection ? (
                    <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-dashed">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/50">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {t('registrant.privacyProtected')}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          WHOIS Privacy Protection
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Domain Status */}
              {displayStatus.length > 0 && (
                <div className="mt-5">
                  <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Shield className="h-4 w-4" />
                    {t('status.title')}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {displayStatus.map((status, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* DNSSEC & Privacy - only show if there's meaningful data */}
              {(data.dnssec !== undefined || data.privacyProtection) && (
                <div className="mt-5 pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t('security.dnssec')}:</span>
                    <Badge variant={data.dnssec ? 'default' : 'secondary'} className="text-xs">
                      {data.dnssec ? t('security.enabled') : t('security.disabled')}
                    </Badge>
                  </div>
                  
                  {data.privacyProtection && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Lock className="h-4 w-4" />
                      <span>{t('security.privacyProtection')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Name Servers - only show if there are servers */}
              {hasNameServers && (
              <div className="mt-5 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <Server className="h-4 w-4" />
                    {t('dns.title')}
                  </h4>
                  {data.dnsProvider && (
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent gap-1 text-xs h-6"
                      onClick={() => window.open(data.dnsProvider?.website, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {data.dnsProvider.name}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  {data.nameServers.map((ns, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-lg bg-muted/20">
                      <span className="text-xs font-mono">NS{index + 1}: {ns.toUpperCase()}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 text-xs px-2"
                        onClick={() => copyToClipboard(ns)}
                      >
                        {copiedNs === ns ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {t('dns.copy')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </TabsContent>

            <TabsContent value="data" className="space-y-4 mt-0">
              {/* Raw Status Codes */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Info className="h-4 w-4" />
                  {t('status.raw')}
                </h4>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <div className="space-y-1">
                    {data.status.map((status, index) => (
                      <p key={index} className="text-xs font-mono text-muted-foreground">
                        {status}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Raw JSON Data */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <Database className="h-4 w-4" />
                    {t('status.rawJson')}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 gap-1 text-xs"
                    onClick={() => copyToClipboard(rawJsonString, true)}
                  >
                    {copiedJson ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {t('dns.copy')}
                  </Button>
                </div>
                <div className="border rounded-lg bg-muted/20 p-3 overflow-auto max-h-[350px]">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {rawJsonString || t('misc.noData')}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainResultCard;
