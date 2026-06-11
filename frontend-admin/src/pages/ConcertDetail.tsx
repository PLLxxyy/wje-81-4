import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../api';

interface TierStat {
  id: number;
  name: string;
  price: number;
  total_seats: number;
  sold_seats: number;
  color?: string;
  remainingSeats: number;
  sellRate: string;
  revenue: number;
}

interface ConcertStat {
  tiers: TierStat[];
  totalSold: number;
  totalRevenue: number;
  totalCapacity: number;
  sellRate: string;
  recentOrders: any[];
}

export default function ConcertDetail() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<ConcertStat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!id) return;
      try {
        const response = await adminApi.getConcertStats(parseInt(id));
        setStats(response.data);
      } catch (error) {
        console.error('获取演唱会统计失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg mb-4">数据不存在</p>
        <Link to="/concerts" className="text-blue-600 hover:underline">返回列表</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/concerts" className="text-gray-500 hover:text-blue-600 mb-6 inline-flex items-center gap-2">
        <span>←</span> 返回列表
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">总座位数</div>
          <div className="text-3xl font-bold text-gray-800">{stats.totalCapacity}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">已售出</div>
          <div className="text-3xl font-bold text-green-600">{stats.totalSold}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">售票率</div>
          <div className="text-3xl font-bold text-blue-600">{stats.sellRate}%</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">总营收</div>
          <div className="text-3xl font-bold text-red-500">¥{stats.totalRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-6">各票档销售情况</h2>
        <div className="space-y-4">
          {stats.tiers.map(tier => (
            <div key={tier.id} className="p-4 border rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tier.color || '#ccc' }}
                  ></div>
                  <span className="font-medium text-gray-800">{tier.name}</span>
                  <span className="text-lg font-bold text-red-500">¥{tier.price}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    已售 {tier.sold_seats} / {tier.total_seats}
                  </div>
                  <div className="text-sm text-gray-500">
                    剩余 {tier.remainingSeats} 张
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${tier.sellRate}%`,
                      backgroundColor: tier.color || '#3b82f6',
                    }}
                  ></div>
                </div>
                <div className="w-24 text-right">
                  <span className="text-sm font-medium text-gray-700">{tier.sellRate}%</span>
                </div>
              </div>
              <div className="mt-3 text-right text-sm text-gray-600">
                营收：<span className="font-medium text-red-500">¥{tier.revenue.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">最近订单</h2>
        {stats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-3 text-left text-sm font-semibold text-gray-700">订单号</th>
                  <th className="py-3 text-left text-sm font-semibold text-gray-700">用户</th>
                  <th className="py-3 text-left text-sm font-semibold text-gray-700">金额</th>
                  <th className="py-3 text-left text-sm font-semibold text-gray-700">支付时间</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 text-sm font-mono text-gray-600">{order.order_no}</td>
                    <td className="py-3 text-sm text-gray-700">
                      <div>{order.username}</div>
                      <div className="text-xs text-gray-400">{order.email}</div>
                    </td>
                    <td className="py-3 text-sm font-medium text-red-500">¥{order.total_amount}</td>
                    <td className="py-3 text-sm text-gray-600">
                      {order.paid_at ? new Date(order.paid_at).toLocaleString('zh-CN') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            暂无订单数据
          </div>
        )}
      </div>
    </div>
  );
}
