import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary-600">
            🎫 演唱会票务平台
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-primary-600 transition-colors">
              演唱会
            </Link>
            {user ? (
              <>
                <Link to="/orders" className="text-gray-600 hover:text-primary-600 transition-colors">
                  我的订单
                </Link>
                <span className="text-gray-500">你好，{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  退出
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  注册
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-gray-50 border-t py-6 text-center text-gray-500 text-sm">
        <p>© 2026 演唱会票务平台 版权所有</p>
      </footer>
    </div>
  );
}
