import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, DbEntry } from "@/lib/backlink-db";

// POST body: { entries: { domain: string, dr: number }[] }
export async function POST(request: NextRequest) {
  try {
    const { entries: toAdd }: { entries: DbEntry[] } = await request.json();
    if (!Array.isArray(toAdd) || toAdd.length === 0) {
      return NextResponse.json(
        { error: "entries phải là mảng không rỗng" },
        { status: 400 }
      );
    }

    const current = await readDb();
    const map = new Map<string, number>(current.map((e) => [e.domain, e.dr]));

    // Upsert: newer DR wins
    for (const e of toAdd) {
      const domain = e.domain.trim().toLowerCase();
      if (domain) map.set(domain, Number(e.dr) || 0);
    }

    const updated: DbEntry[] = Array.from(map.entries()).map(([domain, dr]) => ({
      domain,
      dr,
    }));
    await writeDb(updated);

    return NextResponse.json({
      ok: true,
      added: updated.length - current.length,
      total: updated.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
