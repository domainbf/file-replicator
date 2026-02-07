import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== 完整的域名状态码映射 ====================
const STATUS_CODE_MAP: Record<string, string> = {
  // ICANN通用核心状态码
  'ok': '正常',
  'active': '正常',
  'registered': '已注册',
  'connect': '已连接',
  'connected': '已连接',
  
  // Hold状态
  'clienthold': '客户端暂停',
  'client hold': '客户端暂停',
  'serverhold': '注册局暂停',
  'server hold': '注册局暂停',
  'hold': '暂停',
  'inactive': '未激活',
  'suspended': '已暂停',
  
  // Delete禁止
  'clientdeleteprohibited': '客户端删除禁止',
  'client delete prohibited': '客户端删除禁止',
  'serverdeleteprohibited': '注册局删除禁止',
  'server delete prohibited': '注册局删除禁止',
  'deleteprohibited': '禁止删除',
  
  // Transfer禁止
  'clienttransferprohibited': '客户端转移禁止',
  'client transfer prohibited': '客户端转移禁止',
  'servertransferprohibited': '注册局转移禁止',
  'server transfer prohibited': '注册局转移禁止',
  'transferprohibited': '禁止转移',
  'registrarlock': '注册商锁定',
  'registrylock': '注册局锁定',
  'locked': '已锁定',
  
  // Renew禁止
  'clientrenewprohibited': '客户端续费禁止',
  'client renew prohibited': '客户端续费禁止',
  'serverrenewprohibited': '注册局续费禁止',
  'server renew prohibited': '注册局续费禁止',
  'renewprohibited': '禁止续费',
  
  // Update禁止
  'clientupdateprohibited': '客户端更新禁止',
  'client update prohibited': '客户端更新禁止',
  'serverupdateprohibited': '注册局更新禁止',
  'server update prohibited': '注册局更新禁止',
  'updateprohibited': '禁止修改',
  
  // 续费/过期相关
  'autorenewperiod': '自动续费期',
  'redemptionperiod': '赎回期',
  'pendingrestore': '待恢复',
  'pendingdelete': '待删除',
  'graceperiod': '宽限期',
  'addperiod': '注册宽限期',
  'renewperiod': '续费宽限期',
  'transferperiod': '转移宽限期',
  'expired': '已过期',
  
  // 转移相关
  'pendingtransfer': '转移中',
  'pendingverification': '待验证',
  'pendingupdate': '修改中',
  
  // 隐私保护
  'privacy': '隐私保护',
  'redacted': '信息隐藏',
};

