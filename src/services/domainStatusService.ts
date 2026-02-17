import { supabase } from '@/integrations/supabase/client';

export interface DomainStatus {
  status_code: string;
  status_zh: string;
  status_en: string;
  category: 'active' | 'pending' | 'protected' | 'privacy' | 'risk' | 'expired' | 'transfer' | 'hold' | 'other';
  description: string;
  color_class: string;
  priority: number;
}

let statusMapCache: Map<string, DomainStatus> | null = null;
let cacheTime = 0;
const CACHE_TTL = 3600000; // 1 hour

export const domainStatusService = {
  // 加载所有状态映射
  async loadStatusMap(): Promise<Map<string, DomainStatus>> {
    const now = Date.now();
    if (statusMapCache && (now - cacheTime) < CACHE_TTL) {
      return statusMapCache;
    }

    try {
      const { data, error } = await supabase
        .from('domain_status_map')
        .select('*');

      if (error) {
        console.error('Failed to load status map:', error);
        return statusMapCache || new Map();
      }

      const map = new Map<string, DomainStatus>();
      data?.forEach(item => {
        map.set(item.status_code.toLowerCase(), {
          status_code: item.status_code,
          status_zh: item.status_zh,
          status_en: item.status_en,
          category: item.category,
          description: item.description,
          color_class: item.color_class,
          priority: item.priority,
        });
      });

      statusMapCache = map;
      cacheTime = now;
      return map;
    } catch (e) {
      console.error('Error loading status map:', e);
      return statusMapCache || new Map();
    }
  },

  // 获取单个状态的中文映射
  async getStatusZh(statusCode: string): Promise<string> {
    const map = await this.loadStatusMap();
    const normalized = statusCode.toLowerCase();
    const status = map.get(normalized);
    return status?.status_zh || statusCode;
  },

  // 获取状态详情
  async getStatusDetail(statusCode: string): Promise<DomainStatus | null> {
    const map = await this.loadStatusMap();
    const normalized = statusCode.toLowerCase();
    return map.get(normalized) || null;
  },

  // 将多个状态代码转换为中文
  async translateStatuses(statusCodes: string[]): Promise<string[]> {
    const map = await this.loadStatusMap();
    return statusCodes.map(code => {
      const normalized = code.toLowerCase();
      return map.get(normalized)?.status_zh || code;
    });
  },

  // 获取状态类别
  async getStatusCategory(statusCode: string): Promise<string | null> {
    const detail = await this.getStatusDetail(statusCode);
    return detail?.category || null;
  },

  // 获取状态的 CSS 类名
  async getStatusColor(statusCode: string): Promise<string> {
    const detail = await this.getStatusDetail(statusCode);
    return detail?.color_class || 'text-gray-500';
  },

  // 获取按优先级排序的状态列表
  async getStatusesByCategory(category: string): Promise<DomainStatus[]> {
    const map = await this.loadStatusMap();
    return Array.from(map.values())
      .filter(s => s.category === category)
      .sort((a, b) => b.priority - a.priority);
  },
};
