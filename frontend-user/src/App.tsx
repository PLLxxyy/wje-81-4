import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import ConcertDetail from './pages/ConcertDetail';
import SeatSelection from './pages/SeatSelection';
import OrderConfirm from './pages/OrderConfirm';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="concert/:id" element={<ConcertDetail />} />
        <Route path="concert/:id/select-seats" element={<PrivateRoute><SeatSelection /></PrivateRoute>} />
        <Route path="order/confirm" element={<PrivateRoute><OrderConfirm /></PrivateRoute>} />
        <Route path="orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
        <Route path="orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}

export default App;
