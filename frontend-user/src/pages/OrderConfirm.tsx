import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { orderApi } from '../api';

interface Seat {
  id: number;
  row: string;
  seat_number: string;
  price: number;
  tier_name: string;
}

export default function OrderConfirm() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    concertId: string;
    seats: Seat[];
  };

  const [buyerName, setBuyerName] = useState('');
  const [buyerIdCard, setBuyerIdCard] = useState('');
  const [ticketHolders, setTicketHolders] = useState<{ name: string; idCard: string }[]>(
    state?.seats?.map(() => ({ name: '', idCard: '' })) || []
  );
  const [sameAsBuyer, setSameAsBuyer] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!state || !state.seats || state.seats.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg mb-4">请先选择座位</p>
        <Link to="/" className="text-primary-600 hover:underline">返回首页</Link>
      </div>
    );
  }

  const handleSameAsBuyerChange = (checked: boolean) => {
    setSameAsBuyer(checked);
    if (checked && buyerName && buyerIdCard) {
      setTicketHolders(state.seats.map(() => ({ name: buyerName, idCard: buyerIdCard })));
    } else {
      setTicketHolders(state.seats.map(() => ({ name: '', idCard: '' })));
    }
  };

  const handleHolderChange = (index: number, field: 'name' | 'idCard', value: string) => {
    const newHolders = [...ticketHolders];
    newHolders[index][field] = value;
    setTicketHolders(newHolders);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!buyerName || !buyerIdCard) {
      setError('请填写购票人信息');
      return;
    }

    if (buyerIdCard.length !== 18) {
      setError('请输入正确的18位身份证号');
      return;
    }

    for (let i = 0; i < ticketHolders.length; i++) {
      if (!ticketHolders[i].name || !ticketHolders[i].idCard) {
        setError(`请填写第${i + 1}位持票人的信息`);
        return;
      }
      if (ticketHolders[i].idCard.length !== 18) {
        setError(`第${i + 1}位持票人的身份证号格式不正确`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await orderApi.createOrder({
        concertId: parseInt(state.concertId),
        seatIds: state.seats.map(s => s.id),
        buyerName,
        buyerIdCard,
        ticketHolders
      });

      const orderId = response.data.orderId;
      
      const payResponse = await orderApi.payOrder(orderId);
      
      if (payResponse.data) {
        navigate(`/orders/${orderId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '提交订单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = state.seats.reduce((sum, s) => sum + s.price, 0);

  return (
    <div>
      <Link to={`/concert/${state.concertId}/select-seats`} className="text-gray-500 hover:text-primary-600 mb-6 inline-flex items-center gap-2">
        <span>←</span> 返回选座
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">购票人信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="请输入真实姓名"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">身份证号</label>
                <input
                  type="text"
                  value={buyerIdCard}
                  onChange={(e) => setBuyerIdCard(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="请输入18位身份证号"
                  maxLength={18}
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">持票人信息</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAsBuyer}
                  onChange={(e) => handleSameAsBuyerChange(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-600">同购票人</span>
              </label>
            </div>
            
            <div className="space-y-4">
              {state.seats.map((seat, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500 mb-3">
                    座位 {index + 1}：{seat.row}排{seat.seat_number}座（{seat.tier_name}）
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                      <input
                        type="text"
                        value={ticketHolders[index]?.name || ''}
                        onChange={(e) => handleHolderChange(index, 'name', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="请输入真实姓名"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">身份证号</label>
                      <input
                        type="text"
                        value={ticketHolders[index]?.idCard || ''}
                        onChange={(e) => handleHolderChange(index, 'idCard', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="请输入18位身份证号"
                        maxLength={18}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">订单摘要</h2>
            
            <div className="space-y-3 mb-6">
              {state.seats.map((seat, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {seat.row}排{seat.seat_number}座
                    </div>
                    <div className="text-xs text-gray-500">{seat.tier_name}</div>
                  </div>
                  <div className="text-red-500 font-medium">¥{seat.price}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between py-4 border-t">
              <span className="text-gray-600">应付总额</span>
              <span className="text-2xl font-bold text-red-500">¥{totalAmount}</span>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mt-4 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-6 py-4 bg-primary-600 text-white text-lg font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? '提交中...' : `确认支付 ¥${totalAmount}`}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4">
              点击确认支付即表示同意《购票服务协议》和《隐私政策》
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
