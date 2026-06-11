import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../api';

interface Order {
  id: number;
  order_no: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  created_at: string;
  paid_at?: string;
  title: string;
  artist: string;
  date: string;
  venue: string;
  city: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await orderApi.getOrders({ page, limit });
        setOrders(response.data.orders);
        setTotal(response.data.total);
      } catch (error) {
        console.error('获取订单列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">我的订单</h1>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🎫</div>
          <p className="text-gray-500 text-lg mb-4">暂无订单</p>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            去购票
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map(order => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">订单号：{order.order_no}</div>
                      <h3 className="text-lg font-bold text-gray-800">{order.title}</h3>
                      <div className="text-sm text-gray-500 mt-1">{order.artist}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusMap[order.status].color}`}>
                      {statusMap[order.status].label}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="text-gray-400">时间</span>
                      <div className="text-gray-700 mt-0.5">{order.date}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">场馆</span>
                      <div className="text-gray-700 mt-0.5 line-clamp-1">{order.city} · {order.venue}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400">金额</span>
                      <div className="text-xl font-bold text-red-500">¥{order.total_amount}</div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-4 pt-4 border-t">
                    创建时间：{new Date(order.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-gray-600 px-4">
                第 {page} / {totalPages} 页，共 {total} 条
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
