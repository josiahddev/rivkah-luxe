"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { changeOrderStatus } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { fail, FRIENDLY_ERROR, str, type ActionResult } from "@/lib/action";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/enums";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export async function updateOrderStatus(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("orders");
  const id = str(fd, "orderId");
  const status = str(fd, "status") as OrderStatus;
  if (!STATUSES.includes(status)) return fail("Please choose a status.");
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return fail("Order not found.");
  if (order.paymentStatus !== "PAID" && !["PENDING", "CANCELLED"].includes(status))
    return fail("This order hasn't been paid yet. You can only cancel it.");
  try {
    await changeOrderStatus(id, status, user, { note: str(fd, "note").slice(0, 500) || undefined, notifyCustomer: fd.get("notify") === "on" });
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/admin/orders");
    return { ok: true, message: `Order marked as ${ORDER_STATUS_LABEL[status]}.${fd.get("notify") === "on" ? " The customer has been emailed." : ""}` };
  } catch (err) {
    console.error("[admin:orderStatus]", err);
    return fail(FRIENDLY_ERROR);
  }
}

export async function addOrderNote(_prev: unknown, fd: FormData): Promise<ActionResult> {
  const user = await requireAdmin("orders");
  const body = z.string().trim().min(1, "Write a note first").max(2000).safeParse(str(fd, "body"));
  if (!body.success) return fail(body.error.issues[0].message);
  const orderId = str(fd, "orderId");
  await db.orderNote.create({ data: { orderId, authorId: user.id, body: body.data } });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Note added. Only your team can see it." };
}

export async function clearOrderAttention(orderId: string): Promise<ActionResult> {
  const user = await requireAdmin("orders");
  const o = await db.order.update({ where: { id: orderId }, data: { needsAttention: null } });
  await audit(user, "Resolved order issue", "Order", orderId, `${user.name} marked the issue on ${o.orderNumber} as resolved.`);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Marked as resolved." };
}

// ───────────── Customers ─────────────

export async function setCustomerStatus(userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionResult> {
  const admin = await requireAdmin("customers");
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u || u.role !== "CUSTOMER") return fail("Customer not found.");
  await db.user.update({ where: { id: userId }, data: { status } });
  if (status === "SUSPENDED") await db.session.deleteMany({ where: { userId } });
  await audit(admin, status === "SUSPENDED" ? "Suspended customer" : "Re-activated customer", "User", userId, `${admin.name} ${status === "SUSPENDED" ? "suspended" : "re-activated"} ${u.name}'s account.`);
  revalidatePath(`/admin/customers/${userId}`);
  return { ok: true, message: status === "SUSPENDED" ? "Account suspended." : "Account re-activated." };
}
