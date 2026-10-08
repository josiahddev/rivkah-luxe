import type { Role } from "@/generated/prisma/enums";

export type Permission =
  | "dashboard"
  | "products"
  | "inventory"
  | "orders"
  | "customers"
  | "discounts"
  | "promotions"
  | "reviews"
  | "content"
  | "shipping"
  | "analytics"
  | "messages"
  | "media"
  | "subscribers"
  | "settings"
  | "team"
  | "activity";

const STORE_MANAGER: Permission[] = [
  "dashboard", "products", "inventory", "orders", "customers", "discounts", "promotions",
  "reviews", "shipping", "analytics", "messages", "media", "subscribers",
];

const CONTENT_MANAGER: Permission[] = ["dashboard", "content", "promotions", "reviews", "media", "messages"];

export const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "STORE_MANAGER", "CONTENT_MANAGER"];

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: "Customer",
  SUPER_ADMIN: "Owner (full access)",
  STORE_MANAGER: "Store Manager",
  CONTENT_MANAGER: "Content Manager",
};

export const ROLE_DESCRIPTIONS: Record<Exclude<Role, "CUSTOMER">, string> = {
  SUPER_ADMIN: "Can do everything, including settings, payments and team members.",
  STORE_MANAGER: "Products, stock, orders, customers, discounts, delivery and sales reports.",
  CONTENT_MANAGER: "Website content, banners, promotions, reviews and photos.",
};

export function isAdminRole(role: Role) {
  return ADMIN_ROLES.includes(role);
}

export function can(role: Role, permission: Permission) {
  if (role === "SUPER_ADMIN") return true;
  if (role === "STORE_MANAGER") return STORE_MANAGER.includes(permission);
  if (role === "CONTENT_MANAGER") return CONTENT_MANAGER.includes(permission);
  return false;
}
