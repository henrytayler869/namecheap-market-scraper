import { NextRequest, NextResponse } from "next/server";
import { markSold } from "@/lib/inventory-db";

// POST body: { rows: { domain, sellPrice }[] }
export async function POST(request: NextRequest) {
  try {
    const { rows }: { rows: { domain: string; sellPrice: number | null }[] } = await request.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "rows phải là mảng không rỗng" },
        { status: 400 }
      );
    }
    const result = await markSold(rows);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
