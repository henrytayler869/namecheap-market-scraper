/**
 * OS Service Withdrawals — rút doanh thu từ orders.
 * Backed by Supabase (table: os_withdrawals).
 */

import { supabase } from "./supabase";
import type { OrderCurrency } from "./os-orders-db";

const TABLE = "os_withdrawals";

export interface OsWithdrawal {
  id: string;
  withdrawnAt: string;
  amount: number;
  currency: OrderCurrency;
  notes: string | null;
  createdAt: string;
}

interface DbRow {
  id: string;
  withdrawn_at: string;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

function rowToEntry(r: DbRow): OsWithdrawal {
  const cur = (r.currency || "USD").toUpperCase();
  const currency: OrderCurrency = (["USD", "VND", "USDT"].includes(cur) ? cur : "USD") as OrderCurrency;
  return {
    id: r.id,
    withdrawnAt: r.withdrawn_at,
    amount: Number(r.amount),
    currency,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export async function readAll(): Promise<OsWithdrawal[]> {
  const sb = supabase();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("withdrawn_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DbRow[] ?? []).map(rowToEntry);
}

export interface AddInput {
  withdrawnAt: string;
  amount: number;
  currency?: OrderCurrency;
  notes?: string | null;
}

export async function addEntry(input: AddInput): Promise<OsWithdrawal> {
  const sb = supabase();
  const { data, error } = await sb.from(TABLE).insert({
    withdrawn_at: input.withdrawnAt,
    amount: input.amount,
    currency: input.currency ?? "USD",
    notes: input.notes ?? null,
  }).select().single();
  if (error) throw new Error(error.message);
  return rowToEntry(data as DbRow);
}

export interface UpdateInput {
  withdrawnAt?: string;
  amount?: number;
  currency?: OrderCurrency;
  notes?: string | null;
}

export async function updateEntry(id: string, patch: UpdateInput): Promise<void> {
  const sb = supabase();
  const updates: Record<string, unknown> = {};
  if (patch.withdrawnAt !== undefined) updates.withdrawn_at = patch.withdrawnAt;
  if (patch.amount !== undefined) updates.amount = patch.amount;
  if (patch.currency !== undefined) updates.currency = patch.currency;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (Object.keys(updates).length === 0) return;
  const { error } = await sb.from(TABLE).update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEntry(id: string): Promise<void> {
  const sb = supabase();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
