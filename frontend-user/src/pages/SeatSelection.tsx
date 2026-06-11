import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { concertApi, orderApi } from '../api';

interface Seat {
  id: number;
  concert_id: number;
  tier_id: number;
  row: string;
  seat_number: string;
  status: 'available' | 'locked' | 'sold';
  tier_name: string;
  price: number;
  color?: string;
}

interface TicketTier {
  id: number;
  name: string;
  price: number;
  color?: string;
}

export default function SeatSelection() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locking, setLocking] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const tierId = parseInt(searchParams.get('tier') || '');
  const quantity = parseInt(searchParams.get('qty') || '1');

  useEffect(() => {
    const fetchSeats = async () => {
      if (!id) return;
      try {
        const response = await concertApi.getSeats(parseInt(id));
        setSeats(response.data.seats);
        setTiers(response.data.tiers);
      } catch (error) {
        console.error('获取座位失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeats();

    const interval = setInterval(() => {
      fetchSeats();
    }, 30000);

    return () => clearInterval(interval);
  }, [id]);

  const filteredSeats = tierId 
    ? seats.filter(s => s.tier_id === tierId)
    : seats;

  const groupedSeats = filteredSeats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<string, Seat[]>);

  const rows = Object.keys(groupedSeats).sort();
  const maxSeatsInRow = Math.max(...rows.map(r => groupedSeats[r].length));

  const handleSeatClick = (seat: Seat) => {
    if (seat.status !== 'available') return;

    const isSelected = selectedSeats.find(s => s.id === seat.id);
    
    if (isSelected) {
      setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= quantity) {
        alert(`最多只能选择 ${quantity} 个座位`);
        return;
      }
      setSelectedSeats(prev => [...prev, seat]);
    }
  };

  const handleConfirm = async () => {
    if (selectedSeats.length !== quantity) {
      alert(`请选择 ${quantity} 个座位`);
      return;
    }

    setLocking(true);
    setError('');

    try {
      await orderApi.lockSeats({
        concertId: parseInt(id!),
        seatIds: selectedSeats.map(s => s.id)
      });

      navigate('/order/confirm', {
        state: {
          concertId: id,
          seats: selectedSeats,
          concertInfo: {
            title: tiers[0] ? seats.find(s => s.concert_id === parseInt(id!))?.concert_id : null,
          }
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.error || '锁定座位失败，请重试');
    } finally {
      setLocking(false);
    }
  };

  const getSeatClass = (seat: Seat) => {
    const isSelected = selectedSeats.find(s => s.id === seat.id);
    if (isSelected) return 'seat-selected';
    return `seat-${seat.status}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <Link to={`/concert/${id}`} className="text-gray-500 hover:text-primary-600 mb-6 inline-flex items-center gap-2">
        <span>←</span> 返回详情
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">选择座位</h1>
        <p className="text-gray-500 mb-6">请选择 {quantity} 个座位</p>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-center gap-8 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500"></div>
              <span className="text-sm text-gray-600">可选</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500"></div>
              <span className="text-sm text-gray-600">已选</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-yellow-500"></div>
              <span className="text-sm text-gray-600">锁定中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gray-400"></div>
              <span className="text-sm text-gray-600">已售</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-block px-12 py-3 bg-gray-800 text-white rounded-lg text-sm">
              舞台
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="min-w-max">
              {rows.map(row => (
                <div key={row} className="flex items-center justify-center gap-1 mb-1">
                  <div className="w-8 text-center text-sm text-gray-400">{row}</div>
                  {Array.from({ length: maxSeatsInRow }).map((_, idx) => {
                    const seat = groupedSeats[row].find(s => parseInt(s.seat_number) === idx + 1);
                    if (!seat) {
                      return <div key={idx} className="w-8 h-8"></div>;
                    }
                    return (
                      <div
                        key={seat.id}
                        onClick={() => handleSeatClick(seat)}
                        className={`w-8 h-8 rounded text-xs text-white flex items-center justify-center ${getSeatClass(seat)}`}
                        title={`${seat.row}排${seat.seat_number}座 - ¥${seat.price}`}
                      >
                        {seat.seat_number}
                      </div>
                    );
                  })}
                  <div className="w-8 text-center text-sm text-gray-400">{row}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t">
          <div>
            <div className="text-sm text-gray-500">已选座位</div>
            {selectedSeats.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSeats.map(seat => (
                  <span
                    key={seat.id}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    {seat.row}排{seat.seat_number}座 - ¥{seat.price}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 mt-2">请点击座位进行选择</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">总计</div>
            <div className="text-2xl font-bold text-red-500">
              ¥{selectedSeats.reduce((sum, s) => sum + s.price, 0)}
            </div>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={selectedSeats.length !== quantity || locking}
          className="w-full mt-6 py-4 bg-primary-600 text-white text-lg font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {locking ? '锁定中...' : '确认选座'}
        </button>
      </div>
    </div>
  );
}