// 注册商官网映射 (扩展版)
const REGISTRAR_WEBSITES: Record<string, string> = {
  // 全球主流注册商
  'godaddy': 'https://www.godaddy.com',
  'namecheap': 'https://www.namecheap.com',
  'cloudflare': 'https://www.cloudflare.com',
  'google': 'https://domains.google',
  'squarespace': 'https://domains.squarespace.com',
  'dynadot': 'https://www.dynadot.com',
  'name.com': 'https://www.name.com',
  'porkbun': 'https://porkbun.com',
  'gandi': 'https://www.gandi.net',
  'hover': 'https://www.hover.com',
  'tucows': 'https://opensrs.com',
  'epik': 'https://www.epik.com',
  'sav': 'https://www.sav.com',
  'namesilo': 'https://www.namesilo.com',
  'networksolutions': 'https://www.networksolutions.com',
  'network solutions': 'https://www.networksolutions.com',
  'register.com': 'https://www.register.com',
  'ionos': 'https://www.ionos.com',
  '1&1': 'https://www.ionos.com',
  'bluehost': 'https://www.bluehost.com',
  'hostgator': 'https://www.hostgator.com',
  'dreamhost': 'https://www.dreamhost.com',
  'markmonitor': 'https://www.markmonitor.com',
  'csc': 'https://www.cscglobal.com',
  'safenames': 'https://www.safenames.net',
  'enom': 'https://www.enom.com',
  'moniker': 'https://www.moniker.com',
  'uniregistry': 'https://uniregistry.com',
  'key-systems': 'https://www.key-systems.net',
  'realtime register': 'https://www.realtimeregister.com',
  'internetbs': 'https://internetbs.net',
  'internet.bs': 'https://internetbs.net',
  'openprovider': 'https://www.openprovider.com',
  'ascio': 'https://www.ascio.com',
  'automattic': 'https://wordpress.com/domains',
  'wordpress': 'https://wordpress.com/domains',
  // 中国注册商
  'alibaba': 'https://wanwang.aliyun.com',
  'aliyun': 'https://wanwang.aliyun.com',
  '阿里云': 'https://wanwang.aliyun.com',
  'west.cn': 'https://www.west.cn',
  '西部数码': 'https://www.west.cn',
  'xinnet': 'https://www.xinnet.com',
  '新网': 'https://www.xinnet.com',
  'ename': 'https://www.ename.com',
  '易名': 'https://www.ename.com',
  'dnspod': 'https://dnspod.cloud.tencent.com',
  'tencent': 'https://cloud.tencent.com/product/domain',
  '腾讯云': 'https://cloud.tencent.com/product/domain',
  'huawei': 'https://www.huaweicloud.com/product/domain.html',
  '华为云': 'https://www.huaweicloud.com/product/domain.html',
  'now.cn': 'https://www.now.cn',
  '时代互联': 'https://www.now.cn',
  'net.cn': 'https://www.net.cn',
  'cnnic': 'https://www.cnnic.cn',
  'cndns': 'https://www.cndns.com',
  'dns.com': 'https://www.dns.com',
  'bizcn': 'https://www.bizcn.com',
  'oray': 'https://domain.oray.com',
  '花生壳': 'https://domain.oray.com',
  '22.cn': 'https://www.22.cn',
  '爱名网': 'https://www.22.cn',
  // 其他地区注册商
  'ovh': 'https://www.ovhcloud.com',
  'ionos.de': 'https://www.ionos.de',
  'strato': 'https://www.strato.de',
  'united-domains': 'https://www.united-domains.de',
  'sedo': 'https://sedo.com',
  'afternic': 'https://www.afternic.com',
  'dan': 'https://dan.com',
  'verisign': 'https://www.verisign.com',
};

