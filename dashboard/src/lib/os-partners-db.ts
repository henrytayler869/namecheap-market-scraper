/**
 * OS Service Partners — đối tác cung cấp dịch vụ với chiết khấu.
 * Backed by Supabase (table: os_partners).
 */

import { supabase } from "./supabase";

const TABLE = "os_partners";

export interface Partner {
  id: string;
  name: string;
  discountPercent: number;
  quotationLink: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbRow {
  id: string;
  name: string;
  discount_percent: number;
  quotation_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToEntry(r: DbRow): Partner {
  return {
    id: r.id,
    name: r.name,
    discountPercent: Number(r.discount_percent),
    quotationLink: r.quotation_link,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function readAll(): Promise<Partner[]> {
  const sb = supabase();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DbRow[] ?? []).map(rowToEntry);
}

export interface AddInput {
  name: string;
  discountPercent: number;
  quotationLink?: string | null;
  notes?: string | null;
}

export async function addEntry(input: AddInput): Promise<Partner> {
  const sb = supabase();
  const { data, error } = await sb.from(TABLE).insert({
    name: input.name.trim(),
    discount_percent: input.discountPercent,
    quotation_link: input.quotationLink?.trim() || null,
    notes: input.notes?.trim() || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return rowToEntry(data as DbRow);
}

export interface UpdateInput {
  name?: string;
  discountPercent?: number;
  quotationLink?: string | null;
  notes?: string | null;
}

export async function updateEntry(id: string, patch: UpdateInput): Promise<void> {
  const sb = supabase();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.discountPercent !== undefined) updates.discount_percent = patch.discountPercent;
  if (patch.quotationLink !== undefined) updates.quotation_link = patch.quotationLink?.trim() || null;
  if (patch.notes !== undefined) updates.notes = patch.notes?.trim() || null;
  const { error } = await sb.from(TABLE).update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEntry(id: string): Promise<void> {
  const sb = supabase();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
