import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../api';

interface OrderItem {
  id: number;
  seat_no: string;
  tier_name: string;
  price: number;
  attendee_name: string;
  attendee_id_no: string;
  qr_code?: string;
  checkin_status: 'unused' | 'checked_in';
  checked_in_at?: string;
}

interface OrderDetail {
  id: number;
  order_no: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  created_at: string;
  paid_at?: string;
  refunded_at?: string;
  concert_title: string;
  concert_artist: string;
  concert_date: string;
  concert_time: string;
  venue: string;
  city: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  items: OrderItem[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

const checkinMap: Record<string, { label: string; color: string; icon: string }> = {
  unused: { label: '未入场', color: 'bg-gray-100 text-gray-600', icon: '○' },
  checked_in: { label: '已入场', color: 'bg-green-100 text-green-700', icon: '✓' },
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [batchChecking, setBatchChecking] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const response = await adminApi.getOrder(parseInt(id));
        setOrder(response.data);
      } catch (error) {
        console.error('获取订单详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const refreshOrder = async () => {
    if (!id) return;
    const response = await adminApi.getOrder(parseInt(id));
    setOrder(response.data);
  };

  const handleRefund = async () => {
    if (!order) return;
    if (!confirm('确定要对该订单执行退款操作吗？')) return;

    setRefunding(true);
    try {
      await adminApi.refundOrder(order.id);
      alert('退款成功');
      await refreshOrder();
    } catch (err: any) {
      alert(err.response?.data?.error || '退款失败，请重试');
    } finally {
      setRefunding(false);
    }
  };

  const handleCheckin = async (itemId: number) => {
    if (!confirm('确定要标记该票券为已入场吗？')) return;

    setCheckingIn(itemId);
    try {
      await adminApi.checkinItem(itemId);
      alert('核销成功');
      await refreshOrder();
    } catch (err: any) {
      alert(err.response?.data?.error || '核销失败，请重试');
    } finally {
      setCheckingIn(null);
    }
  };

  const handleCancelCheckin = async (itemId: number) => {
    if (!confirm('确定要撤销该票券的入场状态吗？')) return;

    setCheckingIn(itemId);
    try {
      await adminApi.cancelCheckinItem(itemId);
      alert('撤销核销成功');
      await refreshOrder();
    } catch (err: any) {
      alert(err.response?.data?.error || '撤销核销失败，请重试');
    } finally {
      setCheckingIn(null);
    }
  };

  const handleBatchCheckin = async () => {
    if (!order) return;
    const unusedCount = order.items.filter(i => i.checkin_status === 'unused').length;
    if (unusedCount === 0) {
      alert('当前订单所有票券均已核销');
      return;
    }
    if (!confirm(`确定要核销本订单中 ${unusedCount} 张未入场的票券吗？`)) return;

    setBatchChecking(true);
    try {
      await adminApi.batchCheckin(order.id);
      alert('批量核销成功');
      await refreshOrder();
    } catch (err: any) {
      alert(err.response?.data?.error || '批量核销失败，请重试');
    } finally {
      setBatchChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg mb-4">订单不存在</p>
        <Link to="/orders" className="text-blue-600 hover:underline">返回列表</Link>
      </div>
    );
  }

  const checkedInCount = order.items.filter(i => i.checkin_status === 'checked_in').length;
  const totalCount = order.items.length;

  return (
    <div>
      <Link to="/orders" className="text-gray-500 hover:text-blue-600 mb-6 inline-flex items-center gap-2">
        <span>←</span> 返回订单列表
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              订单详情 <span className="font-mono text-base font-normal text-gray-500">{order.order_no}</span>
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusMap[order.status].color}`}>
                {statusMap[order.status].label}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                核销进度 {checkedInCount}/{totalCount}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {order.status === 'paid' && (
              <button
                onClick={handleBatchCheckin}
                disabled={batchChecking || checkedInCount === totalCount}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {batchChecking ? '核销中...' : '一键全部核销'}
              </button>
            )}
            {order.status === 'paid' && (
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refunding ? '退款中...' : '退款'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">演唱会信息</h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-800">{order.concert_title}</div>
                <div className="text-gray-500">{order.concert_artist}</div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-gray-600">
                  <span>📅</span>
                  <span>{order.concert_date} {order.concert_time}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span>📍</span>
                  <span>{order.city} {order.venue}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">购票人信息</h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">姓名</div>
                <div className="text-gray-800 font-medium">{order.buyer_name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">手机号</div>
                <div className="text-gray-800">{order.buyer_phone}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">邮箱</div>
                <div className="text-gray-800">{order.buyer_email}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6">座位与票券信息</h2>
        <div className="space-y-4">
          {order.items.map((item, index) => (
            <div key={item.id} className={`p-5 border rounded-xl ${item.checkin_status === 'checked_in' ? 'border-green-200 bg-green-50/30' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${item.checkin_status === 'checked_in' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {item.checkin_status === 'checked_in' ? '✓' : index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{item.tier_name}</div>
                    <div className="text-lg font-bold text-red-500">¥{item.price}</div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">座位号</div>
                    <div className="text-xl font-bold text-gray-800">{item.seat_no}</div>
                  </div>
                  <div className="flex justify-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${checkinMap[item.checkin_status].color}`}>
                      <span>{checkinMap[item.checkin_status].icon}</span>
                      {checkinMap[item.checkin_status].label}
                    </span>
                  </div>
                  {item.checked_in_at && (
                    <div className="text-xs text-gray-400">
                      入场时间：{new Date(item.checked_in_at).toLocaleString('zh-CN')}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">持票人姓名</div>
                  <div className="text-gray-800">{item.attendee_name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">证件号码</div>
                  <div className="text-gray-800 font-mono">{item.attendee_id_no}</div>
                </div>
              </div>
              {order.status === 'paid' && (
                <div className="mt-4 pt-4 border-t flex items-center justify-between flex-wrap gap-2">
                  {item.qr_code && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500">电子票二维码</div>
                      <img
                        src={`data:image/png;base64,${item.qr_code}`}
                        alt="二维码"
                        className="w-20 h-20 border rounded"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    {item.checkin_status === 'unused' ? (
                      <button
                        onClick={() => handleCheckin(item.id)}
                        disabled={checkingIn === item.id}
                        className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkingIn === item.id ? '核销中...' : '✓ 标记已入场'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelCheckin(item.id)}
                        disabled={checkingIn === item.id}
                        className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkingIn === item.id ? '处理中...' : '撤销入场'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">订单时间线</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5"></div>
            <div>
              <div className="text-sm text-gray-500">订单创建</div>
              <div className="text-gray-800">{new Date(order.created_at).toLocaleString('zh-CN')}</div>
            </div>
          </div>
          {order.paid_at && (
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5"></div>
              <div>
                <div className="text-sm text-gray-500">支付成功</div>
                <div className="text-gray-800">{new Date(order.paid_at).toLocaleString('zh-CN')}</div>
              </div>
            </div>
          )}
          {order.refunded_at && (
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 rounded-full bg-gray-400 mt-1.5"></div>
              <div>
                <div className="text-sm text-gray-500">退款完成</div>
                <div className="text-gray-800">{new Date(order.refunded_at).toLocaleString('zh-CN')}</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">订单金额</span>
            <span className="text-3xl font-bold text-red-500">¥{order.total_amount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
