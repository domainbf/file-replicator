import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Info, Shield, Server, Copy, Check, ExternalLink, User, Globe, 
  Lock, Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  // Enhanced fields
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
      toast({ description: '已复制到剪贴板' });
    } catch {
      toast({ description: '复制失败', variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
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

  const hasRegistrantInfo = data.registrant && 
    (data.registrant.name || data.registrant.organization || data.registrant.country);

  // Use translated status if available, otherwise use original
  const displayStatus = data.statusTranslated || data.status;

  const rawJsonString = data.rawData ? JSON.stringify(data.rawData, null, 2) : '';

  return (
    <div className="space-y-4">
      {/* Price Tags Row: 注册: 续费: 溢价: 已注册 | 数据来源 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">注册:</span>
            <span className="font-medium text-primary">
              {pricing?.registerPrice ? `¥${pricing.registerPrice}` : '-'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">续费:</span>
            <span className="font-medium text-primary">
              {pricing?.renewPrice ? `¥${pricing.renewPrice}` : '-'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">溢价:</span>
            <span className="font-medium">{pricing?.isPremium ? '是' : '否'}</span>
          </div>
          <Badge variant="default" className="text-xs">已注册</Badge>
        </div>
        
        {/* Data Source - Clickable to show raw JSON */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Database className="h-3 w-3" />
              {data.source === 'rdap' ? 'RDAP' : 'WHOIS'}
              {data.registrarIanaId && (
                <span className="text-muted-foreground">#{data.registrarIanaId}</span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                原始数据
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>协议: </span>
                  <Badge variant={data.source === 'rdap' ? 'default' : 'secondary'}>
                    {data.source === 'rdap' ? 'RDAP' : 'WHOIS'}
                  </Badge>
                  {data.registrarIanaId && (
                    <>
                      <span>IANA ID: </span>
                      <span className="font-mono">{data.registrarIanaId}</span>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => copyToClipboard(rawJsonString, true)}
                >
                  {copiedJson ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  复制JSON
                </Button>
              </div>
              <div className="border rounded-lg bg-muted/30 p-4 overflow-auto max-h-[60vh]">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {rawJsonString || '暂无原始数据'}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Card */}
      <Card>
        <CardContent className="pt-6">
          {/* Domain Name Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold uppercase tracking-wide">{data.domain}</h2>
          </div>

          <Tabs defaultValue="standard" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-2 text-base font-medium">
                <Info className="h-4 w-4" />
                域名信息
              </h3>
              <TabsList className="grid grid-cols-2 w-auto">
                <TabsTrigger value="standard" className="px-4">标准</TabsTrigger>
                <TabsTrigger value="data" className="px-4">数据</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="standard" className="space-y-0 mt-0">
              <div className="border rounded-lg overflow-hidden">
                {/* Registrar */}
                <div className="flex border-b">
                  <div className="w-1/3 px-4 py-3 bg-muted/30 text-sm text-muted-foreground">
                    注册商
                  </div>
                  <div className="flex-1 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{data.registrar || 'N/A'}</span>
                    {data.registrarWebsite && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => window.open(data.registrarWebsite, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                        官网
                      </Button>
                    )}
                  </div>
                </div>

                {/* Registration Date */}
                <div className="flex border-b">
                  <div className="w-1/3 px-4 py-3 bg-muted/30 text-sm text-muted-foreground">
                    注册时间
                  </div>
                  <div className="flex-1 px-4 py-3 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {data.registrationDateFormatted || formatDate(data.registrationDate)}
                    </span>
                    {data.ageLabel && (
                      <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                        {data.ageLabel}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Last Updated */}
                <div className="flex border-b">
                  <div className="w-1/3 px-4 py-3 bg-muted/30 text-sm text-muted-foreground">
                    更新时间
                  </div>
                  <div className="flex-1 px-4 py-3 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {data.lastUpdatedFormatted || formatDate(data.lastUpdated)}
                    </span>
                    {data.updateLabel && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        {data.updateLabel}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expiration Date */}
                <div className="flex">
                  <div className="w-1/3 px-4 py-3 bg-muted/30 text-sm text-muted-foreground">
                    过期时间
                  </div>
                  <div className="flex-1 px-4 py-3 flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {data.expirationDateFormatted || formatDate(data.expirationDate)}
                    </span>
                    {data.remainingDays !== undefined && data.remainingDays !== null && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getRemainingDaysColor(data.remainingDays)}`}
                      >
                        剩余{data.remainingDays}天
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Registrant Info - Now on Standard tab */}
              <div className="mt-6">
                <h4 className="flex items-center gap-2 text-sm font-medium mb-3">
                  <User className="h-4 w-4" />
                  注册人信息
                </h4>
                {hasRegistrantInfo && !data.privacyProtection ? (
                  <div className="border rounded-lg overflow-hidden">
                    {data.registrant?.name && (
                      <div className="flex border-b last:border-b-0">
                        <div className="w-1/3 px-4 py-2 bg-muted/30 text-sm text-muted-foreground">姓名</div>
                        <div className="flex-1 px-4 py-2 text-sm">{data.registrant.name}</div>
                      </div>
                    )}
                    {data.registrant?.organization && (
                      <div className="flex border-b last:border-b-0">
                        <div className="w-1/3 px-4 py-2 bg-muted/30 text-sm text-muted-foreground">组织</div>
                        <div className="flex-1 px-4 py-2 text-sm">{data.registrant.organization}</div>
                      </div>
                    )}
                    {data.registrant?.country && (
                      <div className="flex border-b last:border-b-0">
                        <div className="w-1/3 px-4 py-2 bg-muted/30 text-sm text-muted-foreground">国家</div>
                        <div className="flex-1 px-4 py-2 text-sm">{data.registrant.country}</div>
                      </div>
                    )}
                    {data.registrant?.email && (
                      <div className="flex">
                        <div className="w-1/3 px-4 py-2 bg-muted/30 text-sm text-muted-foreground">邮箱</div>
                        <div className="flex-1 px-4 py-2 text-sm">{data.registrant.email}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {data.privacyProtection 
                        ? '注册人信息已启用隐私保护'
                        : '注册人信息不可用'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Domain Status */}
              {displayStatus.length > 0 && (
                <div className="mt-6">
                  <h4 className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Shield className="h-4 w-4" />
                    域名状态
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {displayStatus.map((status, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* DNSSEC & Privacy */}
              <div className="mt-6 pt-4 border-t space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">DNSSEC:</span>
                  <Badge variant={data.dnssec ? 'default' : 'secondary'} className="text-xs">
                    {data.dnssec ? '已启用' : '未启用'}
                  </Badge>
                </div>
                
                {data.privacyProtection && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Lock className="h-4 w-4" />
                    <span>WHOIS隐私保护已启用</span>
                  </div>
                )}
              </div>

              {/* Name Servers */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <Server className="h-4 w-4" />
                    域名服务器
                  </h4>
                  {data.dnsProvider && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={() => window.open(data.dnsProvider?.website, '_blank')}
                    >
                      {data.dnsProvider.name}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {data.nameServers.length > 0 ? (
                  <div className="space-y-2">
                    {data.nameServers.map((ns, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-lg bg-muted/20">
                        <span className="text-sm font-mono">NS{index + 1}: {ns.toUpperCase()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => copyToClipboard(ns)}
                        >
                          {copiedNs === ns ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          复制
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无域名服务器信息</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-4 mt-0">
              {/* Raw Status Codes */}
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Info className="h-4 w-4" />
                  原始状态码
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
                <div className="flex items-center justify-between mb-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <Database className="h-4 w-4" />
                    原始JSON数据
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => copyToClipboard(rawJsonString, true)}
                  >
                    {copiedJson ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    复制
                  </Button>
                </div>
                <div className="border rounded-lg bg-muted/20 p-4 overflow-auto max-h-[400px]">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {rawJsonString || '暂无原始数据'}
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
