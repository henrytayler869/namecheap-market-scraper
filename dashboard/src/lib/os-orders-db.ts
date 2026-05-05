/**
 * OS Service Orders — đơn hàng dịch vụ với phân chia thanh toán.
 * Backed by Supabase (table: os_orders).
 *
 * payment_splits: array of % per installment, e.g. [50, 30, 20] for 3 payments
 * Sum should be 100. Length should equal payment_count.
 */

import { supabase } from "./supabase";

const TABLE = "os_orders";

export type OrderCurrency = "USD" | "VND" | "USDT";

export const ORDER_CURRENCIES: OrderCurrency[] = ["USD", "VND", "USDT"];

export interface Order {
  id: string;
  partnerId: string | null;
  packageName: string;
  price: number;
  revenue: number;
  currency: OrderCurrency;
  paymentCount: number;
  paymentSplits: number[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbRow {
  id: string;
  partner_id: string | null;
  package_name: string;
  price: number;
  revenue: number;
  currency: string;
  payment_count: number;
  payment_splits: number[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEntry(r: DbRow): Order {
  const cur = (r.currency || "USD").toUpperCase();
  const currency: OrderCurrency = (ORDER_CURRENCIES as readonly string[]).includes(cur) ? (cur as OrderCurrency) : "USD";
  return {
    id: r.id,
    partnerId: r.partner_id,
    packageName: r.package_name,
    price: Number(r.price),
    revenue: Number(r.revenue),
    currency,
    paymentCount: r.payment_count,
    paymentSplits: Array.isArray(r.payment_splits) ? r.payment_splits.map((n) => Number(n)) : [],
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function readAll(): Promise<Order[]> {
  const sb = supabase();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DbRow[] ?? []).map(rowToEntry);
}

export interface AddInput {
  partnerId: string | null;
  packageName: string;
  price: number;
  revenue: number;
  currency?: OrderCurrency;
  paymentSplits: number[];
  notes?: string | null;
}

export async function addEntry(input: AddInput): Promise<Order> {
  const sb = supabase();
  const { data, error } = await sb.from(TABLE).insert({
    partner_id: input.partnerId,
    package_name: input.packageName.trim(),
    price: input.price,
    revenue: input.revenue,
    currency: input.currency ?? "USD",
    payment_count: input.paymentSplits.length,
    payment_splits: input.paymentSplits,
    notes: input.notes?.trim() || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return rowToEntry(data as DbRow);
}

export interface UpdateInput {
  partnerId?: string | null;
  packageName?: string;
  price?: number;
  revenue?: number;
  currency?: OrderCurrency;
  paymentSplits?: number[];
  notes?: string | null;
}

export async function updateEntry(id: string, patch: UpdateInput): Promise<void> {
  const sb = supabase();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.partnerId !== undefined) updates.partner_id = patch.partnerId;
  if (patch.packageName !== undefined) updates.package_name = patch.packageName.trim();
  if (patch.price !== undefined) updates.price = patch.price;
  if (patch.revenue !== undefined) updates.revenue = patch.revenue;
  if (patch.currency !== undefined) updates.currency = patch.currency;
  if (patch.paymentSplits !== undefined) {
    updates.payment_splits = patch.paymentSplits;
    updates.payment_count = patch.paymentSplits.length;
  }
  if (patch.notes !== undefined) updates.notes = patch.notes?.trim() || null;
  const { error } = await sb.from(TABLE).update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEntry(id: string): Promise<void> {
  const sb = supabase();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
