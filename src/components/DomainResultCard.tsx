import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Shield, Server, Copy, Check, ExternalLink, User, Clock, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface WhoisData {
  domain: string;
  registrar: string;
  registrationDate: string;
  expirationDate: string;
  nameServers: string[];
  status: string[];
  registrant?: {
    name?: string;
    organization?: string;
    country?: string;
    email?: string;
  };
  dnssec: boolean;
  lastUpdated: string;
  source: 'rdap' | 'whois';
}

interface DomainResultCardProps {
  data: WhoisData;
}

const DomainResultCard = ({ data }: DomainResultCardProps) => {
  const [copiedNs, setCopiedNs] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNs(text);
      toast({ description: '已复制到剪贴板' });
      setTimeout(() => setCopiedNs(null), 2000);
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

  const hasRegistrantInfo = data.registrant && 
    (data.registrant.name || data.registrant.organization || data.registrant.country);

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              基本信息
            </TabsTrigger>
            <TabsTrigger value="dns" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              DNS
            </TabsTrigger>
            <TabsTrigger value="registrant" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              注册人
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {data.domain}
              </h3>
              <Badge variant={data.source === 'rdap' ? 'default' : 'secondary'}>
                {data.source === 'rdap' ? 'RDAP' : 'WHOIS'}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="info-row">
                <span className="info-row-label">注册商</span>
                <span className="info-row-value">{data.registrar || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">注册日期</span>
                <span className="info-row-value">{formatDate(data.registrationDate)}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">到期日期</span>
                <span className="info-row-value">{formatDate(data.expirationDate)}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">最后更新</span>
                <span className="info-row-value">{formatDate(data.lastUpdated)}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">DNSSEC</span>
                <span className="info-row-value">
                  <Badge variant={data.dnssec ? 'default' : 'secondary'}>
                    {data.dnssec ? '已启用' : '未启用'}
                  </Badge>
                </span>
              </div>
            </div>

            {data.status.length > 0 && (
              <div className="space-y-2">
                <h4 className="section-title">
                  <Shield className="h-4 w-4" />
                  域名状态
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.status.map((status, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="dns" className="space-y-4">
            <h4 className="section-title">
              <Server className="h-4 w-4" />
              域名服务器
            </h4>
            {data.nameServers.length > 0 ? (
              <div className="space-y-2">
                {data.nameServers.map((ns, index) => (
                  <div key={index} className="ns-row">
                    <span className="text-sm font-mono">{ns}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(ns)}
                    >
                      {copiedNs === ns ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无域名服务器信息</p>
            )}
          </TabsContent>

          <TabsContent value="registrant" className="space-y-4">
            <h4 className="section-title">
              <User className="h-4 w-4" />
              注册人信息
            </h4>
            {hasRegistrantInfo ? (
              <div className="space-y-3">
                {data.registrant?.name && (
                  <div className="info-row">
                    <span className="info-row-label">姓名</span>
                    <span className="info-row-value">{data.registrant.name}</span>
                  </div>
                )}
                {data.registrant?.organization && (
                  <div className="info-row">
                    <span className="info-row-label">组织</span>
                    <span className="info-row-value">{data.registrant.organization}</span>
                  </div>
                )}
                {data.registrant?.country && (
                  <div className="info-row">
                    <span className="info-row-label">国家</span>
                    <span className="info-row-value">{data.registrant.country}</span>
                  </div>
                )}
                {data.registrant?.email && (
                  <div className="info-row">
                    <span className="info-row-label">邮箱</span>
                    <span className="info-row-value">{data.registrant.email}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  注册人信息已启用隐私保护或不可用
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DomainResultCard;
