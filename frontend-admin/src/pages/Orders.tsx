import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, concertApi } from '../api';

interface Order {
  id: number;
  order_no: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  created_at: string;
  paid_at?: string;
  title: string;
  artist: string;
  username: string;
  email: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [concerts, setConcerts] = useState<any[]>([]);
  const [selectedConcert, setSelectedConcert] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refunding, setRefunding] = useState(false);
  const limit = 20;

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        const response = await concertApi.getConcerts({ limit: 100 });
        setConcerts(response.data.concerts);
      } catch (error) {
        console.error('获取演唱会列表失败:', error);
      }
    };
    fetchConcerts();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const params: any = { page, limit };
        if (selectedConcert) params.concertId = parseInt(selectedConcert);
        if (selectedStatus) params.status = selectedStatus;
        
        const response = await adminApi.getOrders(params);
        setOrders(response.data.orders);
        setTotal(response.data.total);
        setSelectedOrders([]);
      } catch (error) {
        console.error('获取订单列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [page, selectedConcert, selectedStatus]);

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.filter(o => o.status === 'paid').map(o => o.id));
    }
  };

  const handleSelect = (id: number) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(prev => prev.filter(o => o !== id));
    } else {
      setSelectedOrders(prev => [...prev, id]);
    }
  };

  const handleBatchRefund = async () => {
    if (selectedOrders.length === 0) {
      alert('请选择要退款的订单');
      return;
    }
    if (!confirm(`确定要对选中的 ${selectedOrders.length} 个订单执行退款操作吗？`)) return;

    setRefunding(true);
    try {
      await adminApi.batchRefund(selectedOrders);
      alert('批量退款成功');
      
      const params: any = { page, limit };
      if (selectedConcert) params.concertId = parseInt(selectedConcert);
      if (selectedStatus) params.status = selectedStatus;
      const response = await adminApi.getOrders(params);
      setOrders(response.data.orders);
      setSelectedOrders([]);
    } catch (err: any) {
      alert(err.response?.data?.error || '批量退款失败，请重试');
    } finally {
      setRefunding(false);
    }
  };

  const paidOrdersCount = orders.filter(o => o.status === 'paid').length;
  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">订单管理</h1>
        {selectedOrders.length > 0 && (
          <button
            onClick={handleBatchRefund}
            disabled={refunding}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refunding ? '退款中...' : `批量退款 (${selectedOrders.length})`}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">演唱会：</label>
            <select
              value={selectedConcert}
              onChange={(e) => { setSelectedConcert(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            >
              <option value="">全部</option>
              {concerts.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">状态：</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            >
              <option value="">全部</option>
              <option value="pending">待支付</option>
              <option value="paid">已支付</option>
              <option value="refunded">已退款</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === paidOrdersCount && paidOrdersCount > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded"
                />
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">订单号</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">演唱会</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">用户</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">金额</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">状态</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">创建时间</th>
              <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  {order.status === 'paid' && (
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelect(order.id)}
                      className="w-4 h-4 rounded"
                    />
                  )}
                </td>
                <td className="px-4 py-4 font-mono text-sm text-gray-600">{order.order_no}</td>
                <td className="px-4 py-4">
                  <div className="font-medium text-gray-800">{order.title}</div>
                  <div className="text-xs text-gray-500">{order.artist}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-gray-700">{order.username}</div>
                  <div className="text-xs text-gray-400">{order.email}</div>
                </td>
                <td className="px-4 py-4 font-medium text-red-500">¥{order.total_amount}</td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusMap[order.status].color}`}>
                    {statusMap[order.status].label}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/orders/${order.id}`}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      详情
                    </Link>
                    {order.status === 'paid' && (
                      <button
                        onClick={async () => {
                          if (!confirm('确定要对该订单执行退款操作吗？')) return;
                          try {
                            await adminApi.refundOrder(order.id);
                            alert('退款成功');
                            const params: any = { page, limit };
                            if (selectedConcert) params.concertId = parseInt(selectedConcert);
                            if (selectedStatus) params.status = selectedStatus;
                            const response = await adminApi.getOrders(params);
                            setOrders(response.data.orders);
                          } catch (err: any) {
                            alert(err.response?.data?.error || '退款失败，请重试');
                          }
                        }}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        退款
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无订单数据
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
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
    </div>
  );
}
