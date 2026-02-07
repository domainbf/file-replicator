import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client for database queries
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// WHOIS server cache from local database
let whoisServerCache: Record<string, string> = {};
let whoisCacheTime = 0;
const WHOIS_CACHE_TTL = 3600000; // 1 hour

// ==================== 完整的域名状态码映射 (支持多语言) ====================
const STATUS_CODE_MAP: Record<string, string> = {
  // ICANN通用核心状态码
  'ok': '正常',
  'active': '正常',
  'registered': '已注册',
  'connect': '已连接',
  'connected': '已连接',
  
  // 法语状态码
  'actif': '正常',
  'inactif': '未激活',
  'suspendu': '已暂停',
  'expiré': '已过期',
  'expire': '已过期',
  'réservé': '已保留',
  'reserve': '已保留',
  'bloqué': '已锁定',
  'bloque': '已锁定',
  
  // 德语状态码
  'aktiv': '正常',
  'gesperrt': '已锁定',
  'abgelaufen': '已过期',
  
  // 西班牙语状态码
  'activo': '正常',
  'inactivo': '未激活',
  'suspendido': '已暂停',
  'expirado': '已过期',
  
  // 日语状态码
  '有効': '正常',
  '無効': '未激活',
  
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

// 注册商官网映射 (超级扩展版 - 包含全球大中小注册商)
const REGISTRAR_WEBSITES: Record<string, string> = {
  // ==================== 全球顶级注册商 ====================
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
  // ==================== 中型国际注册商 ====================
  'rebel': 'https://www.rebel.com',
  'domain.com': 'https://www.domain.com',
  'namebright': 'https://www.namebright.com',
  'directnic': 'https://www.directnic.com',
  'godns': 'https://www.godns.com',
  'eurodns': 'https://www.eurodns.com',
  'gname': 'https://www.gname.com',
  'dnsexit': 'https://www.dnsexit.com',
  'hexonet': 'https://www.hexonet.net',
  'rrpproxy': 'https://www.rrpproxy.net',
  'centralnic': 'https://www.centralnic.com',
  'publicdomainregistry': 'https://pdr.com',
  'pdr': 'https://pdr.com',
  'webnic': 'https://www.webnic.cc',
  'netim': 'https://www.netim.com',
  'instra': 'https://www.instra.com',
  'domainpeople': 'https://www.domainpeople.com',
  'regtons': 'https://www.regtons.com',
  'regery': 'https://www.regery.com',
  '101domain': 'https://www.101domain.com',
  'hostopia': 'https://www.hostopia.com',
  'marcaria': 'https://www.marcaria.com',
  'blacknight': 'https://www.blacknight.com',
  'hostpoint': 'https://www.hostpoint.ch',
  'infomaniak': 'https://www.infomaniak.com',
  'leaseweb': 'https://www.leaseweb.com',
  'transip': 'https://www.transip.nl',
  'combell': 'https://www.combell.com',
  'bookmyname': 'https://www.bookmyname.com',
  'domainmonster': 'https://www.domainmonster.com',
  '123-reg': 'https://www.123-reg.co.uk',
  'fasthosts': 'https://www.fasthosts.co.uk',
  'hosteurope': 'https://www.hosteurope.de',
  'united-domains': 'https://www.united-domains.de',
  // ==================== 小众国际注册商 ====================
  'spaceship': 'https://www.spaceship.com',
  'whois.com': 'https://www.whois.com',
  'crazydomains': 'https://www.crazydomains.com',
  'crazy domains': 'https://www.crazydomains.com',
  'domcomp': 'https://www.domcomp.com',
  'dotster': 'https://www.dotster.com',
  'encirca': 'https://www.encirca.com',
  'hostway': 'https://www.hostway.com',
  'ipage': 'https://www.ipage.com',
  'launchpad': 'https://www.launchpad.com',
  'namejets': 'https://www.namejets.com',
  'onlinenic': 'https://www.onlinenic.com',
  'planetdomain': 'https://www.planetdomain.com',
  'powerdns': 'https://www.powerdns.com',
  'register4less': 'https://www.register4less.com',
  'snapnames': 'https://www.snapnames.com',
  'webnames': 'https://www.webnames.ca',
  'domain-it': 'https://www.domain-it.net',
  'domainsatcost': 'https://www.domainsatcost.ca',
  'nic.ru': 'https://www.nic.ru',
  'reg.ru': 'https://www.reg.ru',
  'regtime': 'https://www.regtime.net',
  'webmoney': 'https://domains.webmoney.ru',
  'nethouse': 'https://nethouse.ru',
  'timeweb': 'https://timeweb.com',
  'beget': 'https://beget.com',
  'it num': 'https://www.itnum.net',
  'itnum': 'https://www.itnum.net',
  // ==================== 中国大型注册商 ====================
  'alibaba': 'https://wanwang.aliyun.com',
  'aliyun': 'https://wanwang.aliyun.com',
  '阿里云': 'https://wanwang.aliyun.com',
  '阿里云计算有限公司': 'https://wanwang.aliyun.com',
  '万网': 'https://wanwang.aliyun.com',
  '北京万网志成科技有限公司': 'https://wanwang.aliyun.com',
  'hichina': 'https://wanwang.aliyun.com',
  'west.cn': 'https://www.west.cn',
  '西部数码': 'https://www.west.cn',
  '成都西维数码科技有限公司': 'https://www.west.cn',
  '四川域趣网络科技有限公司': 'https://www.west.cn',
  'xinnet': 'https://www.xinnet.com',
  '新网': 'https://www.xinnet.com',
  '北京新网数码信息技术有限公司': 'https://www.xinnet.com',
  'ename': 'https://www.ename.com',
  '易名': 'https://www.ename.com',
  '易名中国': 'https://www.ename.com',
  '厦门易名科技股份有限公司': 'https://www.ename.com',
  'dnspod': 'https://dnspod.cloud.tencent.com',
  'tencent': 'https://cloud.tencent.com/product/domain',
  '腾讯云': 'https://cloud.tencent.com/product/domain',
  '腾讯云计算（北京）有限责任公司': 'https://cloud.tencent.com/product/domain',
  'huawei': 'https://www.huaweicloud.com/product/domain.html',
  '华为云': 'https://www.huaweicloud.com/product/domain.html',
  '华为云计算技术有限公司': 'https://www.huaweicloud.com/product/domain.html',
  // ==================== 中国中型注册商 ====================
  'now.cn': 'https://www.now.cn',
  '时代互联': 'https://www.now.cn',
  '广东时代互联科技有限公司': 'https://www.now.cn',
  'net.cn': 'https://www.net.cn',
  'cnnic': 'https://www.cnnic.cn',
  '中国互联网络信息中心': 'https://www.cnnic.cn',
  'cndns': 'https://www.cndns.com',
  '美橙互联': 'https://www.cndns.com',
  '上海美橙科技信息发展有限公司': 'https://www.cndns.com',
  'dns.com': 'https://www.dns.com',
  '帝恩思': 'https://www.dns.com',
  'bizcn': 'https://www.bizcn.com',
  '商务中国': 'https://www.bizcn.com',
  '厦门商中在线科技股份有限公司': 'https://www.bizcn.com',
  'oray': 'https://domain.oray.com',
  '花生壳': 'https://domain.oray.com',
  '上海贝锐信息科技股份有限公司': 'https://domain.oray.com',
  '22.cn': 'https://www.22.cn',
  '爱名网': 'https://www.22.cn',
  '杭州爱名网络有限公司': 'https://www.22.cn',
  'maff': 'https://www.maff.com',
  'todaynic': 'https://www.todaynic.com',
  'zzy': 'https://www.zzy.cn',
  '中资源': 'https://www.zzy.cn',
  '北京中域智科国际网络技术有限公司': 'https://www.zzy.cn',
  'idc1': 'https://www.idc1.com',
  '纳点': 'https://www.idc1.com',
  '北京国旭科技有限公司': 'https://www.idc1.com',
  'nawang': 'https://www.nawang.cn',
  '纳网': 'https://www.nawang.cn',
  '厦门纳网科技股份有限公司': 'https://www.nawang.cn',
  'paycenter': 'https://www.paycenter.com.cn',
  '商中': 'https://www.paycenter.com.cn',
  'sundns': 'https://www.sundns.com',
  '阳光互联': 'https://www.sundns.com',
  '北京光速连通科技有限公司': 'https://www.sundns.com',
  'zgsj': 'https://www.zgsj.com',
  '中国数据': 'https://www.zgsj.com',
  // ==================== 中国小型/专业注册商 ====================
  '35.cn': 'https://www.35.cn',
  '35互联': 'https://www.35.cn',
  '厦门三五互联科技股份有限公司': 'https://www.35.cn',
  'dns.la': 'https://www.dns.la',
  'edong': 'https://www.edong.com',
  '亿东': 'https://www.edong.com',
  'e-nic': 'https://www.e-nic.cn',
  'sudu': 'https://www.sudu.cn',
  '速度': 'https://www.sudu.cn',
  'idcicp': 'https://www.idcicp.com',
  'admin5': 'https://www.admin5.net',
  'a5站长': 'https://www.admin5.net',
  '云南蓝队云计算有限公司': 'https://www.landui.com',
  '蓝队云': 'https://www.landui.com',
  '北京中科三方网络技术有限公司': 'https://www.sfn.cn',
  '中科三方': 'https://www.sfn.cn',
  '北京国科云计算有限公司': 'https://www.cloudns.cn',
  '国科云': 'https://www.cloudns.cn',
  '北京资海科技有限责任公司': 'https://www.zihai.cn',
  '资海科技': 'https://www.zihai.cn',
  '厦门中资源网络服务有限公司': 'https://www.zzy.cn',
  '北京新网互联科技有限公司': 'https://www.dns.com.cn',
  '成都飞数科技有限公司': 'https://www.west.cn',
  '广州云讯信息科技有限公司': 'https://www.yunxunidc.com',
  '云讯': 'https://www.yunxunidc.com',
  '深圳市互联时空科技有限公司': 'https://www.cndns.com',
  '江苏邦宁科技有限公司': 'https://www.idc.net.cn',
  '邦宁科技': 'https://www.idc.net.cn',
  '浙江贰贰网络有限公司': 'https://www.22.cn',
  '杭州电商互联科技有限公司': 'https://www.eb.cn',
  '电商互联': 'https://www.eb.cn',
  '广东金万邦科技投资有限公司': 'https://www.jwb.cn',
  '金万邦': 'https://www.jwb.cn',
  '北京东方网景信息科技有限公司': 'https://www.east.net',
  '东方网景': 'https://www.east.net',
  '上海有孚计算机网络有限公司': 'https://www.yovole.com',
  '有孚网络': 'https://www.yovole.com',
  '北京息壤传媒文化有限公司': 'https://www.xrnic.cn',
  '息壤': 'https://www.xrnic.cn',
  '福建天鸟网络科技有限公司': 'https://www.skyniao.com',
  '天鸟': 'https://www.skyniao.com',
  '深圳市互联先锋科技有限公司': 'https://www.idcidc.com',
  '互联先锋': 'https://www.idcidc.com',
  '成都世纪东方网络通信有限公司': 'https://www.east.net',
  '厦门华商盛世网络科技有限公司': 'https://www.hsmain.com',
  '华商盛世': 'https://www.hsmain.com',
  '广州市耐思尼克信息技术有限公司': 'https://www.nicenic.com',
  '耐思尼克': 'https://www.nicenic.com',
  'nicenic': 'https://www.nicenic.com',
  // ==================== 域名交易平台 ====================
  'sedo': 'https://sedo.com',
  'afternic': 'https://www.afternic.com',
  'dan': 'https://dan.com',
  'verisign': 'https://www.verisign.com',
  'brandverity': 'https://www.markmonitor.com',
  'hupo': 'https://www.hupo.com',
  '琥珀网': 'https://www.hupo.com',
  'juming': 'https://www.juming.com',
  '聚名网': 'https://www.juming.com',
  '合肥聚名网络科技有限公司': 'https://www.juming.com',
  'yumi': 'https://www.yumi.com',
  '玉米网': 'https://www.yumi.com',
  '北京玉米网络科技有限公司': 'https://www.yumi.com',
  '北京智汇大洋科技有限公司': 'https://www.zmkai.com',
  '域名城': 'https://www.domain.cn',
  '北京无忧互联科技有限公司': 'https://www.51web.com',
  '无忧互联': 'https://www.51web.com',
  // ==================== 欧洲注册商 ====================
  'ovh': 'https://www.ovhcloud.com',
  'ionos.de': 'https://www.ionos.de',
  'strato': 'https://www.strato.de',
  'hetzner': 'https://www.hetzner.com',
  'scaleway': 'https://www.scaleway.com',
  'aruba': 'https://www.aruba.it',
  'one.com': 'https://www.one.com',
  'simply': 'https://www.simply.com',
  'loopia': 'https://www.loopia.com',
  'active24': 'https://www.active24.com',
  'wedos': 'https://www.wedos.com',
  'forpsi': 'https://www.forpsi.com',
  'dnseurope': 'https://www.dnseurope.com',
  'domaindiscount24': 'https://www.domaindiscount24.com',
  'nameshield': 'https://www.nameshield.com',
  'binero': 'https://binero.se',
  'domeneshop': 'https://domene.shop',
  'domainnameshop': 'https://www.domainnameshop.com',
  // ==================== 亚太注册商 ====================
  'onamae': 'https://www.onamae.com',
  'お名前.com': 'https://www.onamae.com',
  'gonbei': 'https://www.gonbei.jp',
  'gmo': 'https://www.gmo.jp',
  'freenom': 'https://www.freenom.com',
  'webcc': 'https://www.webcc.com',
  'crazy domains': 'https://www.crazydomains.com',
  'netregistry': 'https://www.netregistry.com.au',
  'melbourne it': 'https://www.melbourneit.com.au',
  'tppwholesale': 'https://www.tppwholesale.com.au',
  'valuedomains': 'https://www.value-domain.com',
  'star-domain': 'https://www.star-domain.jp',
  'muumuu-domain': 'https://muumuu-domain.com',
  'whoisprotectservice': 'https://www.whoisprotectservice.com',
  // ==================== 非洲/中东/其他地区注册商 ====================
  'genious': 'https://www.genious.net',
  'afrihost': 'https://www.afrihost.com',
  'hetzner.co.za': 'https://www.hetzner.co.za',
  'domains.co.za': 'https://www.domains.co.za',
  'cyberia': 'https://www.cyberia.net.sa',
  'sahara': 'https://www.sahara.ae',
  // ==================== 格鲁吉亚/高加索地区注册商 ====================
  'worldbus': 'https://www.worldbus.ge',
  'nic.ge': 'https://nic.ge',
  'grena': 'https://www.grena.ge',
  'caucasus online': 'https://www.co.ge',
  'silknet': 'https://www.silknet.com',
  'magticom': 'https://www.magticom.ge',
  // ==================== 中亚/前苏联地区注册商 ====================
  'nic.kz': 'https://nic.kz',
  'ps.kz': 'https://ps.kz',
  'hoster.kz': 'https://hoster.kz',
  'salesdomain': 'https://www.salesdomain.kz',
  'hostmaster.ua': 'https://hostmaster.ua',
  'nic.ua': 'https://nic.ua',
  'ukraine': 'https://nic.ua',
  'imena.ua': 'https://imena.ua',
  'freehost': 'https://freehost.com.ua',
  'thehost': 'https://thehost.ua',
  'fornex': 'https://fornex.com',
  'ukraine.com.ua': 'https://ukraine.com.ua',
  // ==================== 东欧/巴尔干注册商 ====================
  'nic.bg': 'https://www.register.bg',
  'superhosting': 'https://www.superhosting.bg',
  'icn.bg': 'https://www.icn.bg',
  'nic.ro': 'https://www.rotld.ro',
  'romarg': 'https://www.romarg.ro',
  'gazduire': 'https://www.gazduire.ro',
  'rnids': 'https://www.rnids.rs',
  'eunet.rs': 'https://www.eunet.rs',
  'loopia.rs': 'https://www.loopia.rs',
  'arnes': 'https://www.arnes.si',
  'domenca': 'https://www.domenca.si',
  'carnet': 'https://www.carnet.hr',
  'plus.hr': 'https://www.plus.hr',
  'akep.al': 'https://akep.al',
  // ==================== 南美洲注册商 ====================
  'registro.br': 'https://registro.br',
  'nic.br': 'https://www.nic.br',
  'uol': 'https://dominio.uol.com.br',
  'locaweb': 'https://www.locaweb.com.br',
  'kinghost': 'https://king.host',
  'hostgator.com.br': 'https://www.hostgator.com.br',
  'nic.ar': 'https://nic.ar',
  'donweb': 'https://donweb.com',
  'nic.cl': 'https://www.nic.cl',
  'webhosting.cl': 'https://www.webhosting.cl',
  '.co internet': 'https://www.cointernet.co',
  'punto.co': 'https://punto.co',
  'nic.pe': 'https://www.nic.pe',
  'hostingperu': 'https://www.hostingperu.pe',
  // ==================== 中东注册商 ====================
  'saudi nic': 'https://www.nic.net.sa',
  'solutions by stc': 'https://solutions.com.sa',
  'etisalat': 'https://www.etisalat.ae',
  'du': 'https://www.du.ae',
  'godaddy.ae': 'https://ae.godaddy.com',
  'nic.ir': 'https://www.nic.ir',
  'irtld': 'https://irnic.ir',
  'hosting.ir': 'https://hosting.ir',
  'dotil': 'https://www.domain.co.il',
  'isoc-il': 'https://www.isoc.org.il',
  // ==================== 非洲注册商 ====================
  'zadna': 'https://www.registry.net.za',
  'co.za': 'https://www.co.za',
  'web4africa': 'https://www.web4africa.net',
  'qhoster': 'https://qhoster.com',
  'nic.eg': 'https://www.egregistry.eg',
  'egyptiannic': 'https://www.egregistry.eg',
  'nic.ng': 'https://www.nira.org.ng',
  'whogohost': 'https://www.whogohost.com',
  'smartweb': 'https://smartweb.com.ng',
  'kenic': 'https://www.kenic.or.ke',
  'kenya web': 'https://kenyaweb.com',
  'tznic': 'https://tznic.or.tz',
  'anrt': 'https://www.anrt.ma',
  'nic.ma': 'https://www.nic.ma',
  'genious communications': 'https://www.genious.com',
  'nic.sn': 'https://www.nic.sn',
  'arc informatique': 'https://www.arc.sn',
};

// DNS服务商映射 (超级扩展版 - 全球大中小DNS服务商全覆盖)
const DNS_PROVIDERS: Record<string, { name: string; website: string }> = {
  // ==================== 全球顶级CDN/DNS提供商 ====================
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
  'neustar': { name: 'Neustar UltraDNS', website: 'https://www.security.neustar' },
  'akamai': { name: 'Akamai', website: 'https://www.akamai.com' },
  'edgecast': { name: 'Edgecast/Verizon', website: 'https://www.verizon.com/business' },
  'fastly': { name: 'Fastly', website: 'https://www.fastly.com' },
  'keycdn': { name: 'KeyCDN', website: 'https://www.keycdn.com' },
  'stackpath': { name: 'StackPath', website: 'https://www.stackpath.com' },
  'limelight': { name: 'Limelight', website: 'https://www.lumen.com' },
  // ==================== 注册商DNS服务 ====================
  'godaddy': { name: 'GoDaddy DNS', website: 'https://www.godaddy.com' },
  'domaincontrol': { name: 'GoDaddy DNS', website: 'https://www.godaddy.com' },
  'secureserver': { name: 'GoDaddy DNS', website: 'https://www.godaddy.com' },
  'namecheap': { name: 'Namecheap DNS', website: 'https://www.namecheap.com' },
  'registrar-servers': { name: 'Namecheap DNS', website: 'https://www.namecheap.com' },
  'dns1.registrar-servers': { name: 'Namecheap DNS', website: 'https://www.namecheap.com' },
  'worldnic': { name: 'Network Solutions', website: 'https://www.networksolutions.com' },
  'name.com': { name: 'Name.com DNS', website: 'https://www.name.com' },
  'porkbun': { name: 'Porkbun DNS', website: 'https://porkbun.com' },
  'namesilo': { name: 'NameSilo DNS', website: 'https://www.namesilo.com' },
  'squarespace': { name: 'Squarespace DNS', website: 'https://domains.squarespace.com' },
  'hover': { name: 'Hover DNS', website: 'https://www.hover.com' },
  'dynadot': { name: 'Dynadot DNS', website: 'https://www.dynadot.com' },
  'gandi': { name: 'Gandi DNS', website: 'https://www.gandi.net' },
  'epik': { name: 'Epik DNS', website: 'https://www.epik.com' },
  // ==================== 托管/云服务商DNS ====================
  'digitalocean': { name: 'DigitalOcean DNS', website: 'https://www.digitalocean.com' },
  'linode': { name: 'Linode DNS', website: 'https://www.linode.com' },
  'vultr': { name: 'Vultr DNS', website: 'https://www.vultr.com' },
  'vercel': { name: 'Vercel DNS', website: 'https://vercel.com' },
  'vercel-dns': { name: 'Vercel DNS', website: 'https://vercel.com' },
  'netlify': { name: 'Netlify DNS', website: 'https://www.netlify.com' },
  'hostinger': { name: 'Hostinger', website: 'https://www.hostinger.com' },
  'dreamhost': { name: 'DreamHost', website: 'https://www.dreamhost.com' },
  'bluehost': { name: 'Bluehost', website: 'https://www.bluehost.com' },
  'siteground': { name: 'SiteGround', website: 'https://www.siteground.com' },
  'hostgator': { name: 'HostGator', website: 'https://www.hostgator.com' },
  'ovh': { name: 'OVH', website: 'https://www.ovhcloud.com' },
  'hetzner': { name: 'Hetzner', website: 'https://www.hetzner.com' },
  'scaleway': { name: 'Scaleway', website: 'https://www.scaleway.com' },
  'ionos': { name: 'IONOS', website: 'https://www.ionos.com' },
  'strato': { name: 'STRATO', website: 'https://www.strato.de' },
  'a2hosting': { name: 'A2 Hosting', website: 'https://www.a2hosting.com' },
  'inmotionhosting': { name: 'InMotion Hosting', website: 'https://www.inmotionhosting.com' },
  'hostwinds': { name: 'Hostwinds', website: 'https://www.hostwinds.com' },
  'liquidweb': { name: 'Liquid Web', website: 'https://www.liquidweb.com' },
  'wpengine': { name: 'WP Engine', website: 'https://wpengine.com' },
  'kinsta': { name: 'Kinsta', website: 'https://kinsta.com' },
  'flywheel': { name: 'Flywheel', website: 'https://getflywheel.com' },
  'pantheon': { name: 'Pantheon', website: 'https://pantheon.io' },
  'platform.sh': { name: 'Platform.sh', website: 'https://platform.sh' },
  'render': { name: 'Render', website: 'https://render.com' },
  'railway': { name: 'Railway', website: 'https://railway.app' },
  'heroku': { name: 'Heroku', website: 'https://www.heroku.com' },
  // ==================== 专业DNS服务 ====================
  'he.net': { name: 'Hurricane Electric', website: 'https://dns.he.net' },
  'easydns': { name: 'easyDNS', website: 'https://easydns.com' },
  'constellix': { name: 'Constellix', website: 'https://constellix.com' },
  'dnsmadeeasy': { name: 'DNS Made Easy', website: 'https://dnsmadeeasy.com' },
  'rage4': { name: 'Rage4', website: 'https://rage4.com' },
  'luadns': { name: 'LuaDNS', website: 'https://luadns.com' },
  'dnssimple': { name: 'DNSimple', website: 'https://dnsimple.com' },
  'cloudns': { name: 'ClouDNS', website: 'https://www.cloudns.net' },
  'afraid': { name: 'FreeDNS', website: 'https://freedns.afraid.org' },
  'buddyns': { name: 'BuddyNS', website: 'https://www.buddyns.com' },
  'dnspark': { name: 'DNS Park', website: 'https://www.dnspark.com' },
  'no-ip': { name: 'No-IP', website: 'https://www.noip.com' },
  'noip': { name: 'No-IP', website: 'https://www.noip.com' },
  'dyndns': { name: 'DynDNS', website: 'https://dyn.com' },
  'dynu': { name: 'Dynu', website: 'https://www.dynu.com' },
  'zoneedit': { name: 'ZoneEdit', website: 'https://www.zoneedit.com' },
  // ==================== 中国云服务商DNS ====================
  'dnspod': { name: 'DNSPod', website: 'https://www.dnspod.cn' },
  'alidns': { name: '阿里云DNS', website: 'https://www.aliyun.com/product/dns' },
  'hichina': { name: '万网DNS', website: 'https://wanwang.aliyun.com' },
  'aliyun': { name: '阿里云DNS', website: 'https://www.aliyun.com/product/dns' },
  'alicdn': { name: '阿里云CDN', website: 'https://www.aliyun.com/product/cdn' },
  'kunlun': { name: '阿里云CDN', website: 'https://www.aliyun.com/product/cdn' },
  'tencentdns': { name: '腾讯云DNS', website: 'https://cloud.tencent.com/product/dns' },
  'tencent': { name: '腾讯云DNS', website: 'https://cloud.tencent.com/product/dns' },
  'myqcloud': { name: '腾讯云', website: 'https://cloud.tencent.com' },
  'huaweicloud': { name: '华为云DNS', website: 'https://www.huaweicloud.com/product/dns.html' },
  'hwclouds': { name: '华为云DNS', website: 'https://www.huaweicloud.com/product/dns.html' },
  'cdnhwc': { name: '华为云CDN', website: 'https://www.huaweicloud.com/product/cdn.html' },
  'baidubce': { name: '百度云DNS', website: 'https://cloud.baidu.com/product/dns.html' },
  'bdydns': { name: '百度云DNS', website: 'https://cloud.baidu.com/product/dns.html' },
  'jdcloud': { name: '京东云DNS', website: 'https://www.jdcloud.com' },
  'jcloudcs': { name: '京东云CDN', website: 'https://www.jdcloud.com' },
  'ksyun': { name: '金山云', website: 'https://www.ksyun.com' },
  'ksyuncdn': { name: '金山云CDN', website: 'https://www.ksyun.com' },
  'ucloud': { name: 'UCloud', website: 'https://www.ucloud.cn' },
  'ucdnhk': { name: 'UCloud CDN', website: 'https://www.ucloud.cn' },
  'qingcloud': { name: '青云', website: 'https://www.qingcloud.com' },
  'volcengine': { name: '火山引擎', website: 'https://www.volcengine.com' },
  'volces': { name: '火山引擎', website: 'https://www.volcengine.com' },
  // ==================== 中国注册商DNS ====================
  'ename': { name: '易名中国', website: 'https://www.ename.com' },
  'ename.com': { name: '易名中国', website: 'https://www.ename.com' },
  'enamedns': { name: '易名中国', website: 'https://www.ename.com' },
  '22.cn': { name: '爱名网', website: 'https://www.22.cn' },
  '22cn': { name: '爱名网', website: 'https://www.22.cn' },
  'dns22': { name: '爱名网', website: 'https://www.22.cn' },
  'west': { name: '西部数码', website: 'https://www.west.cn' },
  'west.cn': { name: '西部数码', website: 'https://www.west.cn' },
  'myhostadmin': { name: '西部数码', website: 'https://www.west.cn' },
  'xinnet': { name: '新网', website: 'https://www.xinnet.com' },
  'xinnetdns': { name: '新网', website: 'https://www.xinnet.com' },
  'dnsv': { name: 'DNS.COM', website: 'https://www.dns.com' },
  'dns.com': { name: 'DNS.COM', website: 'https://www.dns.com' },
  'iidns': { name: 'DNS.COM', website: 'https://www.dns.com' },
  'now.cn': { name: '时代互联', website: 'https://www.now.cn' },
  'nowcn': { name: '时代互联', website: 'https://www.now.cn' },
  'todaynic': { name: '时代互联', website: 'https://www.todaynic.com' },
  'cnnic': { name: 'CNNIC', website: 'https://www.cnnic.cn' },
  'bizcn': { name: '商务中国', website: 'https://www.bizcn.com' },
  'zzy.cn': { name: '中资源', website: 'https://www.zzy.cn' },
  'idc1': { name: '纳点网络', website: 'https://www.idc1.com' },
  'cndns': { name: '美橙互联', website: 'https://www.cndns.com' },
  'oray': { name: '花生壳', website: 'https://domain.oray.com' },
  'cloudxns': { name: 'CloudXNS', website: 'https://www.cloudxns.net' },
  '35.cn': { name: '35互联', website: 'https://www.35.cn' },
  '35cn': { name: '35互联', website: 'https://www.35.cn' },
  'sundns': { name: '阳光互联', website: 'https://www.sundns.com' },
  'edong': { name: '亿东', website: 'https://www.edong.com' },
  'nawang': { name: '纳网', website: 'https://www.nawang.cn' },
  'juming': { name: '聚名网', website: 'https://www.juming.com' },
  'yumi': { name: '玉米网', website: 'https://www.yumi.com' },
  // ==================== 中国CDN服务商 ====================
  'qiniu': { name: '七牛云', website: 'https://www.qiniu.com' },
  'qbox': { name: '七牛云', website: 'https://www.qiniu.com' },
  'qiniucdn': { name: '七牛云CDN', website: 'https://www.qiniu.com' },
  'upyun': { name: '又拍云', website: 'https://www.upyun.com' },
  'aicdn': { name: '又拍云', website: 'https://www.upyun.com' },
  'wangsu': { name: '网宿科技', website: 'https://www.wangsu.com' },
  'chinanetcenter': { name: '网宿科技', website: 'https://www.wangsu.com' },
  'wscdns': { name: '网宿科技', website: 'https://www.wangsu.com' },
  'chinacache': { name: '蓝汛', website: 'https://www.chinacache.com' },
  'fastcdn': { name: '快网', website: 'https://www.fastweb.com.cn' },
  'baishan': { name: '白山云', website: 'https://www.baishancloud.com' },
  // ==================== 中国互联网公司自有DNS ====================
  'taobao': { name: '阿里巴巴', website: 'https://www.alibaba.com' },
  'alibaba': { name: '阿里巴巴', website: 'https://www.alibaba.com' },
  'tmall': { name: '阿里巴巴/天猫', website: 'https://www.tmall.com' },
  '1688': { name: '阿里巴巴/1688', website: 'https://www.1688.com' },
  'aliexpress': { name: '阿里巴巴/速卖通', website: 'https://www.aliexpress.com' },
  'cainiao': { name: '菜鸟', website: 'https://www.cainiao.com' },
  'qq.com': { name: '腾讯', website: 'https://www.qq.com' },
  'weixin': { name: '腾讯/微信', website: 'https://www.wechat.com' },
  'wechat': { name: '微信', website: 'https://www.wechat.com' },
  'huawei': { name: '华为', website: 'https://www.huawei.com' },
  'hicloud': { name: '华为云', website: 'https://www.huaweicloud.com' },
  'baidu': { name: '百度', website: 'https://www.baidu.com' },
  'bdstatic': { name: '百度', website: 'https://www.baidu.com' },
  'bcebos': { name: '百度云', website: 'https://cloud.baidu.com' },
  'bytedance': { name: '字节跳动', website: 'https://www.volcengine.com' },
  'byted': { name: '字节跳动', website: 'https://www.volcengine.com' },
  'toutiao': { name: '字节跳动/今日头条', website: 'https://www.toutiao.com' },
  'douyin': { name: '字节跳动/抖音', website: 'https://www.douyin.com' },
  'snssdk': { name: '字节跳动', website: 'https://www.volcengine.com' },
  'jd.com': { name: '京东', website: 'https://www.jd.com' },
  'jdcache': { name: '京东', website: 'https://www.jd.com' },
  '360': { name: '360', website: 'https://www.360.cn' },
  'qihoo': { name: '360', website: 'https://www.360.cn' },
  'so.com': { name: '360搜索', website: 'https://www.so.com' },
  'netease': { name: '网易', website: 'https://www.163.com' },
  '163.com': { name: '网易', website: 'https://www.163.com' },
  'ntes': { name: '网易', website: 'https://www.163.com' },
  '126.com': { name: '网易', website: 'https://www.126.com' },
  'xiaomi': { name: '小米', website: 'https://www.mi.com' },
  'mi.com': { name: '小米', website: 'https://www.mi.com' },
  'miui': { name: '小米', website: 'https://www.mi.com' },
  'meituan': { name: '美团', website: 'https://www.meituan.com' },
  'dianping': { name: '美团', website: 'https://www.meituan.com' },
  'sankuai': { name: '美团', website: 'https://www.meituan.com' },
  'pinduoduo': { name: '拼多多', website: 'https://www.pinduoduo.com' },
  'pdd': { name: '拼多多', website: 'https://www.pinduoduo.com' },
  'alipay': { name: '支付宝', website: 'https://www.alipay.com' },
  'antfin': { name: '蚂蚁集团', website: 'https://www.antgroup.com' },
  'antgroup': { name: '蚂蚁集团', website: 'https://www.antgroup.com' },
  'didichuxing': { name: '滴滴出行', website: 'https://www.didiglobal.com' },
  'didiglobal': { name: '滴滴出行', website: 'https://www.didiglobal.com' },
  'bilibili': { name: '哔哩哔哩', website: 'https://www.bilibili.com' },
  'hdslb': { name: '哔哩哔哩', website: 'https://www.bilibili.com' },
  'kuaishou': { name: '快手', website: 'https://www.kuaishou.com' },
  'gifshow': { name: '快手', website: 'https://www.kuaishou.com' },
  'zhihu': { name: '知乎', website: 'https://www.zhihu.com' },
  'zhimg': { name: '知乎', website: 'https://www.zhihu.com' },
  'ctrip': { name: '携程', website: 'https://www.ctrip.com' },
  'tripcdn': { name: '携程', website: 'https://www.ctrip.com' },
  'qunar': { name: '去哪儿', website: 'https://www.qunar.com' },
  'weibo': { name: '微博', website: 'https://www.weibo.com' },
  'sinajs': { name: '新浪', website: 'https://www.sina.com.cn' },
  'sina': { name: '新浪', website: 'https://www.sina.com.cn' },
  'sohu': { name: '搜狐', website: 'https://www.sohu.com' },
  'sogou': { name: '搜狗', website: 'https://www.sogou.com' },
  'youku': { name: '优酷', website: 'https://www.youku.com' },
  'tudou': { name: '土豆', website: 'https://www.tudou.com' },
  'iqiyi': { name: '爱奇艺', website: 'https://www.iqiyi.com' },
  'qiyi': { name: '爱奇艺', website: 'https://www.iqiyi.com' },
  'letv': { name: '乐视', website: 'https://www.le.com' },
  'xunlei': { name: '迅雷', website: 'https://www.xunlei.com' },
  'oppo': { name: 'OPPO', website: 'https://www.oppo.com' },
  'vivo': { name: 'vivo', website: 'https://www.vivo.com' },
  'oneplus': { name: '一加', website: 'https://www.oneplus.com' },
  'honor': { name: '荣耀', website: 'https://www.hihonor.com' },
  'realme': { name: 'realme', website: 'https://www.realme.com' },
  'lenovo': { name: '联想', website: 'https://www.lenovo.com.cn' },
  'zol': { name: '中关村在线', website: 'https://www.zol.com.cn' },
  // ==================== 日韩DNS服务 ====================
  'sakura': { name: 'さくらインターネット', website: 'https://www.sakura.ad.jp' },
  'xserver': { name: 'Xserver', website: 'https://www.xserver.ne.jp' },
  'onamae': { name: 'お名前.com', website: 'https://www.onamae.com' },
  'gehirn': { name: 'Gehirn', website: 'https://www.gehirn.jp' },
  'iij': { name: 'IIJ', website: 'https://www.iij.ad.jp' },
  'naver': { name: 'Naver', website: 'https://www.naver.com' },
  'kakao': { name: 'Kakao', website: 'https://www.kakao.com' },
  'gabia': { name: 'Gabia', website: 'https://www.gabia.com' },
  'valueserver': { name: 'バリューサーバー', website: 'https://www.value-server.com' },
  'lolipop': { name: 'ロリポップ!', website: 'https://lolipop.jp' },
  'conoha': { name: 'ConoHa', website: 'https://www.conoha.jp' },
  // ==================== 俄罗斯/东欧DNS服务 ====================
  'yandex': { name: 'Yandex', website: 'https://www.yandex.com' },
  'mail.ru': { name: 'Mail.ru', website: 'https://mail.ru' },
  'selectel': { name: 'Selectel', website: 'https://selectel.ru' },
  'nic.ru': { name: 'RU-CENTER', website: 'https://www.nic.ru' },
  'reg.ru': { name: 'REG.RU', website: 'https://www.reg.ru' },
  'beget': { name: 'Beget', website: 'https://beget.com' },
  'timeweb': { name: 'Timeweb', website: 'https://timeweb.com' },
  'ukraine': { name: 'Ukraine.com.ua', website: 'https://ukraine.com.ua' },
  // ==================== 小众免费DNS服务 ====================
  'freedns': { name: 'FreeDNS', website: 'https://freedns.afraid.org' },
  'desec': { name: 'deSEC', website: 'https://desec.io' },
  'puredns': { name: 'PureDNS', website: 'https://puredns.org' },
  'duckdns': { name: 'Duck DNS', website: 'https://www.duckdns.org' },
  'nsupdate': { name: 'nsupdate.info', website: 'https://nsupdate.info' },
  'entrydns': { name: 'EntryDNS', website: 'https://entrydns.net' },
  'freemyip': { name: 'freemyip', website: 'https://freemyip.com' },
  'securepoint': { name: 'Securepoint', website: 'https://www.securepoint.de' },
  'zonomi': { name: 'Zonomi', website: 'https://zonomi.com' },
  'geoscaling': { name: 'GeoScaling', website: 'https://www.geoscaling.com' },
  'zilore': { name: 'Zilore', website: 'https://zilore.com' },
  'dnsexit': { name: 'DNSExit', website: 'https://www.dnsexit.com' },
  'point': { name: 'Point DNS', website: 'https://pointhq.com' },
  'pointhq': { name: 'Point DNS', website: 'https://pointhq.com' },
  // ==================== 中国小众DNS服务 ====================
  'sfn': { name: '中科三方', website: 'https://www.sfn.cn' },
  'sfn.cn': { name: '中科三方', website: 'https://www.sfn.cn' },
  'cloudns.cn': { name: '国科云', website: 'https://www.cloudns.cn' },
  'zzidc': { name: '景安网络', website: 'https://www.zzidc.com' },
  'landui': { name: '蓝队云', website: 'https://www.landui.com' },
  'zihai': { name: '资海科技', website: 'https://www.zihai.cn' },
  'dns666': { name: 'DNS666', website: 'https://dns666.com' },
  'nscloud': { name: 'NSCLOUD', website: 'https://www.nscloud.cn' },
  'eb.cn': { name: '电商互联', website: 'https://www.eb.cn' },
  'jwb': { name: '金万邦', website: 'https://www.jwb.cn' },
  'east.net': { name: '东方网景', website: 'https://www.east.net' },
  'skyniao': { name: '天鸟', website: 'https://www.skyniao.com' },
  'hsmain': { name: '华商盛世', website: 'https://www.hsmain.com' },
  'nicenic': { name: '耐思尼克', website: 'https://www.nicenic.com' },
  'yovole': { name: '有孚网络', website: 'https://www.yovole.com' },
  'xrnic': { name: '息壤', website: 'https://www.xrnic.cn' },
  // ==================== 国别ccTLD DNS服务 ====================
  'afrihost': { name: 'Afrihost', website: 'https://www.afrihost.com' },
  'co.za': { name: 'CO.ZA DNS', website: 'https://www.co.za' },
  'domains.co.za': { name: 'Domains.co.za', website: 'https://www.domains.co.za' },
  'isnic': { name: 'ISNIC (Iceland)', website: 'https://www.isnic.is' },
  'dk-hostmaster': { name: 'DK Hostmaster', website: 'https://www.dk-hostmaster.dk' },
  'nominet': { name: 'Nominet (.uk)', website: 'https://www.nominet.uk' },
  'sidn': { name: 'SIDN (.nl)', website: 'https://www.sidn.nl' },
  'afnic': { name: 'AFNIC (.fr)', website: 'https://www.afnic.fr' },
  'denic': { name: 'DENIC (.de)', website: 'https://www.denic.de' },
  'switch': { name: 'SWITCH (.ch)', website: 'https://www.switch.ch' },
  'nic.at': { name: 'nic.at (.at)', website: 'https://www.nic.at' },
  'dns.be': { name: 'DNS.be (.be)', website: 'https://www.dns.be' },
  'eurid': { name: 'EURid (.eu)', website: 'https://eurid.eu' },
  'nic.br': { name: 'NIC.br (.br)', website: 'https://registro.br' },
  'nic.mx': { name: 'NIC México', website: 'https://www.nicmexico.mx' },
  'cira': { name: 'CIRA (.ca)', website: 'https://www.cira.ca' },
  'auda': { name: 'auDA (.au)', website: 'https://www.auda.org.au' },
  'sgnic': { name: 'SGNIC (.sg)', website: 'https://www.sgnic.sg' },
  'mynic': { name: 'MYNIC (.my)', website: 'https://www.mynic.my' },
  'thnic': { name: 'THNIC (.th)', website: 'https://www.thnic.or.th' },
  'vnnic': { name: 'VNNIC (.vn)', website: 'https://vnnic.vn' },
  'idnic': { name: 'IDNIC (.id)', website: 'https://www.pandi.id' },
  'jprs': { name: 'JPRS (.jp)', website: 'https://jprs.co.jp' },
  'krnic': { name: 'KRNIC (.kr)', website: 'https://krnic.or.kr' },
  'twnic': { name: 'TWNIC (.tw)', website: 'https://www.twnic.tw' },
  'hkirc': { name: 'HKIRC (.hk)', website: 'https://www.hkirc.hk' },
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

// 格式化日期为中文格式 - 增强版
function formatDateChinese(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A' || dateStr.trim() === '') return '';
  
  try {
    let date: Date;
    const cleanStr = dateStr.trim();
    
    // 尝试解析各种日期格式
    // 1. ISO 8601: 2025-05-19T07:29:45.086917Z
    if (cleanStr.includes('T')) {
      date = new Date(cleanStr);
    }
    // 2. 中国格式: 2023-05-12 17:05:28 (空格分隔)
    else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(cleanStr)) {
      date = new Date(cleanStr.replace(' ', 'T') + 'Z');
    }
    // 3. 简短格式: 2023-05-12
    else if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      date = new Date(cleanStr + 'T00:00:00Z');
    }
    // 4. 欧洲格式: 12/05/2023 or 12.05.2023
    else if (/^\d{2}[\/\.]\d{2}[\/\.]\d{4}$/.test(cleanStr)) {
      const parts = cleanStr.split(/[\/\.]/);
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    // 5. 英文日期: 12 May 2023
    else if (/^\d{1,2}\s+\w+\s+\d{4}$/.test(cleanStr)) {
      date = new Date(cleanStr);
    }
    // 6. 其他格式尝试直接解析
    else {
      date = new Date(cleanStr);
    }
    
    if (isNaN(date.getTime())) return dateStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 检查年份合理性 (1990-2100)
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

// ==================== WHOIS 查询功能 ====================

// 从数据库获取 WHOIS 服务器
async function getWhoisServerFromDb(tld: string): Promise<string | null> {
  const now = Date.now();
  
  // 检查缓存
  if (whoisServerCache[tld] && (now - whoisCacheTime) < WHOIS_CACHE_TTL) {
    return whoisServerCache[tld];
  }
  
  try {
    const { data, error } = await supabase
      .from('whois_servers')
      .select('server')
      .eq('tld', tld)
      .single();
    
    if (error || !data?.server) {
      console.log(`No WHOIS server found in DB for .${tld}`);
      return null;
    }
    
    whoisServerCache[tld] = data.server;
    whoisCacheTime = now;
    console.log(`Found WHOIS server for .${tld}: ${data.server}`);
    return data.server;
  } catch (error) {
    console.error(`Error fetching WHOIS server for .${tld}:`, error);
    return null;
  }
}

// ccTLD 特殊查询格式映射
const CCTLD_QUERY_FORMATS: Record<string, string[]> = {
  // 格式: 'tld': ['格式1', '格式2', ...] - %s 会被替换为域名
  'ge': ['%s', 'domain %s'],
  'ru': ['%s'],
  'su': ['%s'],
  'ua': ['%s'],
  'by': ['%s'],
  'kz': ['%s'],
  'de': ['-T dn,ace %s', '%s'],
  'at': ['%s'],
  'ch': ['%s'],
  'nl': ['%s'],
  'be': ['%s'],
  'fr': ['%s'],
  'it': ['%s'],
  'es': ['%s'],
  'pt': ['%s'],
  'pl': ['%s'],
  'cz': ['%s'],
  'sk': ['%s'],
  'hu': ['%s'],
  'ro': ['%s'],
  'bg': ['%s'],
  'hr': ['%s'],
  'si': ['%s'],
  'rs': ['%s'],
  'me': ['%s'],
  'mk': ['%s'],
  'al': ['%s'],
  'gr': ['%s'],
  'tr': ['%s'],
  'il': ['%s'],
  'ae': ['%s'],
  'sa': ['%s'],
  'ir': ['%s'],
  'pk': ['%s'],
  'in': ['%s'],
  'bd': ['%s'],
  'lk': ['%s'],
  'np': ['%s'],
  'mm': ['%s'],
  'th': ['%s'],
  'vn': ['%s'],
  'my': ['%s'],
  'sg': ['%s'],
  'id': ['%s'],
  'ph': ['%s'],
  'kr': ['%s'],
  'jp': ['%s'],
  'tw': ['%s'],
  'hk': ['%s'],
  'mo': ['%s'],
  'cn': ['%s'],
  'au': ['%s'],
  'nz': ['%s'],
  'za': ['%s'],
  'eg': ['%s'],
  'ng': ['%s'],
  'ke': ['%s'],
  'gh': ['%s'],
  'tz': ['%s'],
  'ma': ['%s'],
  'dz': ['%s'],
  'tn': ['%s'],
  'ly': ['%s'],
  'sn': ['%s'],
  'ci': ['%s'],
  'cm': ['%s'],
  'br': ['%s'],
  'ar': ['%s'],
  'cl': ['%s'],
  'co': ['%s'],
  'pe': ['%s'],
  'mx': ['%s'],
  'ca': ['%s'],
  'uk': ['%s'],
  'ie': ['%s'],
  'se': ['%s'],
  'no': ['%s'],
  'dk': ['%s'],
  'fi': ['%s'],
  'ee': ['%s'],
  'lv': ['%s'],
  'lt': ['%s'],
};

// 判断是否为 ccTLD（两字母国家代码顶级域）
function isCcTld(tld: string): boolean {
  return tld.length === 2 && /^[a-z]{2}$/.test(tld.toLowerCase());
}

// 通过 TCP 端口 43 查询 WHOIS - 增强版
async function queryWhoisTcp(domain: string, server: string, timeout = 15000, queryFormat?: string): Promise<string | null> {
  try {
    const query = queryFormat ? queryFormat.replace('%s', domain) : domain;
    console.log(`Querying WHOIS via TCP: ${server}:43 for ${domain} (query: "${query}")`);
    
    // 使用 Promise.race 实现超时
    const connectPromise = Deno.connect({
      hostname: server,
      port: 43,
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), timeout);
    });
    
    let conn: Deno.Conn;
    try {
      conn = await Promise.race([connectPromise, timeoutPromise]);
    } catch (connectError) {
      console.error(`WHOIS TCP connection failed for ${server}:`, connectError);
      return null;
    }
    
    // 设置读取超时
    const readTimeoutId = setTimeout(() => {
      try { conn.close(); } catch {}
    }, timeout);
    
    // 发送查询
    const encoder = new TextEncoder();
    const fullQuery = `${query}\r\n`;
    await conn.write(encoder.encode(fullQuery));
    
    // 读取响应
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const chunks: string[] = [];
    const buffer = new Uint8Array(8192);
    
    try {
      while (true) {
        const bytesRead = await conn.read(buffer);
        if (bytesRead === null) break;
        chunks.push(decoder.decode(buffer.subarray(0, bytesRead), { stream: true }));
      }
    } catch (e) {
      // 连接关闭或读取完成
      console.log(`WHOIS TCP read completed or connection closed`);
    }
    
    clearTimeout(readTimeoutId);
    try { conn.close(); } catch {}
    
    const response = chunks.join('');
    if (response.length > 0) {
      console.log(`WHOIS TCP response received: ${response.length} bytes from ${server}`);
      // 打印响应前200字符用于调试
      console.log(`WHOIS response preview: ${response.substring(0, 200).replace(/\n/g, '\\n')}`);
      return response;
    }
    
    return null;
  } catch (error) {
    console.error(`WHOIS TCP query failed for ${server}:`, error);
    return null;
  }
}

// 尝试多种查询格式
async function queryWhoisWithFormats(domain: string, server: string, tld: string): Promise<string | null> {
  const formats = CCTLD_QUERY_FORMATS[tld] || ['%s'];
  
  for (const format of formats) {
    const response = await queryWhoisTcp(domain, server, 15000, format);
    if (response && response.length > 50) {
      // 检查是否是有效响应（不是错误消息）
      const lowerResponse = response.toLowerCase();
      if (!lowerResponse.includes('error') && 
          !lowerResponse.includes('invalid') &&
          !lowerResponse.includes('not found') &&
          !lowerResponse.includes('no match') &&
          !lowerResponse.includes('no entries found')) {
        return response;
      }
      // 即使是 "not found" 也返回，可能是域名未注册
      return response;
    }
  }
  
  return null;
}

// 通过 HTTP 查询 WHOIS (部分注册局支持)
async function queryWhoisHttp(domain: string, tld: string): Promise<string | null> {
  // 常见的 HTTP WHOIS 端点
  const httpEndpoints = [
    `https://www.whois.com/whois/${domain}`,
    `https://whois.domaintools.com/${domain}`,
  ];
  
  // 特定 TLD 的 HTTP 端点
  const tldHttpEndpoints: Record<string, string> = {
    'cn': `http://whois.cnnic.cn/WhoisServlet?queryType=Domain&domain=${domain}`,
    'hk': `https://www.hkirc.hk/whois?name=${domain}`,
    'tw': `https://whois.twnic.net.tw/whois_query.cgi?domain=${domain}`,
    'jp': `https://whois.jprs.jp/${domain}`,
    'kr': `https://whois.kr/kor/whois.jsc?keyword=${domain}`,
  };
  
  if (tldHttpEndpoints[tld]) {
    httpEndpoints.unshift(tldHttpEndpoints[tld]);
  }
  
  for (const url of httpEndpoints) {
    try {
      console.log(`Trying HTTP WHOIS: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const text = await response.text();
        if (text.length > 100 && (text.includes('Domain') || text.includes('domain') || text.includes('Registrar') || text.includes('创建日期'))) {
          console.log(`HTTP WHOIS response received: ${text.length} bytes`);
          return text;
        }
      }
    } catch (error) {
      console.log(`HTTP WHOIS failed for ${url}:`, error);
      continue;
    }
  }
  
  return null;
}

// 解析 WHOIS 文本响应 (支持多语言多格式) - 超级增强版
function parseWhoisText(text: string, domain: string): any {
  const result: any = {
    domain: domain,
    status: [],
    nameServers: [],
    dnssec: false,
    source: 'whois',
    rawData: { whoisText: text },
  };
  
  const lines = text.split('\n');
  
  // ==================== 多语言字段映射 (超级扩展版) ====================
  const fieldMappings: Record<string, string[]> = {
    registrar: [
      // 英语
      'Registrar:', 'Sponsoring Registrar:', 'registrar:', 'Registrar Name:', 
      'Registrar Organization:', 'Registrar Organisation:', 'Registrar',
      'Registered through:', 'Registration Service Provider:',
      // 中文
      '注册商:', '注册服务商:', '域名注册商:',
      // 法语
      'Bureau d\'enregistrement:', 'Registraire:',
      // 德语
      'Registrar:', 'Vergabestelle:',
      // 西班牙语
      'Registrador:',
      // 葡萄牙语
      'Registrador:',
      // 俄语
      'Регистратор:',
      // 日语
      '登録者:',
      // 韩语
      '등록대행자:',
    ],
    registrationDate: [
      // 英语
      'Creation Date:', 'Created:', 'Registration Date:', 'Domain Registration Date:', 
      'created:', 'Domain Create Date:', 'Created On:', 'Creation date:',
      'Registered:', 'Registered on:', 'Domain registered:', 'Registration Time:',
      'domain_datecreate:', 'Created Date:', 'Registered Date:',
      // 中文
      '注册日期:', '创建日期:', '注册时间:', '域名注册时间:',
      // 法语
      'Date de création:', 'Date de creation:', 'Créé le:', 'Cree le:',
      'Date d\'enregistrement:',
      // 德语
      'Erstellt am:', 'Erstellt:', 'Registrierungsdatum:', 'Erstellungsdatum:',
      // 西班牙语
      'Fecha de creación:', 'Fecha de Creacion:', 'Fecha de registro:',
      // 葡萄牙语
      'Data de criação:', 'Data de Criacao:', 'Data de registro:',
      // 俄语
      'Дата регистрации:', 'Создан:',
      // 日语
      '登録年月日:', '作成日:', '[登録年月日]',
      // 韩语
      '등록일:', '등록 일자:',
      // 荷兰语
      'Geregistreerd op:',
      // 意大利语
      'Data di creazione:',
    ],
    expirationDate: [
      // 英语
      'Expiry Date:', 'Expiration Date:', 'Registry Expiry Date:', 
      'Registrar Registration Expiration Date:', 'Expires:', 'Expires On:',
      'paid-till:', 'Valid Until:', 'Validity:', 'Expiration Time:',
      'Domain Expiration Date:', 'Renewal Date:', 'Renewal date:',
      'Expire Date:', 'Expires date:', 'Expiration:', 'free-date:',
      // 中文
      '过期日期:', '到期日期:', '过期时间:', '域名到期时间:', '有效期至:',
      // 法语
      'Date d\'expiration:', 'Date d\'expiration:', 'Expire le:',
      'Date d\'échéance:', 'Date de fin:',
      // 德语
      'Gültig bis:', 'Gultig bis:', 'Ablaufdatum:', 'Enddatum:',
      // 西班牙语
      'Fecha de expiración:', 'Fecha de vencimiento:', 'Fecha de caducidad:',
      // 葡萄牙语
      'Data de expiração:', 'Data de vencimento:',
      // 俄语
      'Дата окончания:', 'Оплачен до:',
      // 日语
      '有効期限:', '満了日:',
      // 韩语
      '등록 만료일:', '만료일:',
      // 荷兰语
      'Vervalt op:',
      // 意大利语
      'Data di scadenza:',
    ],
    lastUpdated: [
      // 英语
      'Updated Date:', 'Last Updated:', 'Last Modified:', 'Modified:',
      'Updated:', 'Last Update:', 'Domain Last Updated Date:', 'Changed:',
      'Last updated:', 'Last update of RDAP database:',
      // 中文
      '更新日期:', '最后更新:', '最近更新:',
      // 法语
      'Dernière modification:', 'Derniere modification:', 'Mis à jour:',
      'Dernière mise à jour:', 'Modifié le:',
      // 德语
      'Zuletzt geändert:', 'Letzte Aktualisierung:', 'Aktualisiert am:',
      // 西班牙语
      'Última actualización:', 'Fecha de actualización:',
      // 日语
      '最終更新:', '更新日:',
      // 韩语
      '최근 수정일:',
    ],
    nameServer: [
      // 英语
      'Name Server:', 'Nameserver:', 'nserver:', 'DNS:', 'Name Server',
      'NS:', 'Nameservers:', 'Name servers:', 'DNS servers:', 'Host Name:',
      // 中文
      '域名服务器:', 'DNS服务器:', '名称服务器:',
      // 法语
      'Serveur de noms:', 'Serveurs de noms:', 'Serveur DNS:',
      // 德语
      'Nameserver:', 'Namenserver:',
      // 西班牙语
      'Servidor de nombres:', 'Servidores DNS:',
      // 日语
      'ネームサーバ:', 'ネームサーバー:',
      // 韩语
      '네임서버:',
    ],
    status: [
      // 英语
      'Domain Status:', 'Status:', 'status:', 'State:', 'Domain status:',
      // 中文
      '域名状态:', '状态:',
      // 法语
      'Statut:', 'État:', 'Etat:',
      // 德语
      'Status:', 'Zustand:',
      // 西班牙语
      'Estado:',
      // 日语
      '状態:',
    ],
    registrantName: [
      // 英语
      'Registrant Name:', 'Registrant:', 'Registrant Contact Name:',
      'Person:', 'Owner:', 'Holder:', 'Domain Holder:', 'Holder Name:',
      'Owner Name:', 'Registrant Contact:',
      // 中文
      '注册人:', '持有人:', '域名持有者:', '所有者:',
      // 法语 (注意: "Nom:" 需要在 HOLDER 区块内才匹配，避免匹配 "Nom de domaine:")
      'Titulaire:', 'Propriétaire:',
      // 德语
      'Inhaber:', 'Eigentümer:', 'Domaininhaber:',
      // 西班牙语
      'Titular:', 'Propietario:',
      // 日语
      '登録者名:', '登録者:',
    ],
    // 特殊法语字段 (仅在联系人区块内有效)
    registrantNameFrench: ['Nom:'],
    registrantOrg: [
      // 英语
      'Registrant Organization:', 'Registrant Organisation:', 
      'Registrant Contact Organization:', 'Organization:', 'Organisation:',
      'Org:', 'Registrant Org:',
      // 中文
      '注册人组织:', '组织:', '注册机构:',
      // 法语
      'Organisation:', 'Organisme:',
      // 德语
      'Organisation:', 'Firma:',
      // 日语
      '組織名:',
    ],
    registrantCountry: [
      // 英语
      'Registrant Country:', 'Registrant Country/Economy:', 'Country:',
      'Registrant Country Code:', 'Country Code:',
      // 中文
      '注册人国家:', '国家:', '国家/地区:',
      // 法语
      'Pays:',
      // 德语
      'Land:',
      // 西班牙语
      'País:',
    ],
    registrantEmail: [
      // 英语
      'Registrant Email:', 'Registrant Contact Email:', 'Email:',
      'e-mail:', 'E-mail:', 'Contact Email:', 'Admin Email:',
      // 中文
      '注册人邮箱:', '邮箱:', '联系邮箱:', '电子邮件:',
      // 法语
      'Courriel:', 'E-mail:', 'Adresse électronique:',
      // 德语
      'E-Mail:', 'Email:',
    ],
    registrantPhone: [
      // 英语
      'Registrant Phone:', 'Phone:', 'Tel:', 'Telephone:',
      // 中文
      '电话:', '联系电话:',
      // 法语
      'Téléphone:', 'Telephone:', 'Tel:',
      // 德语
      'Telefon:',
    ],
    registrantAddress: [
      // 英语
      'Registrant Street:', 'Address:', 'Street:', 'Registrant Address:',
      // 中文
      '地址:', '注册人地址:',
      // 法语
      'Adresse:',
      // 德语
      'Adresse:', 'Straße:',
    ],
    registrantCity: [
      // 英语
      'Registrant City:', 'City:',
      // 中文
      '城市:',
      // 法语
      'Ville:',
      // 德语
      'Stadt:',
    ],
    ianaId: ['Registrar IANA ID:', 'IANA ID:'],
    dnssec: ['DNSSEC:', 'dnssec:', 'DNSSEC Status:', 'DNSSEC signed:'],
  };
  
  // 当前正在解析的联系人类型
  let currentContactType: string | null = null;
  
  // 辅助函数: 清理提取的值
  const cleanValue = (value: string): string => {
    return value.trim()
      .replace(/^\s*:\s*/, '') // 移除开头的冒号
      .replace(/\s+/g, ' ') // 规范化空格
      .trim();
  };
  
  // 辅助函数: 检测字段匹配
  const matchField = (line: string, patterns: string[]): string | null => {
    const lowerLine = line.toLowerCase();
    for (const pattern of patterns) {
      const lowerPattern = pattern.toLowerCase().replace(':', '');
      // 尝试精确匹配带冒号的格式
      if (lowerLine.startsWith(lowerPattern + ':')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          return cleanValue(line.substring(colonIndex + 1));
        }
      }
      // 尝试匹配不带冒号的格式
      if (lowerLine.startsWith(lowerPattern) && line.includes(':')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          return cleanValue(line.substring(colonIndex + 1));
        }
      }
    }
    return null;
  };
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('%') || trimmedLine.startsWith('#') || trimmedLine.startsWith('>>>') || trimmedLine.startsWith('===')) continue;
    
    // 检测联系人区块
    if (trimmedLine.includes('[HOLDER]') || trimmedLine.includes('[REGISTRANT]')) {
      currentContactType = 'registrant';
      continue;
    } else if (trimmedLine.includes('[ADMIN_C]') || trimmedLine.includes('[TECH_C]') || trimmedLine.includes('[BILLING_C]')) {
      currentContactType = null;
      continue;
    }
    
    // 解析注册商
    if (!result.registrar) {
      const value = matchField(trimmedLine, fieldMappings.registrar);
      if (value) result.registrar = value;
    }
    
    // 解析注册日期
    if (!result.registrationDate) {
      const value = matchField(trimmedLine, fieldMappings.registrationDate);
      if (value) result.registrationDate = value;
    }
    
    // 解析过期日期
    if (!result.expirationDate) {
      const value = matchField(trimmedLine, fieldMappings.expirationDate);
      if (value) result.expirationDate = value;
    }
    
    // 解析更新日期
    if (!result.lastUpdated) {
      const value = matchField(trimmedLine, fieldMappings.lastUpdated);
      if (value) result.lastUpdated = value;
    }
    
    // 解析域名服务器
    const nsValue = matchField(trimmedLine, fieldMappings.nameServer);
    if (nsValue) {
      // 清理NS值，移除前缀和多余字符
      const cleanNs = nsValue.replace(/^:\s*/, '').toLowerCase().trim();
      if (cleanNs && !result.nameServers.includes(cleanNs) && cleanNs.includes('.')) {
        result.nameServers.push(cleanNs);
      }
    }
    
    // 解析状态
    const statusValue = matchField(trimmedLine, fieldMappings.status);
    if (statusValue) {
      // 提取状态码（去掉URL部分）
      const statusCode = statusValue.split(' ')[0].split('http')[0].trim();
      if (statusCode && !result.status.includes(statusCode)) {
        result.status.push(statusCode);
      }
    }
    
    // 解析注册人信息 (仅在 HOLDER/REGISTRANT 区块或无区块标记时)
    if (currentContactType === 'registrant' || currentContactType === null) {
      // 注册人姓名
      if (!result.registrant?.name) {
        let value = matchField(trimmedLine, fieldMappings.registrantName);
        // 法语 "Nom:" 字段只在明确的 HOLDER 区块内匹配，避免匹配 "Nom de domaine:"
        if (!value && currentContactType === 'registrant') {
          value = matchField(trimmedLine, fieldMappings.registrantNameFrench || []);
        }
        if (value && !value.toLowerCase().includes('domaine')) {
          if (!result.registrant) result.registrant = {};
          result.registrant.name = value;
        }
      }
      
      // 注册人组织
      if (!result.registrant?.organization) {
        const value = matchField(trimmedLine, fieldMappings.registrantOrg);
        if (value) {
          if (!result.registrant) result.registrant = {};
          result.registrant.organization = value;
        }
      }
      
      // 注册人国家
      if (!result.registrant?.country) {
        const value = matchField(trimmedLine, fieldMappings.registrantCountry);
        if (value) {
          if (!result.registrant) result.registrant = {};
          result.registrant.country = value;
        }
      }
      
      // 注册人邮箱
      if (!result.registrant?.email) {
        const value = matchField(trimmedLine, fieldMappings.registrantEmail);
        if (value && value.includes('@')) {
          if (!result.registrant) result.registrant = {};
          result.registrant.email = value;
        }
      }
      
      // 注册人电话
      if (!result.registrant?.phone) {
        const value = matchField(trimmedLine, fieldMappings.registrantPhone);
        if (value) {
          if (!result.registrant) result.registrant = {};
          result.registrant.phone = value;
        }
      }
      
      // 注册人城市
      if (!result.registrant?.city) {
        const value = matchField(trimmedLine, fieldMappings.registrantCity);
        if (value) {
          if (!result.registrant) result.registrant = {};
          result.registrant.city = value;
        }
      }
    }
    
    // 解析 IANA ID
    if (!result.registrarIanaId) {
      const value = matchField(trimmedLine, fieldMappings.ianaId);
      if (value) result.registrarIanaId = value;
    }
    
    // 解析 DNSSEC
    const dnssecValue = matchField(trimmedLine, fieldMappings.dnssec);
    if (dnssecValue) {
      const lower = dnssecValue.toLowerCase();
      result.dnssec = lower === 'yes' || lower === 'signed' || lower === 'signeddelegation' || 
                      lower === 'true' || lower === 'active' || lower === 'enabled';
    }
  }
  
  // ==================== 正则后备提取 (当标准解析失败时) ====================
  
  // 日期正则模式 (支持多种格式)
  const datePatterns = [
    // ISO 8601: 2025-05-19T07:29:45.086917Z
    /(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/,
    // 标准格式: 2023-05-12 17:05:28
    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/,
    // 简短格式: 2023-05-12
    /(\d{4}-\d{2}-\d{2})/,
    // 欧洲格式: 12/05/2023 or 12.05.2023
    /(\d{2}[\/\.]\d{2}[\/\.]\d{4})/,
    // 文字格式: 12 May 2023
    /(\d{1,2}\s+\w+\s+\d{4})/,
  ];
  
  // 如果没有注册日期，尝试正则提取
  if (!result.registrationDate) {
    const creationPatterns = [
      /Date de cr[ée]ation[:\s]+([^\r\n]+)/i,
      /Cre(?:ated|ation)[:\s]+([^\r\n]+)/i,
      /Registration[:\s]+(?:Date[:\s]+)?([^\r\n]+)/i,
      /注册(?:日期|时间)[:\s]*([^\r\n]+)/i,
    ];
    
    for (const pattern of creationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1].trim();
        for (const datePattern of datePatterns) {
          const dateMatch = dateStr.match(datePattern);
          if (dateMatch) {
            result.registrationDate = dateMatch[1];
            break;
          }
        }
        if (result.registrationDate) break;
        // 如果没有匹配日期格式，直接使用提取的值
        if (!result.registrationDate && dateStr.length < 50) {
          result.registrationDate = dateStr;
        }
      }
      if (result.registrationDate) break;
    }
  }
  
  // 如果没有过期日期，尝试正则提取
  if (!result.expirationDate) {
    const expirationPatterns = [
      /Date d['']expiration[:\s]+([^\r\n]+)/i,
      /Expir(?:y|ation|es)[:\s]+(?:Date[:\s]+)?([^\r\n]+)/i,
      /Valid Until[:\s]+([^\r\n]+)/i,
      /(?:过期|到期)(?:日期|时间)[:\s]*([^\r\n]+)/i,
    ];
    
    for (const pattern of expirationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1].trim();
        for (const datePattern of datePatterns) {
          const dateMatch = dateStr.match(datePattern);
          if (dateMatch) {
            result.expirationDate = dateMatch[1];
            break;
          }
        }
        if (result.expirationDate) break;
        if (!result.expirationDate && dateStr.length < 50) {
          result.expirationDate = dateStr;
        }
      }
      if (result.expirationDate) break;
    }
  }
  
  // 如果没有更新日期，尝试正则提取
  if (!result.lastUpdated) {
    const updatePatterns = [
      /Derni[èe]re modification[:\s]+([^\r\n]+)/i,
      /(?:Last\s+)?(?:Updated?|Modified)[:\s]+([^\r\n]+)/i,
      /(?:最后|最近)(?:更新|修改)[:\s]*([^\r\n]+)/i,
    ];
    
    for (const pattern of updatePatterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[1].trim();
        for (const datePattern of datePatterns) {
          const dateMatch = dateStr.match(datePattern);
          if (dateMatch) {
            result.lastUpdated = dateMatch[1];
            break;
          }
        }
        if (result.lastUpdated) break;
        if (!result.lastUpdated && dateStr.length < 50) {
          result.lastUpdated = dateStr;
        }
      }
      if (result.lastUpdated) break;
    }
  }
  
  // 如果没有NS，尝试正则提取 - 超级增强版
  if (result.nameServers.length === 0) {
    const nsPatterns = [
      // 标准格式
      /Serveur[s]?\s*(?:de\s*)?noms?[:\s]+([^\r\n]+)/gi,
      /Name[s]?\s*Server[s]?[:\s]+([^\r\n]+)/gi,
      /nserver[:\s]+([^\r\n]+)/gi,
      /DNS[:\s]+([^\r\n]+)/gi,
      /Host\s*Name[:\s]+([^\r\n]+)/gi,
      // 中文
      /域名服务器[:\s]*([^\r\n]+)/gi,
      /DNS服务器[:\s]*([^\r\n]+)/gi,
      /名称服务器[:\s]*([^\r\n]+)/gi,
      // 日韩
      /ネームサーバ[ー]?[:\s]*([^\r\n]+)/gi,
      /네임서버[:\s]*([^\r\n]+)/gi,
      // 俄语
      /Сервер\s*имен[:\s]*([^\r\n]+)/gi,
      // 标签格式 (如 NS1:, ns1:)
      /NS\d*[:\s]+([^\r\n]+)/gi,
      // 阿拉伯语
      /خادم\s*الأسماء[:\s]*([^\r\n]+)/gi,
    ];
    
    for (const pattern of nsPatterns) {
      let match;
      pattern.lastIndex = 0; // 重置正则状态
      while ((match = pattern.exec(text)) !== null) {
        let ns = match[1].trim().toLowerCase();
        // 清理常见前缀和后缀
        ns = ns.replace(/^:\s*/, '').replace(/\s+.*$/, '').trim();
        // 验证是否为有效域名格式
        if (ns && ns.includes('.') && !ns.includes(' ') && ns.length < 100 && !result.nameServers.includes(ns)) {
          result.nameServers.push(ns);
        }
      }
    }
    
    // 尝试直接匹配看起来像NS的域名 (如 dns1.xxx.com, ns1.xxx.com)
    const directNsPattern = /\b((?:dns|ns|name)\d*\.[a-z0-9][a-z0-9.-]+\.[a-z]{2,})\b/gi;
    let directMatch;
    while ((directMatch = directNsPattern.exec(text)) !== null) {
      const ns = directMatch[1].toLowerCase();
      if (!result.nameServers.includes(ns)) {
        result.nameServers.push(ns);
      }
    }
  }
  
  // 如果没有状态，尝试正则提取
  if (result.status.length === 0) {
    const statusPatterns = [
      /Statut[:\s]+([^\r\n]+)/gi,
      /Status[:\s]+([^\r\n]+)/gi,
      /(?:状态|域名状态)[:\s]*([^\r\n]+)/gi,
      /State[:\s]+([^\r\n]+)/gi,
      /État[:\s]+([^\r\n]+)/gi,
      /Estado[:\s]+([^\r\n]+)/gi,
    ];
    
    for (const pattern of statusPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        const status = match[1].trim().split(/\s+/)[0].replace(/http.*/i, '').trim();
        if (status && !result.status.includes(status)) {
          result.status.push(status);
        }
      }
    }
  }
  
  // 如果没有注册人信息，尝试正则提取 - 增强版
  if (!result.registrant || !result.registrant.name) {
    const registrantPatterns = [
      // 英文
      /Registrant(?:\s+Name)?[:\s]+([^\r\n]+)/i,
      /(?:Domain\s+)?Holder(?:\s+Name)?[:\s]+([^\r\n]+)/i,
      /Owner(?:\s+Name)?[:\s]+([^\r\n]+)/i,
      /Person[:\s]+([^\r\n]+)/i,
      // 中文
      /(?:注册人|持有人|所有者)[:\s]*([^\r\n]+)/i,
      /域名持有者[:\s]*([^\r\n]+)/i,
      // 法语
      /Titulaire[:\s]+([^\r\n]+)/i,
      /Propriétaire[:\s]+([^\r\n]+)/i,
      // 德语
      /Inhaber[:\s]+([^\r\n]+)/i,
      /Eigentümer[:\s]+([^\r\n]+)/i,
      // 日语
      /登録者名?[:\s]*([^\r\n]+)/i,
      // 韩语
      /등록인[:\s]*([^\r\n]+)/i,
      // 俄语
      /Владелец[:\s]*([^\r\n]+)/i,
    ];
    
    for (const pattern of registrantPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // 排除常见的非姓名值
        if (name && name.length < 100 && 
            !name.toLowerCase().includes('redacted') &&
            !name.toLowerCase().includes('privacy') &&
            !name.toLowerCase().includes('whoisguard') &&
            !name.toLowerCase().includes('not disclosed')) {
          if (!result.registrant) result.registrant = {};
          result.registrant.name = name;
          break;
        }
      }
    }
  }
  
  // 如果没有注册人邮箱，尝试正则提取
  if (!result.registrant?.email) {
    const emailPattern = /(?:Registrant\s+)?(?:Contact\s+)?Email[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
    const emailMatch = text.match(emailPattern);
    if (emailMatch && emailMatch[1]) {
      if (!result.registrant) result.registrant = {};
      result.registrant.email = emailMatch[1].trim();
    }
  }
  
  // 翻译状态码
  result.statusTranslated = result.status.map((s: string) => translateStatus(s));
  
  // 获取注册商官网
  result.registrarWebsite = getRegistrarWebsite(result.registrar);
  
  // 识别DNS服务商
  result.dnsProvider = identifyDnsProvider(result.nameServers);
  
  // 检测隐私保护
  result.privacyProtection = detectPrivacyProtection(result.registrant, text);
  
  // 计算标签
  result.ageLabel = getAgeLabel(result.registrationDate);
  result.updateLabel = getUpdateLabel(result.status);
  result.remainingDays = getRemainingDays(result.expirationDate);
  
  // 格式化日期
  result.registrationDateFormatted = formatDateChinese(result.registrationDate);
  result.expirationDateFormatted = formatDateChinese(result.expirationDate);
  result.lastUpdatedFormatted = formatDateChinese(result.lastUpdated);
  
  return result;
}

// 从 IANA WHOIS 获取 TLD 的 WHOIS 服务器
async function getWhoisServerFromIana(tld: string): Promise<string | null> {
  try {
    console.log(`Querying IANA WHOIS for .${tld} WHOIS server`);
    const response = await queryWhoisTcp(tld, 'whois.iana.org', 10000);
    if (response) {
      const whoisMatch = response.match(/whois:\s*(\S+)/i);
      if (whoisMatch && whoisMatch[1]) {
        const server = whoisMatch[1].trim();
        console.log(`IANA returned WHOIS server for .${tld}: ${server}`);
        return server;
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to get WHOIS server from IANA for .${tld}:`, error);
    return null;
  }
}

// 主 WHOIS 查询函数 - 增强版
async function queryWhois(domain: string): Promise<any> {
  const tld = getTld(domain);
  const isCctld = isCcTld(tld);
  
  console.log(`Starting WHOIS query for ${domain} (TLD: .${tld}, ccTLD: ${isCctld})`);
  
  // 1. 从本地数据库获取 WHOIS 服务器
  let whoisServer = await getWhoisServerFromDb(tld);
  
  // 2. 如果数据库没有，尝试从 IANA 获取
  if (!whoisServer) {
    console.log(`No WHOIS server in DB for .${tld}, trying IANA...`);
    whoisServer = await getWhoisServerFromIana(tld);
  }
  
  // 3. 尝试本地/IANA 获取的服务器
  if (whoisServer) {
    console.log(`Using WHOIS server: ${whoisServer} for .${tld}`);
    
    // 对于 ccTLD，使用多格式查询
    const tcpResponse = isCctld 
      ? await queryWhoisWithFormats(domain, whoisServer, tld)
      : await queryWhoisTcp(domain, whoisServer, 15000);
    
    if (tcpResponse) {
      const parsed = parseWhoisText(tcpResponse, domain);
      // 检查是否获取到有效数据
      if (parsed.registrar || parsed.registrationDate || parsed.nameServers.length > 0) {
        console.log('WHOIS TCP query successful');
        return parsed;
      }
      // 检查是否是 "not found" 响应
      const lowerResponse = tcpResponse.toLowerCase();
      if (lowerResponse.includes('not found') || 
          lowerResponse.includes('no match') ||
          lowerResponse.includes('no entries') ||
          lowerResponse.includes('no data found') ||
          lowerResponse.includes('domain not registered')) {
        console.log('WHOIS server indicates domain not found');
        return { ...parsed, domainNotFound: true };
      }
    }
  }
  
  // 4. 对于 gTLD，尝试公共 WHOIS 服务器
  // 注意：VeriSign 只处理 .com/.net/.edu，不要用于 ccTLD
  if (!isCctld) {
    const gTldServers: Record<string, string[]> = {
      'com': ['whois.verisign-grs.com'],
      'net': ['whois.verisign-grs.com'],
      'org': ['whois.pir.org'],
      'info': ['whois.afilias.net'],
      'biz': ['whois.biz'],
      'mobi': ['whois.dotmobiregistry.net'],
      'name': ['whois.nic.name'],
      'pro': ['whois.registrypro.pro'],
      'asia': ['whois.nic.asia'],
      'tel': ['whois.nic.tel'],
      'xxx': ['whois.nic.xxx'],
      'club': ['whois.nic.club'],
      'xyz': ['whois.nic.xyz'],
      'top': ['whois.nic.top'],
      'wang': ['whois.nic.wang'],
      'vip': ['whois.nic.vip'],
      'win': ['whois.nic.win'],
      'bid': ['whois.nic.bid'],
      'site': ['whois.nic.site'],
      'online': ['whois.nic.online'],
      'tech': ['whois.nic.tech'],
      'store': ['whois.nic.store'],
      'shop': ['whois.nic.shop'],
      'app': ['whois.nic.google'],
      'dev': ['whois.nic.google'],
      'io': ['whois.nic.io'],
      'co': ['whois.nic.co'],
      'me': ['whois.nic.me'],
      'tv': ['whois.nic.tv'],
      'cc': ['whois.nic.cc'],
      'ws': ['whois.website.ws'],
      'la': ['whois.nic.la'],
    };
    
    const tldServers = gTldServers[tld] || ['whois.verisign-grs.com', 'whois.internic.net'];
    
    for (const server of tldServers) {
      const tcpResponse = await queryWhoisTcp(domain, server, 15000);
      if (tcpResponse) {
        // 检查是否有重定向信息
        const referMatch = tcpResponse.match(/Registrar WHOIS Server:\s*(\S+)/i) ||
                           tcpResponse.match(/whois:\s*(\S+)/i) ||
                           tcpResponse.match(/refer:\s*(\S+)/i);
        
        if (referMatch && referMatch[1]) {
          const referServer = referMatch[1].trim();
          console.log(`Found referral WHOIS server: ${referServer}`);
          const referResponse = await queryWhoisTcp(domain, referServer, 15000);
          if (referResponse) {
            const parsed = parseWhoisText(referResponse, domain);
            if (parsed.registrar || parsed.registrationDate) {
              console.log('WHOIS referral query successful');
              return parsed;
            }
          }
        }
        
        const parsed = parseWhoisText(tcpResponse, domain);
        if (parsed.registrar || parsed.registrationDate) {
          console.log('WHOIS gTLD server query successful');
          return parsed;
        }
      }
    }
  }
  
  // 5. 对于 ccTLD，尝试构造标准 WHOIS 服务器地址
  if (isCctld && !whoisServer) {
    const guessedServers = [
      `whois.nic.${tld}`,
      `whois.${tld}`,
      `whois.registry.${tld}`,
    ];
    
    for (const server of guessedServers) {
      console.log(`Trying guessed ccTLD WHOIS server: ${server}`);
      const tcpResponse = await queryWhoisWithFormats(domain, server, tld);
      if (tcpResponse && tcpResponse.length > 100) {
        const parsed = parseWhoisText(tcpResponse, domain);
        if (parsed.registrar || parsed.registrationDate || parsed.nameServers.length > 0) {
          console.log(`Guessed WHOIS server ${server} successful`);
          return parsed;
        }
      }
    }
  }
  
  // 6. 尝试 HTTP WHOIS 作为最后手段
  const httpResponse = await queryWhoisHttp(domain, tld);
  if (httpResponse) {
    const parsed = parseWhoisText(httpResponse, domain);
    if (parsed.registrar || parsed.registrationDate || parsed.nameServers.length > 0) {
      console.log('HTTP WHOIS query successful');
      return parsed;
    }
  }
  
  console.log(`All WHOIS methods failed for ${domain}`);
  return null;
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
    const tld = getTld(normalizedDomain);
    
    // 并行查询价格
    const pricingPromise = queryPricing(normalizedDomain);
    
    let domainData: any = null;
    let querySource = '';
    
    // 策略: RDAP 优先 -> WHOIS 兜底
    try {
      // 1. 首先尝试 RDAP
      console.log(`Attempting RDAP query for ${normalizedDomain}`);
      const rdapData = await queryRdap(normalizedDomain);
      domainData = parseRdapResponse(rdapData, rdapData);
      querySource = 'rdap';
      console.log('RDAP query successful');
    } catch (rdapError: any) {
      console.log(`RDAP failed: ${rdapError.message}`);
      
      // 检查是否是"域名不存在"错误
      if (rdapError.message === 'domain_not_found') {
        // 先尝试 WHOIS 确认
        console.log('RDAP returned not found, trying WHOIS to confirm...');
        const whoisData = await queryWhois(normalizedDomain);
        
        if (whoisData && (whoisData.registrar || whoisData.registrationDate)) {
          // WHOIS 找到了数据，说明域名存在
          domainData = whoisData;
          querySource = 'whois';
          console.log('WHOIS found domain data despite RDAP 404');
        } else {
          // 确认域名不存在
          const pricingResult = await pricingPromise;
          return new Response(
            JSON.stringify({ 
              error: `域名 ${normalizedDomain} 未注册或不存在`,
              errorType: 'domain_not_found',
              isAvailable: true,
              pricing: pricingResult,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // 2. RDAP 不支持或失败，尝试 WHOIS
        console.log(`Falling back to WHOIS for .${tld}`);
        const whoisData = await queryWhois(normalizedDomain);
        
        if (whoisData && (whoisData.registrar || whoisData.registrationDate || whoisData.nameServers?.length > 0)) {
          domainData = whoisData;
          querySource = 'whois';
          console.log('WHOIS fallback successful');
        } else {
          // 所有查询都失败
          console.log('All query methods failed');
          const pricingResult = await pricingPromise;
          return new Response(
            JSON.stringify({ 
              error: `无法查询 .${tld} 域名，RDAP 和 WHOIS 均不可用`,
              errorType: 'all_methods_failed',
              pricing: pricingResult,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // 获取价格结果
    const pricingResult = await pricingPromise;
    
    const result = {
      primary: domainData,
      pricing: pricingResult,
      isRegistered: true,
      querySource: querySource,
    };
    
    console.log(`Domain lookup successful via ${querySource}`);
    
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