// DNS服务商映射 (扩展版 - 包含更多中国服务商)
const DNS_PROVIDERS: Record<string, { name: string; website: string }> = {
  // 全球CDN/DNS提供商
  'cloudflare': { name: 'Cloudflare', website: 'https://www.cloudflare.com' },
  'awsdns': { name: 'AWS Route 53', website: 'https://aws.amazon.com/route53' },
  'amazonaws': { name: 'AWS Route 53', website: 'https://aws.amazon.com/route53' },
  'azure-dns': { name: 'Azure DNS', website: 'https://azure.microsoft.com/services/dns' },
  'azure': { name: 'Azure DNS', website: 'https://azure.microsoft.com/services/dns' },
  'googledomains': { name: 'Google Cloud DNS', website: 'https://cloud.google.com/dns' },
  'google': { name: 'Google DNS', website: 'https://domains.google' },
  'nsone': { name: 'NS1', website: 'https://ns1.com' },
  'dyn': { name: 'Oracle Dyn', website: 'https://www.oracle.com/cloud/networking/dns' },
  'ultradns': { name: 'UltraDNS', website: 'https://www.ultradns.com' },
  'akamai': { name: 'Akamai', website: 'https://www.akamai.com' },
  'fastly': { name: 'Fastly', website: 'https://www.fastly.com' },
  // 注册商DNS
  'godaddy': { name: 'GoDaddy DNS', website: 'https://www.godaddy.com' },
  'domaincontrol': { name: 'GoDaddy DNS', website: 'https://www.godaddy.com' },
  'namecheap': { name: 'Namecheap DNS', website: 'https://www.namecheap.com' },
  'registrar-servers': { name: 'Namecheap DNS', website: 'https://www.namecheap.com' },
  'worldnic': { name: 'Network Solutions', website: 'https://www.networksolutions.com' },
  'name.com': { name: 'Name.com DNS', website: 'https://www.name.com' },
  'porkbun': { name: 'Porkbun DNS', website: 'https://porkbun.com' },
  'namesilo': { name: 'NameSilo DNS', website: 'https://www.namesilo.com' },
  'squarespace': { name: 'Squarespace DNS', website: 'https://domains.squarespace.com' },
  'hover': { name: 'Hover DNS', website: 'https://www.hover.com' },
  // ==================== 中国DNS提供商 (扩展) ====================
  // 阿里云/万网
  'dnspod': { name: 'DNSPod', website: 'https://www.dnspod.cn' },
  'alidns': { name: '阿里云DNS', website: 'https://www.aliyun.com/product/dns' },
  'hichina': { name: '万网DNS', website: 'https://wanwang.aliyun.com' },
  'aliyun': { name: '阿里云DNS', website: 'https://www.aliyun.com/product/dns' },
  'taobao': { name: '阿里云DNS', website: 'https://www.aliyun.com/product/dns' },
  // 腾讯云
  'tencentdns': { name: '腾讯云DNS', website: 'https://cloud.tencent.com/product/dns' },
  'tencent': { name: '腾讯云DNS', website: 'https://cloud.tencent.com/product/dns' },
  'qq.com': { name: '腾讯云DNS', website: 'https://cloud.tencent.com/product/dns' },
  // 华为云
  'huaweicloud': { name: '华为云DNS', website: 'https://www.huaweicloud.com/product/dns.html' },
  'hwclouds': { name: '华为云DNS', website: 'https://www.huaweicloud.com/product/dns.html' },
  // 百度
  'baidubce': { name: '百度云DNS', website: 'https://cloud.baidu.com/product/dns.html' },
  'baidu': { name: '百度DNS', website: 'https://www.baidu.com' },
  'bdstatic': { name: '百度DNS', website: 'https://www.baidu.com' },
  // 易名中国
  'ename': { name: '易名中国', website: 'https://www.ename.com' },
  'ename.com': { name: '易名中国', website: 'https://www.ename.com' },
  'enamedns': { name: '易名中国', website: 'https://www.ename.com' },
  // 爱名网 22.cn
  '22.cn': { name: '爱名网', website: 'https://www.22.cn' },
  '22cn': { name: '爱名网', website: 'https://www.22.cn' },
  'dns22': { name: '爱名网', website: 'https://www.22.cn' },
  // 西部数码
  'west': { name: '西部数码', website: 'https://www.west.cn' },
  'west.cn': { name: '西部数码', website: 'https://www.west.cn' },
  'myhostadmin': { name: '西部数码', website: 'https://www.west.cn' },
  // 新网
  'xinnet': { name: '新网', website: 'https://www.xinnet.com' },
  'xinnetdns': { name: '新网', website: 'https://www.xinnet.com' },
  // DNS.COM
  'dnsv': { name: 'DNS.COM', website: 'https://www.dns.com' },
  'dns.com': { name: 'DNS.COM', website: 'https://www.dns.com' },
  'iidns': { name: 'DNS.COM', website: 'https://www.dns.com' },
  // 时代互联
  'now.cn': { name: '时代互联', website: 'https://www.now.cn' },
  'nowcn': { name: '时代互联', website: 'https://www.now.cn' },
  // 中国互联网络信息中心
  'cnnic': { name: 'CNNIC', website: 'https://www.cnnic.cn' },
  // 商务中国
  'bizcn': { name: '商务中国', website: 'https://www.bizcn.com' },
  // 中资源
  'zzy.cn': { name: '中资源', website: 'https://www.zzy.cn' },
  // 纳点
  'idc1': { name: '纳点网络', website: 'https://www.idc1.com' },
  // 美橙互联
  'cndns': { name: '美橙互联', website: 'https://www.cndns.com' },
  // 花生壳
  'oray': { name: '花生壳', website: 'https://domain.oray.com' },
  // 字节跳动
  'bytedance': { name: '字节跳动', website: 'https://www.volcengine.com' },
  'volcengine': { name: '火山引擎', website: 'https://www.volcengine.com' },
  // 京东云
  'jdcloud': { name: '京东云', website: 'https://www.jdcloud.com' },
  'jd.com': { name: '京东云', website: 'https://www.jdcloud.com' },
  // 网易
  'netease': { name: '网易', website: 'https://www.163.com' },
  '163.com': { name: '网易', website: 'https://www.163.com' },
  // 金山云
  'ksyun': { name: '金山云', website: 'https://www.ksyun.com' },
  // 七牛云
  'qiniu': { name: '七牛云', website: 'https://www.qiniu.com' },
  // UCloud
  'ucloud': { name: 'UCloud', website: 'https://www.ucloud.cn' },
  // CloudXNS
  'cloudxns': { name: 'CloudXNS', website: 'https://www.cloudxns.net' },
  // ==================== 其他国际提供商 ====================
  'he.net': { name: 'Hurricane Electric', website: 'https://dns.he.net' },
  'easydns': { name: 'easyDNS', website: 'https://easydns.com' },
  'constellix': { name: 'Constellix', website: 'https://constellix.com' },
  'digitalocean': { name: 'DigitalOcean DNS', website: 'https://www.digitalocean.com' },
  'linode': { name: 'Linode DNS', website: 'https://www.linode.com' },
  'vultr': { name: 'Vultr DNS', website: 'https://www.vultr.com' },
  'vercel': { name: 'Vercel DNS', website: 'https://vercel.com' },
  'netlify': { name: 'Netlify DNS', website: 'https://www.netlify.com' },
  'hostinger': { name: 'Hostinger', website: 'https://www.hostinger.com' },
  'dreamhost': { name: 'DreamHost', website: 'https://www.dreamhost.com' },
  'bluehost': { name: 'Bluehost', website: 'https://www.bluehost.com' },
  'siteground': { name: 'SiteGround', website: 'https://www.siteground.com' },
  'hostgator': { name: 'HostGator', website: 'https://www.hostgator.com' },
  'ovh': { name: 'OVH', website: 'https://www.ovhcloud.com' },
  'hetzner': { name: 'Hetzner', website: 'https://www.hetzner.com' },
  'scaleway': { name: 'Scaleway', website: 'https://www.scaleway.com' },
};

