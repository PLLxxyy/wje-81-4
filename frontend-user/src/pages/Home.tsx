import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { concertApi } from '../api';

interface Concert {
  id: number;
  title: string;
  artist: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  poster_url?: string;
  tiers: { id: number; name: string; price: number; total_seats: number; sold_seats: number }[];
}

export default function Home() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [artists, setArtists] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedArtist, setSelectedArtist] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 6;

  const fetchConcerts = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (selectedArtist) params.artist = selectedArtist;
      if (selectedCity) params.city = selectedCity;
      if (selectedDate) params.date = selectedDate;
      
      const response = await concertApi.getConcerts(params);
      setConcerts(response.data.concerts);
      setTotal(response.data.total);
    } catch (error) {
      console.error('获取演唱会列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [artistsRes, citiesRes] = await Promise.all([
          concertApi.getArtists(),
          concertApi.getCities()
        ]);
        setArtists(artistsRes.data);
        setCities(citiesRes.data);
      } catch (error) {
        console.error('获取筛选条件失败:', error);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchConcerts();
  }, [selectedArtist, selectedCity, selectedDate, page]);

  const handleReset = () => {
    setSelectedArtist('');
    setSelectedCity('');
    setSelectedDate('');
    setPage(1);
  };

  const getMinPrice = (tiers: { price: number }[]) => {
    return Math.min(...tiers.map(t => t.price));
  };

  const getTotalRemaining = (tiers: { total_seats: number; sold_seats: number }[]) => {
    return tiers.reduce((sum, t) => sum + (t.total_seats - t.sold_seats), 0);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🎵 近期演唱会</h1>
        <p className="text-gray-500">发现精彩演出，抢购心仪门票</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">艺人</label>
            <select
              value={selectedArtist}
              onChange={(e) => { setSelectedArtist(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">全部艺人</option>
              {artists.map(artist => (
                <option key={artist} value={artist}>{artist}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">城市</label>
            <select
              value={selectedCity}
              onChange={(e) => { setSelectedCity(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">全部城市</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">日期（从）</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleReset}
              className="w-full px-4 py-2.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              重置筛选
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
      ) : concerts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎤</div>
          <p className="text-gray-500 text-lg">暂无符合条件的演唱会</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {concerts.map(concert => (
              <Link
                key={concert.id}
                to={`/concert/${concert.id}`}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
                  {concert.poster_url ? (
                    <img
                      src={concert.poster_url}
                      alt={concert.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-6xl">
                      🎵
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-xs text-primary-600 font-medium mb-1">{concert.artist}</div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">{concert.title}</h3>
                  <div className="space-y-1.5 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{concert.date} {concert.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span className="line-clamp-1">{concert.city} · {concert.venue}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <span className="text-xs text-gray-400">最低</span>
                      <div className="text-xl font-bold text-red-500">¥{getMinPrice(concert.tiers)}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">剩余</span>
                      <div className="text-sm font-medium text-gray-700">{getTotalRemaining(concert.tiers)} 张</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-gray-600 px-4">
                第 {page} / {totalPages} 页，共 {total} 场
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
