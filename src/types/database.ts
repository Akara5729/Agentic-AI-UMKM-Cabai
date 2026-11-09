export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type FulfillmentMethod = 'PICKUP' | 'DELIVERY_COURIER';

export interface StoreSettings {
  id: string;
  store_name: string;
  is_open: boolean;
  opening_hours: string;
  address: string;
  payment_info: string;
  stem_removal_fee_per_kg: number;
  min_order_kg: number;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  current_price_per_kg: number;
  stock_kg: number;
  is_available: boolean;
  description?: string | null;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  price_per_kg_snapshot: number;
  quantity_kg: number;
  stem_removed: boolean;
  stem_removal_fee: number;
  subtotal: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  telegram_chat_id: number;
  customer_name: string;
  customer_username?: string | null;
  status: OrderStatus;
  fulfillment_method: FulfillmentMethod;
  pickup_time_estimate?: string | null;
  total_amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface BotConversation {
  chat_id: number;
  conversation_history: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  last_interaction: string;
}

export interface Database {
  public: {
    Tables: {
      store_settings: {
        Row: StoreSettings;
        Insert: Partial<StoreSettings>;
        Update: Partial<StoreSettings>;
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & { name: string; slug: string; current_price_per_kg: number };
        Update: Partial<Product>;
      };
      orders: {
        Row: Order;
        Insert: Partial<Order> & { order_number: string; telegram_chat_id: number; customer_name: string; total_amount: number };
        Update: Partial<Order>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Partial<OrderItem> & { order_id: string; product_id: string; product_name_snapshot: string; price_per_kg_snapshot: number; quantity_kg: number; subtotal: number };
        Update: Partial<OrderItem>;
      };
      bot_conversations: {
        Row: BotConversation;
        Insert: Partial<BotConversation> & { chat_id: number };
        Update: Partial<BotConversation>;
      };
    };
  };
}
