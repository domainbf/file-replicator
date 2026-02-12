/**
 * 本地 RDAP 查询服务 - 增强版
 * RDAP 使用 HTTP/HTTPS 协议，可以直接在浏览器中运行
 * 对于不支持 CORS 的 RDAP 服务器，自动跳过并交给云端代理
 */

// RDAP Bootstrap URL
const RDAP_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';

// RDAP Bootstrap 缓存
let rdapBootstrapCache: Record<string, string> | null = null;
let bootstrapCacheTime = 0;
const CACHE_TTL = 3600000; // 1 hour

// 已知支持 CORS 的 RDAP 服务器 (浏览器可直连)
const CORS_FRIENDLY_RDAP: Set<string> = new Set([
  'https://rdap.verisign.com',
  'https://rdap.org',
  'https://rdap.centralnic.com',
  'https://rdap.nic.google',
  'https://rdap.identitydigital.services',
  'https://rdap.publicinterestregistry.org',
  'https://rdap.afilias.net',
  'https://rdap.nic.club',
  'https://rdap.nic.xyz',
  'https://rdap.nic.top',
  'https://rdap.nic.vip',
  'https://rdap.nic.shop',
  'https://rdap.nic.pro',
  'https://rdap.nic.work',
  'https://rdap.nic.mobi',
  'https://rdap.nic.name',
  'https://rdap.nic.asia',
  'https://rdap.nic.biz',
  'https://rdap.nic.info',
  'https://rdap.nominet.uk',
  'https://rdap.sidn.nl',
  'https://rdap.nic.fr',
  'https://rdap.denic.de',
  'https://rdap.iis.se',
  'https://rdap.nic.ch',
  'https://rdap.eurid.eu',
  'https://rdap.dns.pl',
  'https://rdap.registro.br',
  'https://rdap.auda.org.au',
  'https://rdap.nic.it',
  'https://rdap.jprs.jp',
  'https://rdap.dk-hostmaster.dk',
]);

// 已知不支持 CORS 或经常失败的 RDAP 服务器 (跳过直连，交给云端)
const CORS_BLOCKED_RDAP: Set<string> = new Set([
  'https://rdap.nic.ai',
  'https://rdap.nic.io',
  'https://rdap.nic.co',
  'https://rdap.nic.me',
  'https://rdap.nic.cc',
  'https://rdap.nic.tv',
  'https://rdap.channelisles.net',
  'https://rdap.cnnic.cn',
  'https://rdap.nic.us',
  'https://rdap.hkirc.hk',
  'https://rdap.twnic.tw',
  'https://rdap.kisa.or.kr',
  'https://rdap.ca.fury.ca',
  'https://rdap.registry.in',
  'https://rdap.nic.lk',
  'https://rdap.nic.bd',
  'https://rdap.nic.kn',
  'https://rdap.nic.ng',
  'https://rdap.ricta.org.rw',
  'https://rdap.kenic.or.ke',
  'https://rdap.registry.net.za',
  'https://rdap.pandi.id',
  'https://rdap.mynic.my',
  'https://rdap.sgnic.sg',
  'https://rdap.ripn.net',
  'https://rdap.cctld.kg',
  'https://rdap.nic.cloud',
  'https://rdap.uniregistry.net',
  'https://rdap.nic.live',
]);

