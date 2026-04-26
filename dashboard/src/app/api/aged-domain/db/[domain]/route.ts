import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/backlink-db";

// DELETE /api/aged-domain/db/:domain
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const target = decodeURIComponent(domain).toLowerCase().trim();
    const current = await readDb();
    const updated = current.filter((e) => e.domain !== target);
    await writeDb(updated);

    return NextResponse.json({
      ok: true,
      removed: current.length - updated.length,
      total: updated.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
