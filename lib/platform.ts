export type Role = "customer" | "administrator";
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: Role;
  active: boolean;
  created_at: string;
  last_login_at?: string | null;
}
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  unit: string;
  colors: string[];
  sizes: string[];
  model_url: string;
  image_url: string;
  active: boolean;
  demo: boolean;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  featured?: boolean;
}
export const requestStatuses = {
  new: "Por confirmar",
  reviewing: "En revisión",
  quoted: "Cotizada",
  confirmed: "Confirmada",
  preparing: "En preparación",
  shipped: "Enviada",
  delivered: "Entregada",
  closed: "Finalizada",
  cancelled: "Cancelada",
} as const;
export type RequestStatus = keyof typeof requestStatuses;
export const requestTransitions: Record<RequestStatus, RequestStatus[]> = {
  new: ["reviewing", "confirmed", "cancelled"],
  reviewing: ["quoted", "confirmed", "cancelled"],
  quoted: ["reviewing", "confirmed", "closed", "cancelled"],
  confirmed: ["preparing", "closed", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["closed"],
  closed: [],
  cancelled: [],
};
export interface DeliveryDetails {
  full_name: string;
  phone: string;
  city: string;
  address: string;
  reference: string;
}
export interface OrderLine {
  product_id: string;
  name: string;
  color: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  image_url: string;
}
export interface CommercialRequest {
  items?: OrderLine[] | null;
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string | null;
  product_snapshot?: Product | null;
  delivery?: DeliveryDetails | null;
  payment_method?: "cod" | null;
  unit_price_cents?: number;
  title: string;
  description: string;
  quantity: number;
  color: string;
  size: string;
  finish: string;
  estimated_total_cents: number;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  analysis_id: string | null;
}
export interface RequestEvent {
  id: string;
  author_id: string;
  author_name: string;
  message: string;
  status: RequestStatus | null;
  internal: boolean;
  system?: boolean;
  created_at: string;
}
export interface Feedback {
  id: string;
  user_id: string;
  customer_name: string;
  kind: "complaint" | "suggestion";
  subject: string;
  message: string;
  status: "open" | "reviewing" | "resolved";
  response: string;
  created_at: string;
}
export interface AnalysisResult {
  space?: { length_m: number; width_m: number; layout: "edge"; gap_cm: number };
  summary: string;
  limitations: string;
  items: {
    product_id: string;
    name: string;
    quantity: number;
    reason: string;
    unit_price_cents: number;
    subtotal_cents: number;
    calculation?: string;
  }[];
}
export interface Analysis {
  id: string;
  context: string;
  result: AnalysisResult;
  total_cents: number;
  created_at: string;
}
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
export interface IntegrationStatus {
  database: "supabase" | "postgresql" | "local";
  ai: boolean;
  personalization?: boolean;
  email: boolean;
}
export function money(cents: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