// RDAP Bootstrap URL
const RDAP_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';

// Cache for RDAP bootstrap data
let rdapBootstrapCache: Record<string, string> | null = null;
let bootstrapCacheTime = 0;
const CACHE_TTL = 3600000;

interface RdapEntity {
  objectClassName?: string;
  roles?: string[];
  vcardArray?: any[];
  entities?: RdapEntity[];
  publicIds?: Array<{ type: string; identifier: string }>;
}

interface RdapResponse {
  objectClassName?: string;
  ldhName?: string;
  unicodeName?: string;
  status?: string[];
  events?: Array<{ eventAction: string; eventDate: string }>;
  entities?: RdapEntity[];
  nameservers?: Array<{ ldhName: string; unicodeName?: string }>;
  secureDNS?: { delegationSigned?: boolean };
  links?: Array<{ rel: string; href: string }>;
}

// 翻译域名状态
function translateStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/[_\-\s]+/g, '').trim();
  
  if (STATUS_CODE_MAP[normalized]) {
    return STATUS_CODE_MAP[normalized];
  }
  
  const lowerStatus = status.toLowerCase().trim();
  if (STATUS_CODE_MAP[lowerStatus]) {
    return STATUS_CODE_MAP[lowerStatus];
  }
  
  // 处理带URL的状态
  const statusWithoutUrl = status.replace(/https?:\/\/[^\s]*/gi, '').trim();
  const normalizedWithoutUrl = statusWithoutUrl.toLowerCase().replace(/[_\-\s]+/g, '');
  if (STATUS_CODE_MAP[normalizedWithoutUrl]) {
    return STATUS_CODE_MAP[normalizedWithoutUrl];
  }
  
  // 模糊匹配关键词
  const keywords: Record<string, string> = {
    'prohibited': '禁止',
    'hold': '暂停',
    'lock': '锁定',
    'pending': '待处理',
    'transfer': '转移',
    'delete': '删除',
    'update': '修改',
    'renew': '续费',
    'active': '正常',
    'redemption': '赎回期',
    'expired': '已过期',
    'suspended': '已暂停',
  };
  
  for (const [key, value] of Object.entries(keywords)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  return status;
}

