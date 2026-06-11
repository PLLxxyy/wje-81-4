import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { concertApi } from '../api';
import { useAuthStore } from '../store/auth';

interface TicketTier {
  id: number;
  name: string;
  price: number;
  total_seats: number;
  sold_seats: number;
  color?: string;
}

interface Concert {
  id: number;
  title: string;
  artist: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  description?: string;
  poster_url?: string;
  tiers: TicketTier[];
}

export default function ConcertDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [concert, setConcert] = useState<Concert | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchConcert = async () => {
      if (!id) return;
      try {
        const response = await concertApi.getConcert(parseInt(id));
        setConcert(response.data);
      } catch (error) {
        console.error('获取演唱会详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConcert();
  }, [id]);

  const handleBuyTickets = () => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (selectedTier === null) {
      alert('请选择票档');
      return;
    }
    navigate(`/concert/${id}/select-seats?tier=${selectedTier}&qty=${quantity}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!concert) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">演唱会不存在</p>
        <Link to="/" className="text-primary-600 hover:underline mt-4 inline-block">返回列表</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="text-gray-500 hover:text-primary-600 mb-6 inline-flex items-center gap-2">
        <span>←</span> 返回列表
      </Link>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="aspect-[3/4] bg-gradient-to-br from-primary-400 to-primary-600">
              {concert.poster_url ? (
                <img
                  src={concert.poster_url}
                  alt={concert.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-8xl">
                  🎵
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 p-8">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-3">
                {concert.artist}
              </span>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">{concert.title}</h1>
              
              <div className="space-y-3 text-gray-600">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  <span className="text-lg">{concert.date} {concert.time}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <span className="text-lg">{concert.city} · {concert.venue}</span>
                </div>
              </div>
            </div>

            {concert.description && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">演出介绍</h3>
                <p className="text-gray-600 leading-relaxed">{concert.description}</p>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">选择票档</h3>
              <div className="space-y-3">
                {concert.tiers.map(tier => {
                  const remaining = tier.total_seats - tier.sold_seats;
                  const isSoldOut = remaining <= 0;
                  const isSelected = selectedTier === tier.id;
                  
                  return (
                    <div
                      key={tier.id}
                      onClick={() => !isSoldOut && setSelectedTier(tier.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        isSoldOut 
                          ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: tier.color || '#ccc' }}
                          ></div>
                          <span className="font-medium text-gray-800">{tier.name}</span>
                          {isSoldOut && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs rounded">已售罄</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-red-500">¥{tier.price}</div>
                          <div className="text-xs text-gray-500">剩余 {remaining} 张</div>
                        </div>
                      </div>
                      <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 transition-all"
                          style={{ width: `${(tier.sold_seats / tier.total_seats) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedTier !== null && (
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600">购票数量</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(10, q + 1))}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-gray-600">应付总额</span>
                  <span className="text-2xl font-bold text-red-500">
                    ¥{(concert.tiers.find(t => t.id === selectedTier)?.price || 0) * quantity}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleBuyTickets}
              disabled={selectedTier === null}
              className="w-full py-4 bg-primary-600 text-white text-lg font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {token ? '选座购票' : '登录后购票'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
