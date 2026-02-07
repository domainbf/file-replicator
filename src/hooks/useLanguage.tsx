import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  zh: {
    // Header
    'app.title': 'RDAP 域名查询',
    'app.description': '输入域名或 IDN。我们将验证、规范化整理信息显示。如果 RDAP 不可用，将回退到 WHOIS。',
    'app.login': '登录',
    'app.logout': '退出登录',
    
    // Search
    'search.placeholder': '输入域名 (如 example.com)',
    'search.button': '查询',
    'search.searching': '查询中...',
    
    // Pricing
    'pricing.register': '注册',
    'pricing.renew': '续费',
    'pricing.premium': '溢价',
    'pricing.yes': '是',
    'pricing.no': '否',
    'pricing.registered': '已注册',
    'pricing.available': '可注册',
    
    // Domain Info
    'domain.info': '域名信息',
    'domain.standard': '标准',
    'domain.data': '数据',
    'domain.registrar': '注册商',
    'domain.registrationDate': '注册时间',
    'domain.updateDate': '更新时间',
    'domain.expirationDate': '过期时间',
    'domain.remainingDays': '剩余{days}天',
    'domain.website': '官网',
    
    // Registrant
    'registrant.title': '注册人信息',
    'registrant.name': '姓名',
    'registrant.organization': '组织',
    'registrant.country': '国家',
    'registrant.email': '邮箱',
    'registrant.unavailable': '注册人信息不可用',
    'registrant.privacyProtected': '注册人信息已启用隐私保护',
    
    // Status
    'status.title': '域名状态',
    'status.raw': '原始状态码',
    'status.rawJson': '原始JSON数据',
    
    // DNS
    'dns.title': '域名服务器',
    'dns.copy': '复制',
    'dns.copied': '已复制',
    'dns.noServers': '暂无域名服务器信息',
    
    // Security
    'security.dnssec': 'DNSSEC',
    'security.enabled': '已启用',
    'security.disabled': '未启用',
    'security.privacyProtection': 'WHOIS隐私保护已启用',
    
    // Data Source
    'source.title': '数据来源',
    'source.protocol': '协议',
    'source.rawData': '原始数据',
    'source.copyJson': '复制JSON',
    
    // Share
    'share.screenshot': '截图',
    'share.share': '分享',
    'share.saveImage': '保存图片',
    'share.shareWith': '与他人分享结果',
    'share.generateFailed': '截图生成失败',
    'share.imageSaved': '图片已保存',
    
    // History & Favorites
    'history.title': '查询历史',
    'history.empty': '暂无查询记录',
    'history.loginRequired': '登录后可查看查询历史中',
    'favorites.title': '收藏夹',
    'favorites.empty': '暂无收藏',
    'favorites.loginRequired': '登录后可查看收藏',
    'favorites.add': '收藏',
    'favorites.added': '已收藏',
    'favorites.remove': '已从收藏中移除',
    'favorites.addSuccess': '已添加到收藏',
    
    // Expiration
    'expiration.expired': '已过期',
    'expiration.alert': '域名到期提醒',
    'expiration.alertMessage': '您有 {count} 个域名将在30天内到期，请及时续费！',
    
    // Errors
    'error.enterDomain': '请输入要查询的域名',
    'error.invalidFormat': '域名格式无效，请输入正确的域名格式（如 example.com）',
    'error.serviceUnavailable': '查询服务暂时不可用，请稍后重试',
    'error.notFound': '未找到该域名的信息',
    'error.queryFailed': '查询失败，请稍后重试',
    'error.loginRequired': '请先登录',
    'error.operationFailed': '操作失败',
    
    // Auth
    'auth.title': '登录或注册',
    'auth.login': '登录',
    'auth.register': '注册',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'auth.loginButton': '登录',
    'auth.registerButton': '注册',
    'auth.backHome': '返回首页',
    'auth.loginSuccess': '登录成功',
    'auth.registerSuccess': '注册成功，请检查邮箱完成验证',
    
    // Footer
    'footer.copyright': '© 2026 RDAP Domain Lookup',
    'footer.about': '关于我',
    'footer.register': '域名注册',
    'footer.shortlink': '短链接',
    'footer.updates': '我的动态',
    
    // Misc
    'misc.copySuccess': '已复制到剪贴板',
    'misc.copyFailed': '复制失败',
    'misc.noData': '暂无数据',
    'misc.unknown': '未知',
    'misc.loading': '正在查询中...',
  },
  en: {
    // Header
    'app.title': 'RDAP Domain Lookup',
    'app.description': 'Enter domain or IDN. We validate, normalize and display the info. Falls back to WHOIS if RDAP unavailable.',
    'app.login': 'Login',
    'app.logout': 'Logout',
    
    // Search
    'search.placeholder': 'Enter domain (e.g. example.com)',
    'search.button': 'Search',
    'search.searching': 'Searching...',
    
    // Pricing
    'pricing.register': 'Register',
    'pricing.renew': 'Renew',
    'pricing.premium': 'Premium',
    'pricing.yes': 'Yes',
    'pricing.no': 'No',
    'pricing.registered': 'Registered',
    'pricing.available': 'Available',
    
    // Domain Info
    'domain.info': 'Domain Info',
    'domain.standard': 'Standard',
    'domain.data': 'Data',
    'domain.registrar': 'Registrar',
    'domain.registrationDate': 'Registered',
    'domain.updateDate': 'Updated',
    'domain.expirationDate': 'Expires',
    'domain.remainingDays': '{days} days left',
    'domain.website': 'Website',
    
    // Registrant
    'registrant.title': 'Registrant Info',
    'registrant.name': 'Name',
    'registrant.organization': 'Organization',
    'registrant.country': 'Country',
    'registrant.email': 'Email',
    'registrant.unavailable': 'Registrant info unavailable',
    'registrant.privacyProtected': 'Registrant info is privacy protected',
    
    // Status
    'status.title': 'Domain Status',
    'status.raw': 'Raw Status Codes',
    'status.rawJson': 'Raw JSON Data',
    
    // DNS
    'dns.title': 'Name Servers',
    'dns.copy': 'Copy',
    'dns.copied': 'Copied',
    'dns.noServers': 'No name servers available',
    
    // Security
    'security.dnssec': 'DNSSEC',
    'security.enabled': 'Enabled',
    'security.disabled': 'Disabled',
    'security.privacyProtection': 'WHOIS Privacy Protection Enabled',
    
    // Data Source
    'source.title': 'Data Source',
    'source.protocol': 'Protocol',
    'source.rawData': 'Raw Data',
    'source.copyJson': 'Copy JSON',
    
    // Share
    'share.screenshot': 'Screenshot',
    'share.share': 'Share',
    'share.saveImage': 'Save Image',
    'share.shareWith': 'Share results with others',
    'share.generateFailed': 'Failed to generate screenshot',
    'share.imageSaved': 'Image saved',
    
    // History & Favorites
    'history.title': 'Query History',
    'history.empty': 'No query history',
    'history.loginRequired': 'Login to view query history',
    'favorites.title': 'Favorites',
    'favorites.empty': 'No favorites',
    'favorites.loginRequired': 'Login to view favorites',
    'favorites.add': 'Favorite',
    'favorites.added': 'Favorited',
    'favorites.remove': 'Removed from favorites',
    'favorites.addSuccess': 'Added to favorites',
    
    // Expiration
    'expiration.expired': 'Expired',
    'expiration.alert': 'Domain Expiration Alert',
    'expiration.alertMessage': 'You have {count} domain(s) expiring within 30 days!',
    
    // Errors
    'error.enterDomain': 'Please enter a domain name',
    'error.invalidFormat': 'Invalid domain format (e.g. example.com)',
    'error.serviceUnavailable': 'Service temporarily unavailable',
    'error.notFound': 'Domain info not found',
    'error.queryFailed': 'Query failed, please try again',
    'error.loginRequired': 'Please login first',
    'error.operationFailed': 'Operation failed',
    
    // Auth
    'auth.title': 'Login or Register',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.loginButton': 'Login',
    'auth.registerButton': 'Register',
    'auth.backHome': 'Back to Home',
    'auth.loginSuccess': 'Login successful',
    'auth.registerSuccess': 'Registration successful, please verify your email',
    
    // Footer
    'footer.copyright': '© 2026 RDAP Domain Lookup',
    'footer.about': 'About Me',
    'footer.register': 'Register Domain',
    'footer.shortlink': 'Short Link',
    'footer.updates': 'Updates',
    
    // Misc
    'misc.copySuccess': 'Copied to clipboard',
    'misc.copyFailed': 'Copy failed',
    'misc.noData': 'No data available',
    'misc.unknown': 'Unknown',
    'misc.loading': 'Searching...',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'zh';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