// 获取注册商官网
function getRegistrarWebsite(registrar: string): string | null {
  if (!registrar) return null;
  
  const lowerRegistrar = registrar.toLowerCase();
  
  for (const [key, url] of Object.entries(REGISTRAR_WEBSITES)) {
    if (lowerRegistrar.includes(key)) {
      return url;
    }
  }
  
  return null;
}

// 识别DNS服务商
function identifyDnsProvider(nameservers: string[]): { name: string; website: string } | null {
  if (!nameservers || nameservers.length === 0) return null;
  
  const nsLower = nameservers.map(ns => ns.toLowerCase()).join(' ');
  
  for (const [key, provider] of Object.entries(DNS_PROVIDERS)) {
    if (nsLower.includes(key)) {
      return provider;
    }
  }
  
  return null;
}

// 检测WHOIS隐私保护
function detectPrivacyProtection(registrant: any, whoisText?: string): boolean {
  if (!registrant) return false;
  
  const privacyKeywords = [
    'privacy', 'protected', 'redacted', 'whoisguard', 'withheld',
    'proxy', 'private', 'domains by proxy', 'contact privacy',
    'identity protection', 'perfect privacy', 'whois privacy',
  ];
  
  const checkValue = (value: string | undefined): boolean => {
    if (!value) return false;
    const lower = value.toLowerCase();
    return privacyKeywords.some(kw => lower.includes(kw));
  };
  
  return checkValue(registrant.name) || 
         checkValue(registrant.organization) || 
         checkValue(registrant.email);
}

// 格式化日期为中文格式
function formatDateChinese(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A') return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}年${month}月${day}日`;
  } catch {
    return dateStr;
  }
}