// RDAP 服务器预置映射 (常用 TLD)
const KNOWN_RDAP_SERVERS: Record<string, string> = {
  // gTLDs
  'com': 'https://rdap.verisign.com/com/v1',
  'net': 'https://rdap.verisign.com/net/v1',
  'org': 'https://rdap.publicinterestregistry.org/rdap',
  'info': 'https://rdap.nic.info',
  'biz': 'https://rdap.nic.biz',
  'xyz': 'https://rdap.centralnic.com/xyz',
  'top': 'https://rdap.nic.top',
  'dev': 'https://rdap.nic.google',
  'app': 'https://rdap.nic.google',
  'io': 'https://rdap.nic.io',
  'co': 'https://rdap.nic.co',
  'me': 'https://rdap.nic.me',
  'ai': 'https://rdap.nic.ai',
  'gg': 'https://rdap.channelisles.net/whois',
  'cc': 'https://rdap.verisign.com/cc/v1',
  'tv': 'https://rdap.verisign.com/tv/v1',
  'club': 'https://rdap.nic.club',
  'online': 'https://rdap.centralnic.com/online',
  'site': 'https://rdap.centralnic.com/site',
  'store': 'https://rdap.centralnic.com/store',
  'tech': 'https://rdap.centralnic.com/tech',
  'fun': 'https://rdap.centralnic.com/fun',
  'icu': 'https://rdap.centralnic.com/icu',
  'vip': 'https://rdap.nic.vip',
  'cloud': 'https://rdap.nic.cloud',
  'link': 'https://rdap.uniregistry.net/rdap',
  'live': 'https://rdap.nic.live',
  'shop': 'https://rdap.nic.shop',
  'pro': 'https://rdap.nic.pro',
  'work': 'https://rdap.nic.work',
  'mobi': 'https://rdap.nic.mobi',
  'name': 'https://rdap.nic.name',
  'asia': 'https://rdap.nic.asia',
  'blog': 'https://rdap.centralnic.com/blog',
  'art': 'https://rdap.centralnic.com/art',
  'design': 'https://rdap.centralnic.com/design',
  'space': 'https://rdap.centralnic.com/space',
  'world': 'https://rdap.centralnic.com/world',
  'life': 'https://rdap.centralnic.com/life',
  'email': 'https://rdap.centralnic.com/email',
  'group': 'https://rdap.centralnic.com/group',
  'page': 'https://rdap.nic.google',
  'new': 'https://rdap.nic.google',
  'how': 'https://rdap.nic.google',
  'soy': 'https://rdap.nic.google',
  'moe': 'https://rdap.nic.google',
  // ccTLDs
  'au': 'https://rdap.auda.org.au',
  'br': 'https://rdap.registro.br',
  'ca': 'https://rdap.ca.fury.ca/rdap',
  'ch': 'https://rdap.nic.ch',
  'cn': 'https://rdap.cnnic.cn/rdap',
  'de': 'https://rdap.denic.de',
  'dk': 'https://rdap.dk-hostmaster.dk',
  'eu': 'https://rdap.eurid.eu/rdap',
  'fr': 'https://rdap.nic.fr',
  'hk': 'https://rdap.hkirc.hk/rdap',
  'id': 'https://rdap.pandi.id/rdap',
  'in': 'https://rdap.registry.in',
  'it': 'https://rdap.nic.it',
  'jp': 'https://rdap.jprs.jp',
  'kg': 'http://rdap.cctld.kg',
  'kr': 'https://rdap.kisa.or.kr/rdap',
  'my': 'https://rdap.mynic.my/rdap',
  'nl': 'https://rdap.sidn.nl',
  'nz': 'https://rdap.dnc.org.nz/rdap',
  'pl': 'https://rdap.dns.pl',
  'ru': 'https://rdap.ripn.net/rdap',
  'se': 'https://rdap.iis.se',
  'sg': 'https://rdap.sgnic.sg/rdap',
  'tw': 'https://rdap.twnic.tw/rdap',
  'uk': 'https://rdap.nominet.uk/uk',
  'us': 'https://rdap.nic.us',
  'rw': 'https://rdap.ricta.org.rw/rdap',
  'ke': 'https://rdap.kenic.or.ke/rdap',
  'za': 'https://rdap.registry.net.za/rdap',
};

// 获取 TLD
function getTld(domain: string): string {
  const parts = domain.split('.');
  return parts[parts.length - 1].toLowerCase();
}

