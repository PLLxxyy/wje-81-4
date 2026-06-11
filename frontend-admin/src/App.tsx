import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Concerts from './pages/Concerts';
import ConcertForm from './pages/ConcertForm';
import ConcertDetail from './pages/ConcertDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (!token || user?.role !== 'admin') {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AdminRoute><Layout /></AdminRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="concerts" element={<Concerts />} />
        <Route path="concerts/new" element={<ConcertForm />} />
        <Route path="concerts/:id" element={<ConcertDetail />} />
        <Route path="concerts/:id/edit" element={<ConcertForm />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
      </Route>
    </Routes>
  );
}

export default App;