// 计算域名年龄标签
function getAgeLabel(registrationDate: string): string | null {
  if (!registrationDate) return null;
  
  try {
    const regDate = new Date(registrationDate);
    if (isNaN(regDate.getTime())) return null;
    
    const now = new Date();
    const years = Math.floor((now.getTime() - regDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    if (years >= 30) return '创世古董';
    if (years >= 20) return '古董域名';
    if (years >= 15) return '老域名';
    if (years >= 10) return '成熟域名';
    if (years >= 5) return '中龄域名';
    if (years >= 1) return '新域名';
    return '新注册';
  } catch {
    return null;
  }
}

// 计算更新时间标签
function getUpdateLabel(status: string[]): string | null {
  if (!status || status.length === 0) return null;
  
  const hasAllLocks = status.some(s => {
    const lower = s.toLowerCase();
    return lower.includes('clientdeleteprohibited') || lower.includes('client delete prohibited');
  }) && status.some(s => {
    const lower = s.toLowerCase();
    return lower.includes('clienttransferprohibited') || lower.includes('client transfer prohibited');
  }) && status.some(s => {
    const lower = s.toLowerCase();
    return lower.includes('clientupdateprohibited') || lower.includes('client update prohibited');
  });
  
  if (hasAllLocks) return '全功能高密锁定';
  
  const hasTransferLock = status.some(s => {
    const lower = s.toLowerCase();
    return lower.includes('transferprohibited') || lower.includes('transfer prohibited');
  });
  
  if (hasTransferLock) return '转移锁定';
  
  return null;
}

// 计算剩余天数
function getRemainingDays(expirationDate: string): number | null {
  if (!expirationDate) return null;
  
  try {
    const expDate = new Date(expirationDate);
    if (isNaN(expDate.getTime())) return null;
    
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch {
    return null;
  }
}

async function getRdapBootstrap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (rdapBootstrapCache && (now - bootstrapCacheTime) < CACHE_TTL) {
    return rdapBootstrapCache;
  }

  try {
    console.log('Fetching RDAP bootstrap data...');
    const response = await fetch(RDAP_BOOTSTRAP_URL);
    const data = await response.json();
    
    const tldToServer: Record<string, string> = {};
    
    if (data.services) {
      for (const service of data.services) {
        const tlds = service[0];
        const servers = service[1];
        if (servers && servers.length > 0) {
          for (const tld of tlds) {
            tldToServer[tld.toLowerCase()] = servers[0];
          }
        }
      }
    }
    
    rdapBootstrapCache = tldToServer;
    bootstrapCacheTime = now;
    console.log(`Loaded ${Object.keys(tldToServer).length} TLD mappings`);
    return tldToServer;
  } catch (error) {
    console.error('Failed to fetch RDAP bootstrap:', error);
    return rdapBootstrapCache || {};
  }
}

function getTld(domain: string): string {
  const parts = domain.split('.');
  return parts[parts.length - 1].toLowerCase();
}

function parseVcard(vcardArray: any[]): Record<string, string> {
  const result: Record<string, string> = {};
  if (!vcardArray || vcardArray.length < 2) return result;
  
  const properties = vcardArray[1];
  for (const prop of properties) {
    const name = prop[0];
    const value = prop[3];
    
    if (name === 'fn' && value) {
      result.name = value;
    } else if (name === 'org' && value) {
      result.organization = Array.isArray(value) ? value[0] : value;
    } else if (name === 'email' && value) {
      result.email = value;
    } else if (name === 'tel' && value) {
      result.phone = value;
    } else if (name === 'adr' && Array.isArray(value)) {
      if (value[3]) result.city = value[3];
      if (value[4]) result.state = value[4];
      if (value[6]) result.country = value[6];
    }
  }
  
  return result;
}

function findRegistrant(entities: RdapEntity[]): Record<string, string> {
  for (const entity of entities) {
    if (entity.roles?.includes('registrant') && entity.vcardArray) {
      return parseVcard(entity.vcardArray);
    }
    if (entity.entities) {
      const nested = findRegistrant(entity.entities);
      if (Object.keys(nested).length > 0) return nested;
    }
  }
  return {};
}

function findRegistrar(entities: RdapEntity[]): { name: string; ianaId?: string } {
  for (const entity of entities) {
    if (entity.roles?.includes('registrar')) {
      let name = '';
      if (entity.vcardArray) {
        const vcard = parseVcard(entity.vcardArray);
        name = vcard.name || vcard.organization || '';
      }
      
      const ianaId = entity.publicIds?.find(p => p.type === 'IANA Registrar ID')?.identifier;
      
      return { name, ianaId };
    }
    if (entity.entities) {
      const nested = findRegistrar(entity.entities);
      if (nested.name) return nested;
    }
  }
  return { name: '' };
}

async function queryRdap(domain: string): Promise<any> {
  const tld = getTld(domain);
  const bootstrap = await getRdapBootstrap();
  
  let rdapServer = bootstrap[tld];
  
  if (!rdapServer) {
    const commonServers = [
      'https://rdap.verisign.com/com/v1/',
      'https://rdap.org/',
    ];
    
    for (const server of commonServers) {
      try {
        const url = `${server}domain/${domain}`;
        console.log(`Trying fallback RDAP server: ${url}`);
        const response = await fetch(url, {
          headers: { 'Accept': 'application/rdap+json' }
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error(`unsupported_tld: No RDAP server found for .${tld}`);
  }
  
  const url = `${rdapServer}domain/${domain}`;
  console.log(`Querying RDAP: ${url}`);
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/rdap+json' }
  });
  
  if (response.status === 404) {
    throw new Error('domain_not_found');
  }
  
  if (!response.ok) {
    throw new Error(`RDAP query failed: ${response.status}`);
  }
  
  return await response.json();
}

function parseRdapResponse(data: RdapResponse, rawRdap: any): any {
  const result: any = {
    domain: data.ldhName || data.unicodeName || '',
    status: data.status || [],
    nameServers: (data.nameservers || []).map(ns => ns.ldhName || ns.unicodeName).filter(Boolean),
    dnssec: data.secureDNS?.delegationSigned || false,
    source: 'rdap',
    rawData: rawRdap, // Include raw RDAP data
  };
  
  // Parse events
  if (data.events) {
    for (const event of data.events) {
      if (event.eventAction === 'registration') {
        result.registrationDate = event.eventDate;
      } else if (event.eventAction === 'expiration') {
        result.expirationDate = event.eventDate;
      } else if (event.eventAction === 'last changed' || event.eventAction === 'last update of RDAP database') {
        result.lastUpdated = event.eventDate;
      }
    }
  }
  
  // Parse entities
  if (data.entities) {
    const registrarInfo = findRegistrar(data.entities);
    result.registrar = registrarInfo.name;
    result.registrarIanaId = registrarInfo.ianaId;
    result.registrant = findRegistrant(data.entities);
  }
  
  // Translate status codes
  result.statusTranslated = result.status.map((s: string) => translateStatus(s));
  
  // Get registrar website
  result.registrarWebsite = getRegistrarWebsite(result.registrar);
  
  // Identify DNS provider
  result.dnsProvider = identifyDnsProvider(result.nameServers);
  
  // Detect privacy protection
  result.privacyProtection = detectPrivacyProtection(result.registrant);
  
  // Calculate age label
  result.ageLabel = getAgeLabel(result.registrationDate);
  
  // Calculate update label
  result.updateLabel = getUpdateLabel(result.status);
  
  // Calculate remaining days
  result.remainingDays = getRemainingDays(result.expirationDate);
  
  // Format dates
  result.registrationDateFormatted = formatDateChinese(result.registrationDate);
  result.expirationDateFormatted = formatDateChinese(result.expirationDate);
  result.lastUpdatedFormatted = formatDateChinese(result.lastUpdated);
  
  return result;
}

// Query pricing API from api.tian.hu
// API returns: { code: 200, message: "...", data: { premium, register, renew, register_usd, renew_usd, cached } }
async function queryPricing(domain: string): Promise<any> {
  const url = `https://api.tian.hu/pricing/${encodeURIComponent(domain)}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    console.log(`Querying pricing API: ${url}`);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DomainLookup/1.0',
        'lang': 'zh'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const responseData = await response.json();
      console.log('Pricing API response:', JSON.stringify(responseData));
      
      // API returns: { code: 200, data: { premium, register, renew, ... } }
      const data = responseData.data;
      if (!data) {
        console.log('Pricing API: No data field in response');
        return null;
      }
      
      // premium can be string "true"/"false" or boolean
      const isPremium = data.premium === true || data.premium === 'true';
      
      return {
        registerPrice: data.register ? Number(data.register) : null,
        renewPrice: data.renew ? Number(data.renew) : null,
        isPremium: isPremium,
        registerPriceUsd: data.register_usd ? Number(data.register_usd) : null,
        renewPriceUsd: data.renew_usd ? Number(data.renew_usd) : null,
        cached: data.cached || false,
      };
    } else {
      console.log(`Pricing API returned ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log('Pricing API failed:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();
    
    if (!domain) {
      return new Response(
        JSON.stringify({ error: '请输入域名' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const normalizedDomain = domain.toLowerCase().trim();
    
    const domainRegex = /^[a-zA-Z0-9\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5-]{0,61}[a-zA-Z0-9\u4e00-\u9fa5]?\.[a-zA-Z\u4e00-\u9fa5]{2,}$/;
    if (!domainRegex.test(normalizedDomain)) {
      return new Response(
        JSON.stringify({ error: '域名格式无效' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Looking up domain: ${normalizedDomain}`);
    
    // Query RDAP and pricing in parallel
    const [rdapResult, pricingResult] = await Promise.allSettled([
      (async () => {
        const rdapData = await queryRdap(normalizedDomain);
        return parseRdapResponse(rdapData, rdapData);
      })(),
      queryPricing(normalizedDomain)
    ]);
    
    if (rdapResult.status === 'rejected') {
      const error = rdapResult.reason;
      console.log(`RDAP failed: ${error.message}`);
      
      if (error.message === 'domain_not_found') {
        return new Response(
          JSON.stringify({ 
            error: `域名 ${normalizedDomain} 未注册或不存在`,
            errorType: 'domain_not_found',
            isAvailable: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (error.message.startsWith('unsupported_tld')) {
        return new Response(
          JSON.stringify({ 
            error: `不支持查询 .${getTld(normalizedDomain)} 域名`,
            errorType: 'unsupported_tld'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: '无法获取域名信息，请稍后重试',
          errorType: 'lookup_failed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const result = {
      primary: rdapResult.value,
      pricing: pricingResult.status === 'fulfilled' ? pricingResult.value : null,
      isRegistered: true,
    };
    
    console.log('RDAP query successful');
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: '服务器错误，请稍后重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