// 判断 RDAP 服务器是否可能支持 CORS (浏览器直连)
function isCorsLikely(serverUrl: string): boolean {
  // 检查是否在已知阻断列表
  for (const blocked of CORS_BLOCKED_RDAP) {
    if (serverUrl.startsWith(blocked)) return false;
  }
  // 检查是否在已知友好列表
  for (const friendly of CORS_FRIENDLY_RDAP) {
    if (serverUrl.startsWith(friendly)) return true;
  }
  // 未知服务器 - 尝试直连但设更短超时
  return false;
}

// 记录 CORS 失败的服务器 (运行时学习)
const corsFailedServers = new Set<string>();

// 获取 RDAP Bootstrap 数据
async function fetchRdapBootstrap(): Promise<Record<string, string>> {
  const now = Date.now();
  
  if (rdapBootstrapCache && (now - bootstrapCacheTime) < CACHE_TTL) {
    return rdapBootstrapCache;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(RDAP_BOOTSTRAP_URL, { 
      signal: controller.signal,
      cache: 'force-cache'
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('Failed to fetch RDAP bootstrap');
    
    const data = await response.json();
    const servers: Record<string, string> = {};
    
    if (data.services) {
      for (const service of data.services) {
        const tlds = service[0];
        const urls = service[1];
        if (tlds && urls && urls.length > 0) {
          for (const tld of tlds) {
            servers[tld.toLowerCase()] = urls[0];
          }
        }
      }
    }
    
    rdapBootstrapCache = servers;
    bootstrapCacheTime = now;
    return servers;
  } catch {
    return KNOWN_RDAP_SERVERS;
  }
}

// 获取 RDAP 服务器 URL
async function getRdapServer(tld: string): Promise<string | null> {
  if (KNOWN_RDAP_SERVERS[tld]) return KNOWN_RDAP_SERVERS[tld];
  const bootstrap = await fetchRdapBootstrap();
  return bootstrap[tld] || null;
}

// 域名状态码翻译
const STATUS_CODE_MAP: Record<string, string> = {
  'ok': '正常',
  'active': '正常',
  'registered': '已注册',
  'clientdeleteprohibited': '客户端删除禁止',
  'clienttransferprohibited': '客户端转移禁止',
  'clientupdateprohibited': '客户端更新禁止',
  'serverdeleteprohibited': '注册局删除禁止',
  'servertransferprohibited': '注册局转移禁止',
  'serverupdateprohibited': '注册局更新禁止',
  'clienthold': '客户端暂停',
  'serverhold': '注册局暂停',
  'pendingtransfer': '转移中',
  'pendingdelete': '待删除',
  'redemptionperiod': '赎回期',
  'autorenewperiod': '自动续费期',
  'clientrenewprohibited': '客户端续费禁止',
  'serverrenewprohibited': '注册局续费禁止',
  'addperiod': '注册宽限期',
  'renewperiod': '续费宽限期',
  'transferperiod': '转移宽限期',
  'pendingverification': '待验证',
  'inactive': '未激活',
  'suspended': '已暂停',
  'expired': '已过期',
  'locked': '已锁定',
};

function translateStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/[_\-\s]+/g, '');
  return STATUS_CODE_MAP[normalized] || status;
}

