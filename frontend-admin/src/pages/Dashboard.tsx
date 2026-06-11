import { useState, useEffect } from 'react';
import { adminApi } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalConcerts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalTickets: 0,
  });
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, trendRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getSalesTrend({ days: 7 }),
        ]);
        setStats(statsRes.data);
        setTrend(trendRes.data.trend);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { label: '演唱会总数', value: stats.totalConcerts, icon: '🎵', color: 'from-blue-500 to-blue-600' },
    { label: '订单总数', value: stats.totalOrders, icon: '📋', color: 'from-green-500 to-green-600' },
    { label: '总票房', value: `¥${stats.totalRevenue.toLocaleString()}`, icon: '💰', color: 'from-yellow-500 to-yellow-600' },
    { label: '售票总数', value: stats.totalTickets, icon: '🎫', color: 'from-purple-500 to-purple-600' },
  ];

  const maxRevenue = Math.max(...trend.map(d => d.revenue), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">数据概览</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 text-white shadow-lg`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">{card.label}</p>
                <p className="text-3xl font-bold">{card.value}</p>
              </div>
              <span className="text-4xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">近7日销售趋势</h2>
        
        {trend.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-end gap-4 h-64 px-4">
              {trend.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-2">¥{day.revenue}</div>
                  <div
                    className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600"
                    style={{ height: `${(day.revenue / maxRevenue) * 100}%`, minHeight: day.revenue > 0 ? '8px' : '0' }}
                  ></div>
                  <div className="text-xs text-gray-500 mt-2">{day.date.slice(5)}</div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-sm text-gray-500">订单数</div>
                <div className="text-lg font-bold text-gray-800">{trend.reduce((sum, d) => sum + d.orders, 0)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">售票数</div>
                <div className="text-lg font-bold text-gray-800">{trend.reduce((sum, d) => sum + d.tickets, 0)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">营收</div>
                <div className="text-lg font-bold text-red-500">¥{trend.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            暂无销售数据
          </div>
        )}
      </div>
    </div>
  );
}
