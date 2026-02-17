/*
  # 扩展用户功能：到期提醒、域名状态映射、增强收藏记录

  1. 新表
    - `expiration_alerts` - 用户的域名到期提醒配置
    - `domain_status_map` - 域名状态中文映射和扩展
    - 扩展 `favorites` 和 `domain_history` 表以支持更多信息

  2. 修改
    - `favorites` 表：添加提醒字段和状态信息
    - `domain_history` 表：添加更多查询信息和标记

  3. 安全性
    - 所有表启用 RLS
    - 用户只能访问自己的数据
    - 状态映射表为公开读取

  4. 功能说明
    - 到期提醒：支持自定义提醒时间
    - 域名状态映射：支持中文显示和不规则状态码映射
    - 增强记录：存储更多元数据便于展示和分析
*/

-- 添加新列到 favorites 表
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'favorites' AND column_name = 'registration_date'
  ) THEN
    ALTER TABLE public.favorites ADD COLUMN registration_date TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'favorites' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.favorites ADD COLUMN status TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'favorites' AND column_name = 'alert_enabled'
  ) THEN
    ALTER TABLE public.favorites ADD COLUMN alert_enabled BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'favorites' AND column_name = 'alert_days_before'
  ) THEN
    ALTER TABLE public.favorites ADD COLUMN alert_days_before INTEGER DEFAULT 30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'favorites' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.favorites ADD COLUMN notes TEXT;
  END IF;
END $$;

-- 添加新列到 domain_history 表
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'domain_history' AND column_name = 'registration_date'
  ) THEN
    ALTER TABLE public.domain_history ADD COLUMN registration_date TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'domain_history' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.domain_history ADD COLUMN status TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'domain_history' AND column_name = 'dnssec'
  ) THEN
    ALTER TABLE public.domain_history ADD COLUMN dnssec BOOLEAN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'domain_history' AND column_name = 'query_count'
  ) THEN
    ALTER TABLE public.domain_history ADD COLUMN query_count INTEGER DEFAULT 1;
  END IF;
END $$;

-- 创建域名状态映射表
CREATE TABLE IF NOT EXISTS public.domain_status_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_code TEXT NOT NULL UNIQUE,
  status_zh TEXT NOT NULL,
  status_en TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  color_class TEXT DEFAULT 'text-gray-500',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建到期提醒表
CREATE TABLE IF NOT EXISTS public.expiration_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE,
  alert_enabled BOOLEAN DEFAULT true,
  alert_days_before INTEGER DEFAULT 30,
  last_alert_sent TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, domain_name)
);

-- 启用 RLS
ALTER TABLE public.domain_status_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiration_alerts ENABLE ROW LEVEL SECURITY;

-- 域名状态映射表 RLS 策略 (公开读取)
CREATE POLICY "Domain status map is publicly readable"
  ON public.domain_status_map
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 到期提醒表 RLS 策略
CREATE POLICY "Users can view own alerts"
  ON public.expiration_alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON public.expiration_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.expiration_alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.expiration_alerts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_domain_status_map_code ON public.domain_status_map(status_code);
CREATE INDEX IF NOT EXISTS idx_domain_status_map_category ON public.domain_status_map(category);
CREATE INDEX IF NOT EXISTS idx_expiration_alerts_user_id ON public.expiration_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_expiration_alerts_expiration_date ON public.expiration_alerts(expiration_date);
CREATE INDEX IF NOT EXISTS idx_expiration_alerts_alert_enabled ON public.expiration_alerts(alert_enabled);

-- 创建触发器更新时间戳
CREATE TRIGGER update_domain_status_map_updated_at
  BEFORE UPDATE ON public.domain_status_map
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expiration_alerts_updated_at
  BEFORE UPDATE ON public.expiration_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 插入常见域名状态映射
INSERT INTO public.domain_status_map (status_code, status_zh, status_en, category, description, color_class, priority) VALUES
-- 激活状态
('active', '激活', 'Active', 'active', '域名处于激活状态', 'text-green-600', 100),
('ok', '正常', 'OK', 'active', '域名状态正常', 'text-green-600', 100),
('verified', '已验证', 'Verified', 'active', '域名已验证', 'text-green-600', 95),