// 注册商官网映射 (本地增强版)
const REGISTRAR_WEBSITES: Record<string, string> = {
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
  'ionos': 'https://www.ionos.com',
  '1&1': 'https://www.ionos.com',
  'bluehost': 'https://www.bluehost.com',
  'hostgator': 'https://www.hostgator.com',
  'dreamhost': 'https://www.dreamhost.com',
  'markmonitor': 'https://www.markmonitor.com',
  'csc': 'https://www.cscglobal.com',
  'safenames': 'https://www.safenames.net',
  'enom': 'https://www.enom.com',
  'key-systems': 'https://www.key-systems.net',
  'realtime register': 'https://www.realtimeregister.com',
  'internetbs': 'https://internetbs.net',
  'openprovider': 'https://www.openprovider.com',
  'automattic': 'https://wordpress.com/domains',
  'wordpress': 'https://wordpress.com/domains',
  'spaceship': 'https://www.spaceship.com',
  'ovh': 'https://www.ovhcloud.com',
  'strato': 'https://www.strato.de',
  'hetzner': 'https://www.hetzner.com',
  'register.com': 'https://www.register.com',
  'domain.com': 'https://www.domain.com',
  'namebright': 'https://www.namebright.com',
  'directnic': 'https://www.directnic.com',
  'gname': 'https://www.gname.com',
  'hexonet': 'https://www.hexonet.net',
  'centralnic': 'https://www.centralnic.com',
  'webnic': 'https://www.webnic.cc',
  '101domain': 'https://www.101domain.com',
  'rebel': 'https://www.rebel.com',
  'eurodns': 'https://www.eurodns.com',
  'crazydomains': 'https://www.crazydomains.com',
  'regery': 'https://www.regery.com',
  'whois.com': 'https://www.whois.com',
  // 中国注册商
  'alibaba': 'https://wanwang.aliyun.com',
  'aliyun': 'https://wanwang.aliyun.com',
  '阿里云': 'https://wanwang.aliyun.com',
  'hichina': 'https://wanwang.aliyun.com',
  '万网': 'https://wanwang.aliyun.com',
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
  // 域名交易
  'sedo': 'https://sedo.com',
  'afternic': 'https://www.afternic.com',
  'dan': 'https://dan.com',
  'verisign': 'https://www.verisign.com',
  // 日韩注册商
  'onamae': 'https://www.onamae.com',
  'gmo': 'https://www.gmo.jp',
  // 俄语注册商
  'nic.ru': 'https://www.nic.ru',
  'reg.ru': 'https://www.reg.ru',
};

