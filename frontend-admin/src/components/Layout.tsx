import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: '数据概览', icon: '📊' },
    { path: '/concerts', label: '演唱会管理', icon: '🎵' },
    { path: '/orders', label: '订单管理', icon: '📋' },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <Link to="/dashboard" className="text-xl font-bold">
            🎫 票务管理后台
          </Link>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname.startsWith(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium">{user?.username}</div>
              <div className="text-xs text-gray-500">管理员</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 rounded-lg transition-colors text-left"
          >
            退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
