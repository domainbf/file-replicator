/**
 * 本地 RDAP 查询服务
 * RDAP 使用 HTTP/HTTPS 协议，可以直接在浏览器中运行
 * 这样可以避免依赖云端，大幅提升查询速度
 */

// RDAP Bootstrap URL
const RDAP_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';

// RDAP Bootstrap 缓存
let rdapBootstrapCache: Record<string, string> | null = null;
let bootstrapCacheTime = 0;
const CACHE_TTL = 3600000; // 1 hour

// 已知的 RDAP 服务器映射 (常用 TLD 预置，避免每次请求 IANA)
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
  // ccTLDs with RDAP support
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
  // 新增非洲/亚洲 ccTLD
  'rw': 'https://rdap.ricta.org.rw/rdap',
  'ke': 'https://rdap.kenic.or.ke/rdap',
  'za': 'https://rdap.registry.net.za/rdap',
  'ng': 'https://rdap.nic.net.ng/rdap',
  'gh': 'https://rdap.nic.gh/rdap',
  'tz': 'https://rdap.tznic.or.tz/rdap',
  'lk': 'https://rdap.nic.lk/rdap',
  'bd': 'https://rdap.btcl.net.bd/rdap',
  'th': 'https://rdap.thnic.co.th/rdap',
  'vn': 'https://rdap.vnnic.vn/rdap',
  'ph': 'https://rdap.dot.ph/rdap',
  'kn': 'https://rdap.nic.kn/rdap',
};

// 获取 TLD
function getTld(domain: string): string {
  const parts = domain.split('.');
  return parts[parts.length - 1].toLowerCase();
}

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
    
    if (!response.ok) {
      throw new Error('Failed to fetch RDAP bootstrap');
    }
    
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
    console.log(`[RDAP] Loaded ${Object.keys(servers).length} TLD mappings`);
    return servers;
  } catch (error) {
    console.warn('[RDAP] Failed to fetch bootstrap data:', error);
    // 返回预置的服务器列表
    return KNOWN_RDAP_SERVERS;
  }
}

// 获取 RDAP 服务器 URL
async function getRdapServer(tld: string): Promise<string | null> {
  // 优先使用预置的服务器（速度快）
  if (KNOWN_RDAP_SERVERS[tld]) {
    return KNOWN_RDAP_SERVERS[tld];
  }
  
  // 从 IANA Bootstrap 获取
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
};

function translateStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/[_\-\s]+/g, '');
  return STATUS_CODE_MAP[normalized] || status;
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

// 计算域名年龄标签
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

// 计算剩余天数
function getRemainingDays(expirationDate: string): number | null {
  if (!expirationDate) return null;
  
  try {
    const expDate = new Date(expirationDate);
    if (isNaN(expDate.getTime())) return null;
    
    const diffTime = expDate.getTime() - Date.now();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
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
  
  // 提取日期
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
  
  // 提取 Nameservers
  if (data.nameservers) {
    result.nameServers = data.nameservers
      .map((ns: any) => ns.ldhName || ns.unicodeName)
      .filter(Boolean);
  }
  
  // 提取实体信息
  if (data.entities) {
    for (const entity of data.entities) {
      const roles = entity.roles || [];
      
      if (roles.includes('registrar')) {
        if (entity.vcardArray) {
          const vcard = entity.vcardArray[1] || [];
          for (const item of vcard) {
            if (item[0] === 'fn') {
              result.registrar = item[3];
            }
          }
        }
        
        if (entity.publicIds) {
          for (const pubId of entity.publicIds) {
            if (pubId.type === 'IANA Registrar ID') {
              result.registrarIanaId = pubId.identifier;
            }
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
          }
        }
      }
    }
  }
  
  return result;
}

export interface RdapResult {
  success: boolean;
  data?: any;
  error?: string;
  isAvailable?: boolean;
  source: 'rdap';
  queryTime: number;
}

/**
 * 本地 RDAP 查询
 * 直接在浏览器中发起 HTTP 请求，无需通过云端
 */
export async function queryRdapLocal(domain: string): Promise<RdapResult> {
  const startTime = Date.now();
  const tld = getTld(domain);
  
  try {
    const serverUrl = await getRdapServer(tld);
    
    if (!serverUrl) {
      console.log(`[RDAP] No RDAP server found for .${tld}`);
      return {
        success: false,
        error: `No RDAP server for .${tld}`,
        source: 'rdap',
        queryTime: Date.now() - startTime
      };
    }
    
    const rdapUrl = `${serverUrl}/domain/${domain}`;
    console.log(`[RDAP] Querying: ${rdapUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
    
    const response = await fetch(rdapUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/rdap+json, application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 404) {
      console.log(`[RDAP] Domain not found: ${domain}`);
      return {
        success: false,
        isAvailable: true,
        error: 'Domain not registered',
        source: 'rdap',
        queryTime: Date.now() - startTime
      };
    }
    
    if (!response.ok) {
      throw new Error(`RDAP error: ${response.status}`);
    }
    
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
    
    if (error.name === 'AbortError') {
      console.warn(`[RDAP] Timeout for ${domain} after ${queryTime}ms`);
      return {
        success: false,
        error: 'RDAP query timeout',
        source: 'rdap',
        queryTime
      };
    }
    
    console.warn(`[RDAP] Failed for ${domain}:`, error.message);
    return {
      success: false,
      error: error.message,
      source: 'rdap',
      queryTime
    };
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