// DNS 服务商映射
const DNS_PROVIDERS: Record<string, { name: string; website: string }> = {
  'cloudflare': { name: 'Cloudflare', website: 'https://www.cloudflare.com' },
  'awsdns': { name: 'AWS Route 53', website: 'https://aws.amazon.com/route53' },
  'amazonaws': { name: 'AWS Route 53', website: 'https://aws.amazon.com/route53' },
  'azure-dns': { name: 'Azure DNS', website: 'https://azure.microsoft.com/services/dns' },
  'googledomains': { name: 'Google Cloud DNS', website: 'https://cloud.google.com/dns' },
  'google': { name: 'Google DNS', website: 'https://domains.google' },
  'nsone': { name: 'NS1', website: 'https://ns1.com' },
  'ultradns': { name: 'UltraDNS', website: 'https://www.ultradns.com' },
  'akamai': { name: 'Akamai', website: 'https://www.akamai.com' },
  'fastly': { name: 'Fastly', website: 'https://www.fastly.com' },
  'godaddy': { name: 'GoDaddy DNS', website: 'https://www.godaddy.com' },
  'domaincontrol': { name: 'GoDaddy DNS', website: 'https://www.godaddy.com' },
  'secureserver': { name: 'GoDaddy DNS', website: 'https://www.godaddy.com' },
  'namecheap': { name: 'Namecheap DNS', website: 'https://www.namecheap.com' },
  'registrar-servers': { name: 'Namecheap DNS', website: 'https://www.namecheap.com' },
  'worldnic': { name: 'Network Solutions', website: 'https://www.networksolutions.com' },
  'porkbun': { name: 'Porkbun DNS', website: 'https://porkbun.com' },
  'namesilo': { name: 'NameSilo DNS', website: 'https://www.namesilo.com' },
  'squarespace': { name: 'Squarespace DNS', website: 'https://domains.squarespace.com' },
  'digitalocean': { name: 'DigitalOcean DNS', website: 'https://www.digitalocean.com' },
  'linode': { name: 'Linode DNS', website: 'https://www.linode.com' },
  'vultr': { name: 'Vultr DNS', website: 'https://www.vultr.com' },
  'vercel': { name: 'Vercel DNS', website: 'https://vercel.com' },
  'netlify': { name: 'Netlify DNS', website: 'https://www.netlify.com' },
  'hostinger': { name: 'Hostinger', website: 'https://www.hostinger.com' },
  'siteground': { name: 'SiteGround', website: 'https://www.siteground.com' },
  'ovh': { name: 'OVH', website: 'https://www.ovhcloud.com' },
  'hetzner': { name: 'Hetzner', website: 'https://www.hetzner.com' },
  'he.net': { name: 'Hurricane Electric', website: 'https://dns.he.net' },
  'easydns': { name: 'easyDNS', website: 'https://easydns.com' },
  'dnsmadeeasy': { name: 'DNS Made Easy', website: 'https://dnsmadeeasy.com' },
  'dnssimple': { name: 'DNSimple', website: 'https://dnsimple.com' },
  'cloudns': { name: 'ClouDNS', website: 'https://www.cloudns.net' },
  'afraid': { name: 'FreeDNS', website: 'https://freedns.afraid.org' },
  'no-ip': { name: 'No-IP', website: 'https://www.noip.com' },
  // 中国 DNS
  'dnspod': { name: 'DNSPod', website: 'https://www.dnspod.cn' },
  'alidns': { name: '阿里云DNS', website: 'https://www.aliyun.com/product/dns' },
  'hichina': { name: '万网DNS', website: 'https://wanwang.aliyun.com' },
  'aliyun': { name: '阿里云DNS', website: 'https://www.aliyun.com/product/dns' },
  'tencentdns': { name: '腾讯云DNS', website: 'https://cloud.tencent.com/product/dns' },
  'myqcloud': { name: '腾讯云', website: 'https://cloud.tencent.com' },
  'huaweicloud': { name: '华为云DNS', website: 'https://www.huaweicloud.com/product/dns.html' },
  'hwclouds': { name: '华为云DNS', website: 'https://www.huaweicloud.com/product/dns.html' },
  'baidubce': { name: '百度云DNS', website: 'https://cloud.baidu.com/product/dns.html' },
  'west': { name: '西部数码', website: 'https://www.west.cn' },
  'myhostadmin': { name: '西部数码', website: 'https://www.west.cn' },
  'xinnet': { name: '新网', website: 'https://www.xinnet.com' },
  'ename': { name: '易名中国', website: 'https://www.ename.com' },
  'volcengine': { name: '火山引擎', website: 'https://www.volcengine.com' },
  'qiniu': { name: '七牛云', website: 'https://www.qiniu.com' },
  'upyun': { name: '又拍云', website: 'https://www.upyun.com' },
  'wangsu': { name: '网宿科技', website: 'https://www.wangsu.com' },
  'render': { name: 'Render', website: 'https://render.com' },
  'railway': { name: 'Railway', website: 'https://railway.app' },
  'wpengine': { name: 'WP Engine', website: 'https://wpengine.com' },
  'kinsta': { name: 'Kinsta', website: 'https://kinsta.com' },
};

