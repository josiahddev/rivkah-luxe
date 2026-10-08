import type { Permission } from "@/lib/auth/permissions";

export type NavItem = { href: string; label: string; icon: string; permission: Permission; hint: string };
export type NavGroup = { title: string; items: NavItem[] };

// Plain-language navigation for the store owner.
export const ADMIN_NAV: NavGroup[] = [
  {
    title: "",
    items: [{ href: "/admin", label: "Home", icon: "home", permission: "dashboard", hint: "Today at a glance" }],
  },
  {
    title: "Sell",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "bag", permission: "orders", hint: "See and update customer orders" },
      { href: "/admin/products", label: "Products", icon: "box", permission: "products", hint: "Add and edit what you sell" },
      { href: "/admin/inventory", label: "Stock", icon: "layers", permission: "inventory", hint: "Update how many you have" },
      { href: "/admin/categories", label: "Categories", icon: "tag", permission: "products", hint: "Group products (Body Oils, Scrubs…)" },
      { href: "/admin/customers", label: "Customers", icon: "users", permission: "customers", hint: "People who shop with you" },
    ],
  },
  {
    title: "Grow",
    items: [
      { href: "/admin/discounts", label: "Discount codes", icon: "tag", permission: "discounts", hint: "Create codes like WELCOME10" },
      { href: "/admin/promotions", label: "Promotions", icon: "megaphone", permission: "promotions", hint: "Seasonal campaigns & banners" },
      { href: "/admin/reviews", label: "Reviews", icon: "star", permission: "reviews", hint: "Approve what customers say" },
      { href: "/admin/subscribers", label: "Email subscribers", icon: "mail", permission: "subscribers", hint: "Newsletter sign-ups" },
      { href: "/admin/analytics", label: "Sales reports", icon: "chart", permission: "analytics", hint: "How the store is doing" },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/content", label: "Website content", icon: "edit", permission: "content", hint: "Homepage, pages, FAQ" },
      { href: "/admin/media", label: "Photos", icon: "image", permission: "media", hint: "All your uploaded images" },
      { href: "/admin/messages", label: "Messages", icon: "message", permission: "messages", hint: "Contact form enquiries" },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: "/admin/shipping", label: "Shipping", icon: "truck", permission: "shipping", hint: "Delivery fees by country" },
      { href: "/admin/settings", label: "Settings", icon: "settings", permission: "settings", hint: "Store details, payments, tax" },
      { href: "/admin/team", label: "Team", icon: "users", permission: "team", hint: "Who can access the dashboard" },
      { href: "/admin/activity", label: "Activity log", icon: "clock", permission: "activity", hint: "Who changed what" },
      { href: "/admin/help", label: "Help & guides", icon: "help", permission: "dashboard", hint: "How to do things" },
    ],
  },
];
