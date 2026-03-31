import type { Platform } from "./channel";

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type FinancialStatus = "pending" | "paid" | "partially_refunded" | "refunded";

export interface Order {
  id: string;
  orgId: string;
  channelId: string;
  platform: Platform;
  platformOrderId: string;
  orderNumber: string;
  status: OrderStatus;
  financialStatus: FinancialStatus;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  totalTax: number;
  totalShipping: number;
  totalDiscounts: number;
  totalAmount: number;
  currency: string;
  platformFees: number;
  cogs: number;
  netProfit: number;
  itemCount: number;
  orderedAt: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
