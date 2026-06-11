import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderApi } from '../api';

interface OrderItem {
  id: number;
  seat_id: number;
  tier_id: number;
  ticket_holder_name: string;
  ticket_holder_id_card: string;
  price: number;
  qr_code?: string;
  row: string;
  seat_number: string;
  tier_name: string;
  color?: string;
}

interface Order {
  id: number;
  order_no: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  buyer_name: string;
  buyer_id_card: string;
  qr_code?: string;
  created_at: string;
  paid_at?: string;
  refunded_at?: string;
  title: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  poster_url?: string;
  items: OrderItem[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);
  const [showQr, setShowQr] = useState<number | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const response = await orderApi.getOrder(parseInt(id));
        setOrder(response.data);
      } catch (error) {
        console.error('获取订单详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleRefund = async () => {
    if (!order) return;
    if (!confirm('确定要申请退款吗？退款后将无法恢复。')) return;

    setRefunding(true);
    try {
      await orderApi.refundOrder(order.id);
      const response = await orderApi.getOrder(order.id);
      setOrder(response.data);
      alert('退款成功');
    } catch (err: any) {
      alert(err.response?.data?.error || '退款失败，请重试');
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg mb-4">订单不存在</p>
        <Link to="/orders" className="text-primary-600 hover:underline">返回订单列表</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/orders" className="text-gray-500 hover:text-primary-600 mb-6 inline-flex items-center gap-2">
        <span>←</span> 返回订单列表
      </Link>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-8">
          <div className="flex items-start justify-between">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${statusMap[order.status].color}`}>
                {statusMap[order.status].label}
              </span>
              <h1 className="text-2xl font-bold mb-2">{order.title}</h1>
              <p className="text-primary-100">{order.artist}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-primary-100 mb-1">订单号</div>
              <div className="font-mono">{order.order_no}</div>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <div className="text-sm text-gray-400 mb-1">演出时间</div>
              <div className="font-medium">{order.date} {order.time}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">演出地点</div>
              <div className="font-medium">{order.city} · {order.venue}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">购票人</div>
              <div className="font-medium">{order.buyer_name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">支付金额</div>
              <div className="text-xl font-bold text-red-500">¥{order.total_amount}</div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-800 mb-4">电子票</h3>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={item.id} className="border rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-3 h-16 rounded"
                      style={{ backgroundColor: item.color || '#ccc' }}
                    ></div>
                    <div>
                      <div className="text-lg font-bold text-gray-800">
                        {item.row}排{item.seat_number}座
                      </div>
                      <div className="text-sm text-gray-500 mb-2">{item.tier_name}</div>
                      <div className="text-sm text-gray-600">
                        持票人：{item.ticket_holder_name}
                      </div>
                      <div className="text-sm text-gray-400">
                        身份证：{item.ticket_holder_id_card.replace(/^(.{6})(.+)(.{4})$/, '$1********$3')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-500">¥{item.price}</div>
                    {order.status === 'paid' && (
                      <button
                        onClick={() => setShowQr(showQr === item.id ? null : item.id)}
                        className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        {showQr === item.id ? '收起二维码' : '查看电子票'}
                      </button>
                    )}
                  </div>
                </div>
                {showQr === item.id && item.qr_code && (
                  <div className="mt-4 pt-4 border-t text-center">
                    <img
                      src={item.qr_code}
                      alt="电子票二维码"
                      className="w-48 h-48 mx-auto mb-2"
                    />
                    <p className="text-sm text-gray-500">请出示此二维码入场</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {order.status === 'paid' && order.qr_code && (
            <div className="mt-8 p-6 bg-gray-50 rounded-xl text-center">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">订单二维码</h4>
              <img
                src={order.qr_code}
                alt="订单二维码"
                className="w-48 h-48 mx-auto mb-2"
              />
              <p className="text-sm text-gray-500">可凭此订单二维码查询</p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">订单信息</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">创建时间：</span>
                <span className="text-gray-600">{new Date(order.created_at).toLocaleString('zh-CN')}</span>
              </div>
              {order.paid_at && (
                <div>
                  <span className="text-gray-400">支付时间：</span>
                  <span className="text-gray-600">{new Date(order.paid_at).toLocaleString('zh-CN')}</span>
                </div>
              )}
              {order.refunded_at && (
                <div>
                  <span className="text-gray-400">退款时间：</span>
                  <span className="text-gray-600">{new Date(order.refunded_at).toLocaleString('zh-CN')}</span>
                </div>
              )}
            </div>
          </div>

          {order.status === 'paid' && (
            <button
              onClick={handleRefund}
              disabled={refunding}
              className="w-full mt-6 py-3 border-2 border-red-500 text-red-500 font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refunding ? '退款中...' : '申请退款'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
