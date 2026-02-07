import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RDAP Bootstrap URLs
const RDAP_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';

interface RdapEntity {
  objectClassName?: string;
  roles?: string[];
  vcardArray?: any[];
  entities?: RdapEntity[];
}

interface RdapResponse {
  objectClassName?: string;
  ldhName?: string;
  unicodeName?: string;
  status?: string[];
  events?: Array<{ eventAction: string; eventDate: string }>;
  entities?: RdapEntity[];
  nameservers?: Array<{ ldhName: string }>;
  secureDNS?: { delegationSigned?: boolean };
  links?: Array<{ rel: string; href: string }>;
}

// Cache for RDAP bootstrap data
let rdapBootstrapCache: Record<string, string> | null = null;
let bootstrapCacheTime = 0;
const CACHE_TTL = 3600000; // 1 hour

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

function findRegistrar(entities: RdapEntity[]): string {
  for (const entity of entities) {
    if (entity.roles?.includes('registrar') && entity.vcardArray) {
      const vcard = parseVcard(entity.vcardArray);
      return vcard.name || vcard.organization || '';
    }
    if (entity.entities) {
      const nested = findRegistrar(entity.entities);
      if (nested) return nested;
    }
  }
  return '';
}

async function queryRdap(domain: string): Promise<any> {
  const tld = getTld(domain);
  const bootstrap = await getRdapBootstrap();
  
  let rdapServer = bootstrap[tld];
  
  // Try common RDAP servers if not in bootstrap
  if (!rdapServer) {
    const commonServers = [
      'https://rdap.verisign.com/com/v1/',
      'https://rdap.org/',
      'https://rdap.centralnic.com/com/',
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

function parseRdapResponse(data: RdapResponse): any {
  const result: any = {
    domain: data.ldhName || data.unicodeName || '',
    status: data.status || [],
    nameServers: (data.nameservers || []).map(ns => ns.ldhName),
    dnssec: data.secureDNS?.delegationSigned || false,
    source: 'rdap',
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
    result.registrar = findRegistrar(data.entities);
    result.registrant = findRegistrant(data.entities);
  }
  
  return result;
}

// Fallback WHOIS parsing using public WHOIS API
async function queryWhoisFallback(domain: string): Promise<any> {
  console.log(`Trying WHOIS fallback for ${domain}`);
  
  // Use a public WHOIS API as fallback
  const whoisApis = [
    `https://www.whoisxmlapi.com/whoisserver/WhoisService?domainName=${domain}&outputFormat=JSON&apiKey=at_demo`,
  ];
  
  for (const apiUrl of whoisApis) {
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.WhoisRecord) {
          return {
            domain: domain,
            registrar: data.WhoisRecord.registrarName || 'N/A',
            registrationDate: data.WhoisRecord.createdDate || 'N/A',
            expirationDate: data.WhoisRecord.expiresDate || 'N/A',
            lastUpdated: data.WhoisRecord.updatedDate || 'N/A',
            nameServers: data.WhoisRecord.nameServers?.hostNames || [],
            status: data.WhoisRecord.status ? [data.WhoisRecord.status] : [],
            registrant: {
              organization: data.WhoisRecord.registrant?.organization,
              country: data.WhoisRecord.registrant?.country,
            },
            dnssec: false,
            source: 'whois',
          };
        }
      }
    } catch (e) {
      console.error('WHOIS API error:', e);
    }
  }
  
  throw new Error('No WHOIS data available');
}

serve(async (req) => {
  // Handle CORS preflight
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
    
    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim();
    
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(normalizedDomain)) {
      return new Response(
        JSON.stringify({ error: '域名格式无效' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Looking up domain: ${normalizedDomain}`);
    
    let result;
    
    try {
      // Try RDAP first
      const rdapData = await queryRdap(normalizedDomain);
      result = {
        primary: parseRdapResponse(rdapData),
        rawData: rdapData,
      };
      console.log('RDAP query successful');
    } catch (rdapError: any) {
      console.log(`RDAP failed: ${rdapError.message}`);
      
      if (rdapError.message === 'domain_not_found') {
        return new Response(
          JSON.stringify({ 
            error: `域名 ${normalizedDomain} 未注册或不存在`,
            errorType: 'domain_not_found'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (rdapError.message.startsWith('unsupported_tld')) {
        return new Response(
          JSON.stringify({ 
            error: `不支持查询 .${getTld(normalizedDomain)} 域名`,
            errorType: 'unsupported_tld'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Try WHOIS fallback
      try {
        const whoisData = await queryWhoisFallback(normalizedDomain);
        result = {
          primary: whoisData,
        };
        console.log('WHOIS fallback successful');
      } catch (whoisError) {
        console.error('Both RDAP and WHOIS failed');
        return new Response(
          JSON.stringify({ 
            error: '无法获取域名信息，请稍后重试',
            errorType: 'lookup_failed'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
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
