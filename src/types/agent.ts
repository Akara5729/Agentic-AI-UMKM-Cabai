import { FulfillmentMethod } from './database';

export interface ExtractedOrderItem {
  product_id?: string;
  product_name?: string;
  quantity_kg: number;
  stem_removed: boolean;
}

export interface ExtractedOrderPayload {
  action: 'CREATE_ORDER';
  customer_name: string;
  items: ExtractedOrderItem[];
  fulfillment_method?: FulfillmentMethod;
  pickup_time_estimate?: string;
  notes?: string;
}

export interface AgentContextData {
  storeSettings: {
    store_name: string;
    is_open: boolean;
    opening_hours: string;
    address: string;
    stem_removal_fee_per_kg: number;
    payment_info: string;
  };
  products: Array<{
    id: string;
    name: string;
    current_price_per_kg: number;
    stock_kg: number;
    is_available: boolean;
  }>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
