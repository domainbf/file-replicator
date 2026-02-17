import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Clock, Bell, LogOut, Edit, Trash2 } from 'lucide-react';
import TopNavBar from '@/components/TopNavBar';

interface Favorite {
  id: string;
  domain_name: string;
  registrar: string;
  expiration_date: string;
  alert_enabled: boolean;
  alert_days_before: number;
  notes: string;
  created_at: string;
}

interface HistoryItem {
  id: string;
  domain_name: string;
  registrar: string;
  expiration_date: string;
  query_count: number;
  created_at: string;
}

interface Alert {
  id: string;
  domain_name: string;
  expiration_date: string;
  alert_enabled: boolean;
  alert_days_before: number;
  notes: string;
}

const UserCenter = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editingAlertDays, setEditingAlertDays] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    loadUserData();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [favRes, histRes, alertRes] = await Promise.all([
        supabase.from('favorites').select('*').order('created_at', { ascending: false }),
        supabase.from('domain_history').select('*').order('created_at', { ascending: false }),
        supabase.from('expiration_alerts').select('*').order('expiration_date', { ascending: true }),
      ]);

      if (favRes.data) setFavorites(favRes.data as Favorite[]);
      if (histRes.data) setHistory(histRes.data as HistoryItem[]);
      if (alertRes.data) setAlerts(alertRes.data as Alert[]);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteFavorite = async (id: string) => {
    try {
      await supabase.from('favorites').delete().eq('id', id);
      setFavorites(favorites.filter(f => f.id !== id));
    } catch (error) {
      console.error('Failed to delete favorite:', error);
    }
  };

  const updateAlert = async (id: string, enabled: boolean, days: number) => {
    try {
      await supabase
        .from('expiration_alerts')
        .update({ alert_enabled: enabled, alert_days_before: days })
        .eq('id', id);

      setAlerts(alerts.map(a =>
        a.id === id ? { ...a, alert_enabled: enabled, alert_days_before: days } : a
      ));
    } catch (error) {
      console.error('Failed to update alert:', error);
    }
  };

  const deleteHistory = async (id: string) => {
    try {
      await supabase.from('domain_history').delete().eq('id', id);
      setHistory(history.filter(h => h.id !== id));
    } catch (error) {
      console.error('Failed to delete history:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleDomainClick = (domain: string) => {
    navigate(`/${domain}`);
  };

  const getExpiryStatus = (expirationDate: string) => {
    if (!expirationDate) return null;
    const expDate = new Date(expirationDate);
    const now = new Date();
    const daysLeft = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { label: '已过期', color: 'destructive' };
    } else if (daysLeft <= 30) {
      return { label: `${daysLeft} 天`, color: 'warning' };
    }
    return { label: `${Math.ceil(daysLeft / 30)} 个月`, color: 'secondary' };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-6xl mx-auto px-4 flex-1">
        <TopNavBar isDark={isDark} setIsDark={setIsDark} onLogoClick={() => navigate('/')} />

        {/* 用户信息头部 */}
        <div className="mb-8 border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t('userCenter.title') || '用户中心'}</h1>
              <p className="text-muted-foreground mt-1">{user?.email}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} size="lg">
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout') || '退出'}
            </Button>
          </div>
        </div>

        {/* 标签页面板 */}
        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="favorites">
              <Heart className="w-4 h-4 mr-2" />
              收藏
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-2" />
              查询记录
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="w-4 h-4 mr-2" />
              到期提醒
            </TabsTrigger>
          </TabsList>

          {/* 收藏标签页 */}
          <TabsContent value="favorites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>我的收藏 ({favorites.length})</CardTitle>
                <CardDescription>已保存的常用域名</CardDescription>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">暂无收藏的域名</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favorites.map(fav => {
                      const expiryStatus = getExpiryStatus(fav.expiration_date);
                      return (
                        <div key={fav.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition">
                          <div className="flex-1 cursor-pointer" onClick={() => handleDomainClick(fav.domain_name)}>
                            <div className="font-semibold hover:text-primary">{fav.domain_name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {fav.registrar} · 收藏于 {new Date(fav.created_at).toLocaleDateString()}
                            </div>
                            {fav.notes && (
                              <div className="text-sm mt-2 text-muted-foreground">
                                备注: {fav.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            {expiryStatus && (
                              <Badge variant={expiryStatus.color as any}>
                                {expiryStatus.label}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFavorite(fav.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 查询记录标签页 */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>查询记录 ({history.length})</CardTitle>
                <CardDescription>最近查询的域名</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">暂无查询记录</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map(item => (
                      <div key={item.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition">
                        <div className="flex-1 cursor-pointer" onClick={() => handleDomainClick(item.domain_name)}>
                          <div className="font-semibold hover:text-primary">{item.domain_name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.registrar} · 查询 {item.query_count} 次 · {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {getExpiryStatus(item.expiration_date) && (
                            <Badge variant={getExpiryStatus(item.expiration_date)!.color as any}>
                              {getExpiryStatus(item.expiration_date)!.label}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteHistory(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 到期提醒标签页 */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>到期提醒 ({alerts.length})</CardTitle>
                <CardDescription>管理域名到期通知</CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">暂无设置提醒的域名</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map(alert => {
                      const expDate = new Date(alert.expiration_date);
                      const now = new Date();
                      const daysLeft = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={alert.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="font-semibold">{alert.domain_name}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                到期日期: {expDate.toLocaleDateString()}
                              </div>
                              {alert.notes && (
                                <div className="text-sm mt-2 text-muted-foreground">
                                  备注: {alert.notes}
                                </div>
                              )}
                            </div>
                            {daysLeft < 0 ? (
                              <Badge variant="destructive">已过期</Badge>
                            ) : daysLeft <= 30 ? (
                              <Badge variant="destructive">{daysLeft} 天</Badge>
                            ) : (
                              <Badge>{daysLeft} 天</Badge>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label>启用提醒</Label>
                              <Switch
                                checked={alert.alert_enabled}
                                onCheckedChange={(checked) =>
                                  updateAlert(alert.id, checked, alert.alert_days_before)
                                }
                              />
                            </div>
                            {alert.alert_enabled && (
                              <div className="space-y-2">
                                <Label>提前多少天提醒</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="365"
                                  value={alert.alert_days_before}
                                  onChange={(e) => {
                                    const days = parseInt(e.target.value) || alert.alert_days_before;
                                    updateAlert(alert.id, alert.alert_enabled, days);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserCenter;
