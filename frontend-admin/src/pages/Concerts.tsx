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
  status: string;
  tiers: { id: number; name: string; price: number; total_seats: number; sold_seats: number }[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  upcoming: { label: '即将开始', color: 'bg-blue-100 text-blue-700' },
  ongoing: { label: '进行中', color: 'bg-green-100 text-green-700' },
  completed: { label: '已结束', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

export default function Concerts() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    const fetchConcerts = async () => {
      setLoading(true);
      try {
        const response = await concertApi.getConcerts({ page, limit });
        setConcerts(response.data.concerts);
        setTotal(response.data.total);
      } catch (error) {
        console.error('获取演唱会列表失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConcerts();
  }, [page]);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`确定要删除演唱会"${title}"吗？此操作不可恢复。`)) return;
    
    try {
      await concertApi.deleteConcert(id);
      setConcerts(prev => prev.filter(c => c.id !== id));
      alert('删除成功');
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败，请重试');
    }
  };

  const getTotalSold = (tiers: { sold_seats: number }[]) => {
    return tiers.reduce((sum, t) => sum + t.sold_seats, 0);
  };

  const getTotalSeats = (tiers: { total_seats: number }[]) => {
    return tiers.reduce((sum, t) => sum + t.total_seats, 0);
  };

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
        <h1 className="text-2xl font-bold text-gray-800">演唱会管理</h1>
        <Link
          to="/concerts/new"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + 创建演唱会
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">演唱会</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">艺人</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">城市</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">日期</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">售票进度</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">状态</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {concerts.map(concert => (
              <tr key={concert.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-800">{concert.title}</div>
                  <div className="text-xs text-gray-500">{concert.venue}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{concert.artist}</td>
                <td className="px-6 py-4 text-gray-600">{concert.city}</td>
                <td className="px-6 py-4 text-gray-600">{concert.date}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${(getTotalSold(concert.tiers) / getTotalSeats(concert.tiers)) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {getTotalSold(concert.tiers)}/{getTotalSeats(concert.tiers)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusMap[concert.status]?.color}`}>
                    {statusMap[concert.status]?.label || concert.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/concerts/${concert.id}`}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      详情
                    </Link>
                    <Link
                      to={`/concerts/${concert.id}/edit`}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleDelete(concert.id, concert.title)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {concerts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无演唱会数据
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