function getRegistrarWebsite(registrar: string): string | null {
  if (!registrar) return null;
  const lower = registrar.toLowerCase();
  for (const [key, url] of Object.entries(REGISTRAR_WEBSITES)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

function identifyDnsProvider(nameservers: string[]): { name: string; website: string } | null {
  if (!nameservers || nameservers.length === 0) return null;
  const nsLower = nameservers.map(ns => ns.toLowerCase()).join(' ');
  for (const [key, provider] of Object.entries(DNS_PROVIDERS)) {
    if (nsLower.includes(key)) return provider;
  }
  return null;
}

// 格式化日期
function formatDateChinese(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A') return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    if (year < 1990 || year > 2100) return dateStr;
    return `${year}年${month}月${day}日`;
  } catch {
    return dateStr;
  }
}

function getAgeLabel(registrationDate: string): string | null {
  if (!registrationDate) return null;
  try {
    const regDate = new Date(registrationDate);
    if (isNaN(regDate.getTime())) return null;
    const years = Math.floor((Date.now() - regDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
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

function getRemainingDays(expirationDate: string): number | null {
  if (!expirationDate) return null;
  try {
    const expDate = new Date(expirationDate);
    if (isNaN(expDate.getTime())) return null;
    return Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function detectPrivacyProtection(registrant: any): boolean {
  if (!registrant) return false;
  const keywords = ['privacy', 'protected', 'redacted', 'whoisguard', 'withheld', 'proxy', 'private', 'domains by proxy', 'contact privacy'];
  const check = (v: string | undefined) => v ? keywords.some(kw => v.toLowerCase().includes(kw)) : false;
  return check(registrant.name) || check(registrant.organization) || check(registrant.email);
}

function getUpdateLabel(status: string[]): string | null {
  if (!status || status.length === 0) return null;
  const lower = status.map(s => s.toLowerCase());
  const hasDelete = lower.some(s => s.includes('clientdeleteprohibited') || s.includes('client delete prohibited'));
  const hasTransfer = lower.some(s => s.includes('clienttransferprohibited') || s.includes('client transfer prohibited'));
  const hasUpdate = lower.some(s => s.includes('clientupdateprohibited') || s.includes('client update prohibited'));
  if (hasDelete && hasTransfer && hasUpdate) return '全功能高密锁定';
  if (hasTransfer) return '转移锁定';
  return null;
}

// 解析 RDAP 响应
function parseRdapResponse(data: any): any {
  const result: any = {
    domain: data.ldhName || data.unicodeName || '',
    status: data.status || [],
    statusTranslated: (data.status || []).map((s: string) => translateStatus(s)),
    nameServers: [],
    dnssec: data.secureDNS?.delegationSigned || false,
    source: 'rdap',
    rawData: { rdapData: data },
  };
  
  if (data.events) {
    for (const event of data.events) {
      if (event.eventAction === 'registration') {
        result.registrationDate = event.eventDate;
        result.registrationDateFormatted = formatDateChinese(event.eventDate);
        result.ageLabel = getAgeLabel(event.eventDate);
      } else if (event.eventAction === 'expiration') {
        result.expirationDate = event.eventDate;
        result.expirationDateFormatted = formatDateChinese(event.eventDate);
        result.remainingDays = getRemainingDays(event.eventDate);
      } else if (event.eventAction === 'last changed' || event.eventAction === 'last update') {
        result.lastUpdated = event.eventDate;
        result.lastUpdatedFormatted = formatDateChinese(event.eventDate);
      }
    }
  }
  
  if (data.nameservers) {
    result.nameServers = data.nameservers
      .map((ns: any) => ns.ldhName || ns.unicodeName)
      .filter(Boolean);
  }
  
  if (data.entities) {
    for (const entity of data.entities) {
      const roles = entity.roles || [];
      if (roles.includes('registrar')) {
        if (entity.vcardArray) {
          const vcard = entity.vcardArray[1] || [];
          for (const item of vcard) {
            if (item[0] === 'fn') result.registrar = item[3];
          }
        }
        if (entity.publicIds) {
          for (const pubId of entity.publicIds) {
            if (pubId.type === 'IANA Registrar ID') result.registrarIanaId = pubId.identifier;
          }
        }
      }
      if (roles.includes('registrant')) {
        if (entity.vcardArray) {
          const vcard = entity.vcardArray[1] || [];
          result.registrant = {};
          for (const item of vcard) {
            if (item[0] === 'fn') result.registrant.name = item[3];
            if (item[0] === 'org') result.registrant.organization = item[3];
            if (item[0] === 'email') result.registrant.email = item[3];
            if (item[0] === 'tel') result.registrant.phone = item[3];
            if (item[0] === 'adr' && Array.isArray(item[3])) {
              if (item[3][3]) result.registrant.city = item[3][3];
              if (item[3][4]) result.registrant.state = item[3][4];
            }
          }
        }
      }
    }
  }
  
  // 增强: 注册商官网和 DNS 提供商识别
  result.registrarWebsite = getRegistrarWebsite(result.registrar);
  result.dnsProvider = identifyDnsProvider(result.nameServers);
  result.privacyProtection = detectPrivacyProtection(result.registrant);
  result.updateLabel = getUpdateLabel(result.status);
  
  return result;
}

export interface RdapResult {
  success: boolean;
  data?: any;
  error?: string;
  isAvailable?: boolean;
  source: 'rdap';
  queryTime: number;
  corsBlocked?: boolean;
}

/**
 * 本地 RDAP 查询 - 增强版
 * 自动检测 CORS 支持，不支持的服务器快速返回让云端接管
 */
export async function queryRdapLocal(domain: string): Promise<RdapResult> {
  const startTime = Date.now();
  const tld = getTld(domain);
  
  try {
    const serverUrl = await getRdapServer(tld);
    
    if (!serverUrl) {
      return {
        success: false,
        error: `No RDAP server for .${tld}`,
        source: 'rdap',
        queryTime: Date.now() - startTime
      };
    }
    
    // 检查 CORS 支持 - 不支持的直接跳过，交给云端
    const serverBase = new URL(serverUrl).origin;
    if (CORS_BLOCKED_RDAP.has(serverBase) || corsFailedServers.has(serverBase)) {
      console.log(`[RDAP] Skipping non-CORS server: ${serverBase}, delegating to cloud`);
      return {
        success: false,
        error: 'CORS not supported',
        corsBlocked: true,
        source: 'rdap',
        queryTime: Date.now() - startTime
      };
    }
    
    const rdapUrl = `${serverUrl}/domain/${domain}`;
    const timeout = isCorsLikely(serverUrl) ? 6000 : 4000; // 已知友好的给更多时间
    
    console.log(`[RDAP] Querying: ${rdapUrl} (timeout: ${timeout}ms)`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(rdapUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/rdap+json, application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 404) {
      return {
        success: false,
        isAvailable: true,
        error: 'Domain not registered',
        source: 'rdap',
        queryTime: Date.now() - startTime
      };
    }
    
    if (!response.ok) throw new Error(`RDAP error: ${response.status}`);
    
    const data = await response.json();
    const parsed = parseRdapResponse(data);
    
    console.log(`[RDAP] Success for ${domain} in ${Date.now() - startTime}ms`);
    
    return {
      success: true,
      data: parsed,
      source: 'rdap',
      queryTime: Date.now() - startTime
    };
  } catch (error: any) {
    const queryTime = Date.now() - startTime;
    
    // 学习 CORS 失败的服务器
    if (error.name === 'TypeError' && error.message?.includes('Load failed')) {
      try {
        const serverUrl = await getRdapServer(tld);
        if (serverUrl) {
          const base = new URL(serverUrl).origin;
          corsFailedServers.add(base);
          console.log(`[RDAP] Learned CORS block: ${base}`);
        }
      } catch {}
      
      return {
        success: false,
        error: 'CORS blocked',
        corsBlocked: true,
        source: 'rdap',
        queryTime
      };
    }
    
    if (error.name === 'AbortError') {
      return { success: false, error: 'RDAP query timeout', source: 'rdap', queryTime };
    }
    
    return { success: false, error: error.message, source: 'rdap', queryTime };
  }
}

/**
 * 检查 TLD 是否支持 RDAP
 */
export async function hasRdapSupport(tld: string): Promise<boolean> {
  const server = await getRdapServer(tld);
  return !!server;
}

/**
 * 获取已知的 RDAP 服务器列表
 */
export function getKnownRdapServers(): Record<string, string> {
  return { ...KNOWN_RDAP_SERVERS };
}