-- 待处理状态
('pendingCreate', '创建中', 'Pending Create', 'pending', '域名创建处理中', 'text-blue-500', 80),
('pendingDelete', '删除中', 'Pending Delete', 'pending', '域名删除处理中', 'text-orange-500', 75),
('pendingTransfer', '转移中', 'Pending Transfer', 'pending', '域名转移处理中', 'text-blue-500', 75),
('pendingRenewal', '续期中', 'Pending Renewal', 'pending', '域名续期处理中', 'text-blue-500', 75),
('pendingRestore', '恢复中', 'Pending Restore', 'pending', '域名恢复处理中', 'text-blue-500', 70),
('pendingUpdate', '更新中', 'Pending Update', 'pending', '域名信息更新中', 'text-blue-500', 70),

-- 保护状态
('clientDeleteProhibited', '删除保护', 'Client Delete Prohibited', 'protected', '客户端删除保护', 'text-indigo-600', 60),
('clientTransferProhibited', '转移保护', 'Client Transfer Prohibited', 'protected', '客户端转移保护', 'text-indigo-600', 60),
('clientUpdateProhibited', '更新保护', 'Client Update Prohibited', 'protected', '客户端更新保护', 'text-indigo-600', 60),
('serverDeleteProhibited', '服务器删除保护', 'Server Delete Prohibited', 'protected', '注册局删除保护', 'text-purple-600', 55),
('serverTransferProhibited', '服务器转移保护', 'Server Transfer Prohibited', 'protected', '注册局转移保护', 'text-purple-600', 55),
('serverUpdateProhibited', '服务器更新保护', 'Server Update Prohibited', 'protected', '注册局更新保护', 'text-purple-600', 55),
('clientRenewProhibited', '续期保护', 'Client Renew Prohibited', 'protected', '客户端续期保护', 'text-indigo-600', 55),
('serverRenewProhibited', '服务器续期保护', 'Server Renew Prohibited', 'protected', '注册局续期保护', 'text-purple-600', 50),

-- 隐私保护
('clientHold', '客户端保留', 'Client Hold', 'hold', '客户端暂停', 'text-yellow-600', 45),
('serverHold', '服务器保留', 'Server Hold', 'hold', '注册局暂停', 'text-orange-600', 40),
('inactive', '非激活', 'Inactive', 'hold', '域名非激活状态', 'text-yellow-600', 40),

-- 隐私/代理状态
('hiddenInWhois', '隐藏在 WHOIS', 'Hidden In Whois', 'privacy', '隐私保护已启用', 'text-blue-400', 35),
('whoisPrivacy', 'WHOIS 隐私', 'WHOIS Privacy', 'privacy', 'WHOIS 隐私保护', 'text-blue-400', 35),
('private', '私密', 'Private', 'privacy', '已启用隐私保护', 'text-blue-400', 35),

-- 风险状态
('redemptionPeriod', '赎回期', 'Redemption Period', 'risk', '域名在赎回期内', 'text-red-500', 25),
('pendingRedemption', '待赎回', 'Pending Redemption', 'risk', '域名待赎回', 'text-red-500', 25),
('noObject', '无对象', 'No Object', 'risk', '域名不存在', 'text-red-700', 10),
('notImplemented', '未实现', 'Not Implemented', 'risk', '状态未实现', 'text-red-600', 10),

-- 已删除/到期
('deleted', '已删除', 'Deleted', 'expired', '域名已删除', 'text-gray-500', 5),
('expired', '已过期', 'Expired', 'expired', '域名已过期', 'text-red-600', 5),
('autorenewCancelled', '自动续期已取消', 'Autorenew Cancelled', 'expired', '自动续期已取消', 'text-orange-500', 8),

-- 转移状态
('transferred', '已转移', 'Transferred', 'transfer', '域名已转移', 'text-gray-500', 15),
('outbound', '出站转移', 'Outbound Transfer', 'transfer', '域名出站转移中', 'text-blue-500', 50),
('inbound', '入站转移', 'Inbound Transfer', 'transfer', '域名入站转移中', 'text-blue-500', 50),

-- 其他
('associated', '关联', 'Associated', 'other', '域名已关联', 'text-gray-500', 20),
('clientProhibited', '客户端禁用', 'Client Prohibited', 'protected', '客户端禁用状态', 'text-indigo-600', 55),
('serverProhibited', '服务器禁用', 'Server Prohibited', 'protected', '服务器禁用状态', 'text-purple-600', 50),
('linkingProhibited', '链接禁用', 'Linking Prohibited', 'protected', '链接禁用状态', 'text-indigo-600', 50),
('renewProhibited', '续期禁用', 'Renew Prohibited', 'protected', '续期禁用状态', 'text-indigo-600', 50),
('statusProhibited', '状态禁用', 'Status Prohibited', 'protected', '状态禁用', 'text-indigo-600', 50);