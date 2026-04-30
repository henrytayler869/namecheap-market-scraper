import { NextRequest, NextResponse } from "next/server";
import { updateEntry, deleteEntry } from "@/lib/inventory-db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const body = await request.json() as {
      purchasePrice?: number | null;
      sellPrice?: number | null;
      soldAt?: string | null;
      expectedSellPrice?: number | null;
      notes?: string | null;
    };
    await updateEntry(decodeURIComponent(domain), body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const removed = await deleteEntry(decodeURIComponent(domain));
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
