/**
 * 域名年龄和时间计算服务
 * 用于判断域名是否为新注册、即将到期等
 */

export interface DomainAgeInfo {
  ageInDays: number;
  isNewDomain: boolean;
  ageLabel: string;
  isExpiringSoon: boolean;
  daysUntilExpiry?: number;
  expiryLabel?: string;
}

// 新域名定义：30天内注册
const NEW_DOMAIN_THRESHOLD_DAYS = 30;
// 即将到期定义：30天内到期
const EXPIRING_SOON_THRESHOLD_DAYS = 30;

export const domainAgeService = {
  // 解析日期字符串
  parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  },

  // 计算两个日期之间的天数
  calculateDaysBetween(startDate: Date, endDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
  },

  // 获取域名年龄信息
  getDomainAgeInfo(registrationDate: string | null, expirationDate: string | null): DomainAgeInfo {
    const now = new Date();
    const regDate = registrationDate ? this.parseDate(registrationDate) : null;
    const expDate = expirationDate ? this.parseDate(expirationDate) : null;

    let ageInDays = 0;
    let isNewDomain = false;
    let ageLabel = '未知';

    // 计算域名年龄
    if (regDate) {
      ageInDays = this.calculateDaysBetween(regDate, now);

      if (ageInDays < 0) {
        ageLabel = '时间异常';
      } else if (ageInDays <= NEW_DOMAIN_THRESHOLD_DAYS) {
        isNewDomain = true;
        if (ageInDays === 0) {
          ageLabel = '今天注册';
        } else if (ageInDays === 1) {
          ageLabel = '1 天前注册';
        } else if (ageInDays < 7) {
          ageLabel = `${ageInDays} 天前注册`;
        } else if (ageInDays < 30) {
          const weeks = Math.floor(ageInDays / 7);
          ageLabel = `${weeks} 周前注册`;
        } else {
          ageLabel = '新注册域名';
        }
      } else if (ageInDays < 90) {
        ageLabel = '不到3个月';
      } else if (ageInDays < 180) {
        ageLabel = '不到6个月';
      } else if (ageInDays < 365) {
        ageLabel = '不到1年';
      } else if (ageInDays < 365 * 2) {
        ageLabel = '1-2 年';
      } else if (ageInDays < 365 * 5) {
        const years = Math.floor(ageInDays / 365);
        ageLabel = `${years} 年`;
      } else {
        ageLabel = '5 年以上';
      }
    }

    // 计算到期信息
    let isExpiringSoon = false;
    let daysUntilExpiry = 0;
    let expiryLabel = '';

    if (expDate) {
      daysUntilExpiry = this.calculateDaysBetween(now, expDate);

      if (daysUntilExpiry < 0) {
        expiryLabel = '已过期';
        isExpiringSoon = true;
      } else if (daysUntilExpiry === 0) {
        expiryLabel = '今天到期';
        isExpiringSoon = true;
      } else if (daysUntilExpiry === 1) {
        expiryLabel = '明天到期';
        isExpiringSoon = true;
      } else if (daysUntilExpiry <= EXPIRING_SOON_THRESHOLD_DAYS) {
        expiryLabel = `${daysUntilExpiry} 天后到期`;
        isExpiringSoon = true;
      } else if (daysUntilExpiry <= 60) {
        expiryLabel = `约 ${Math.ceil(daysUntilExpiry / 7)} 周后到期`;
      } else if (daysUntilExpiry <= 365) {
        const months = Math.ceil(daysUntilExpiry / 30);
        expiryLabel = `约 ${months} 个月后到期`;
      } else if (daysUntilExpiry <= 365 * 3) {
        const years = Math.ceil(daysUntilExpiry / 365);
        expiryLabel = `约 ${years} 年后到期`;
      } else {
        expiryLabel = '长期有效';
      }
    }

    return {
      ageInDays,
      isNewDomain,
      ageLabel,
      isExpiringSoon,
      daysUntilExpiry: daysUntilExpiry || undefined,
      expiryLabel: expiryLabel || undefined,
    };
  },

  // 获取 CSS 样式类名
  getAgeColorClass(isNewDomain: boolean): string {
    return isNewDomain ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200';
  },

  // 获取到期警告颜色
  getExpiryColorClass(isExpiringSoon: boolean, daysUntilExpiry?: number): string {
    if (!isExpiringSoon) return '';
    if (daysUntilExpiry === undefined || daysUntilExpiry < 0) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (daysUntilExpiry <= 7) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (daysUntilExpiry <= 30) {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }
    return '';
  },

  // 判断是否需要续期提醒
  shouldShowRenewalReminder(expirationDate: string | null): boolean {
    if (!expirationDate) return false;
    const expDate = this.parseDate(expirationDate);
    if (!expDate) return false;
    const daysUntilExpiry = this.calculateDaysBetween(new Date(), expDate);
    return daysUntilExpiry <= 60 && daysUntilExpiry >= 0;
  },
};
