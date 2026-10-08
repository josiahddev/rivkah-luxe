import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAYMENT_CONFIRMED: "Payment Confirmed",
  PROCESSING: "Processing",
  READY_FOR_DELIVERY: "Ready for Delivery",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const ORDER_STATUS_HELP: Record<OrderStatus, string> = {
  PENDING: "Waiting for the customer to finish paying.",
  PAYMENT_CONFIRMED: "Paid. Start preparing this order.",
  PROCESSING: "You're packing the order.",
  READY_FOR_DELIVERY: "Packed and waiting for the rider/courier.",
  SHIPPED: "Handed to the courier.",
  OUT_FOR_DELIVERY: "The rider is on the way to the customer.",
  DELIVERED: "The customer has received it.",
  CANCELLED: "Order stopped. Stock goes back on the shelf.",
  REFUNDED: "Money returned to the customer.",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  FAILED: "Payment failed",
  CANCELLED: "Payment cancelled",
  REFUNDED: "Refunded",
};

// The journey a customer sees on the tracking page.
export const TRACKING_STEPS: OrderStatus[] = [
  "PAYMENT_CONFIRMED",
  "PROCESSING",
  "READY_FOR_DELIVERY",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export function deliveryStatus(status: OrderStatus): string {
  switch (status) {
    case "SHIPPED":
      return "In transit";
    case "OUT_FOR_DELIVERY":
      return "Out for delivery";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
    case "REFUNDED":
      return "Not shipping";
    default:
      return "Not yet shipped";
  }
}

export const STATUS_TONE: Record<OrderStatus, "neutral" | "gold" | "green" | "red" | "blue"> = {
  PENDING: "neutral",
  PAYMENT_CONFIRMED: "gold",
  PROCESSING: "blue",
  READY_FOR_DELIVERY: "blue",
  SHIPPED: "blue",
  OUT_FOR_DELIVERY: "blue",
  DELIVERED: "green",
  CANCELLED: "red",
  REFUNDED: "red",
};
