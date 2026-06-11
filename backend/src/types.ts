export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Concert {
  id: number;
  title: string;
  artist: string;
  city: string;
  venue: string;
  date: string;
  time: string;
  description?: string;
  poster_url?: string;
  seat_map_config?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
}

export interface TicketTier {
  id: number;
  concert_id: number;
  name: string;
  price: number;
  total_seats: number;
  sold_seats: number;
  color?: string;
}

export interface Seat {
  id: number;
  concert_id: number;
  tier_id: number;
  row: string;
  seat_number: string;
  status: 'available' | 'locked' | 'sold';
  order_id?: number;
  locked_until?: string;
}

export interface Order {
  id: number;
  user_id: number;
  concert_id: number;
  order_no: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  buyer_name: string;
  buyer_id_card: string;
  qr_code?: string;
  created_at: string;
  paid_at?: string;
  refunded_at?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  seat_id: number;
  tier_id: number;
  ticket_holder_name: string;
  ticket_holder_id_card: string;
  price: number;
  qr_code?: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}
