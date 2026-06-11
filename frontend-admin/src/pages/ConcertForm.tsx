import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { concertApi } from '../api';

interface Tier {
  name: string;
  price: number;
  totalSeats: number;
  color: string;
  seats: { row: string; seatNumber: string }[];
}

const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#F0E68C', '#FFA07A'];

export default function ConcertForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    city: '',
    venue: '',
    date: '',
    time: '',
    description: '',
    poster_url: '',
    status: 'upcoming',
  });
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      const fetchConcert = async () => {
        setLoading(true);
        try {
          const response = await concertApi.getConcert(parseInt(id!));
          const data = response.data;
          setFormData({
            title: data.title,
            artist: data.artist,
            city: data.city,
            venue: data.venue,
            date: data.date,
            time: data.time,
            description: data.description || '',
            poster_url: data.poster_url || '',
            status: data.status,
          });
        } catch (error) {
          console.error('获取演唱会详情失败:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchConcert();
    }
  }, [id, isEdit]);

  const addTier = () => {
    if (tiers.length >= 8) {
      alert('最多添加8个票档');
      return;
    }
    setTiers([...tiers, {
      name: '',
      price: 0,
      totalSeats: 0,
      color: colors[tiers.length % colors.length],
      seats: [],
    }]);
  };

  const updateTier = (index: number, field: keyof Tier, value: any) => {
    const newTiers = [...tiers];
    (newTiers[index] as any)[field] = value;
    
    if (field === 'totalSeats' && value > 0) {
      const seatsPerRow = Math.ceil(Math.sqrt(value));
      const seats: { row: string; seatNumber: string }[] = [];
      let count = 0;
      for (let r = 0; r < seatsPerRow && count < value; r++) {
        const rowLetter = String.fromCharCode(65 + r);
        const seatsInRow = Math.min(seatsPerRow, value - count);
        for (let s = 1; s <= seatsInRow; s++) {
          seats.push({ row: rowLetter, seatNumber: String(s) });
          count++;
        }
      }
      newTiers[index].seats = seats;
    }
    
    setTiers(newTiers);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.artist || !formData.city || !formData.venue || !formData.date || !formData.time) {
      setError('请填写所有必填字段');
      return;
    }

    if (!isEdit && tiers.length === 0) {
      setError('请至少添加一个票档');
      return;
    }

    if (!isEdit) {
      for (let i = 0; i < tiers.length; i++) {
        if (!tiers[i].name || !tiers[i].price || !tiers[i].totalSeats) {
          setError(`请完善第${i + 1}个票档的信息`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      if (isEdit) {
        await concertApi.updateConcert(parseInt(id!), formData);
        alert('更新成功');
      } else {
        await concertApi.createConcert({
          ...formData,
          tiers,
        });
        alert('创建成功');
      }
      navigate('/concerts');
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/concerts" className="text-gray-500 hover:text-blue-600 mb-6 inline-flex items-center gap-2">
        <span>←</span> 返回列表
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {isEdit ? '编辑演唱会' : '创建演唱会'}
        </h1>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">演唱会名称 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="例如：周杰伦2026世界巡回演唱会"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">艺人/乐队 *</label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="例如：周杰伦"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">城市 *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="例如：上海"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">场馆 *</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="例如：梅赛德斯-奔驰文化中心"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日期 *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">时间 *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">海报URL</label>
              <input
                type="url"
                value={formData.poster_url}
                onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="https://..."
              />
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="upcoming">即将开始</option>
                  <option value="ongoing">进行中</option>
                  <option value="completed">已结束</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">演出介绍</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              rows={4}
              placeholder="请输入演出介绍..."
            />
          </div>

          {!isEdit && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">票档设置</h3>
                <button
                  type="button"
                  onClick={addTier}
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  + 添加票档
                </button>
              </div>

            <div className="space-y-4">
              {tiers.map((tier, index) => (
                <div key={index} className="p-4 border rounded-xl bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      ></div>
                      <span className="font-medium text-gray-800">票档 {index + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTier(index)}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      删除
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">名称</label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => updateTier(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：内场VIP"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">价格 (元)</label>
                      <input
                        type="number"
                        value={tier.price || ''}
                        onChange={(e) => updateTier(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：880"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">总座位数</label>
                      <input
                        type="number"
                        value={tier.totalSeats || ''}
                        onChange={(e) => updateTier(index, 'totalSeats', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例如：500"
                      />
                    </div>
                  </div>
                  {tier.totalSeats > 0 && (
                    <div className="mt-3 text-sm text-gray-500">
                      系统将自动生成 {tier.seats.length} 个座位
                    </div>
                  )}
                </div>
              ))}
            </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : (isEdit ? '保存修改' : '创建演唱会')}
            </button>
            <Link
              to="/concerts"
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
