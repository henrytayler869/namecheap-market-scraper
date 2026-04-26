import { NextRequest, NextResponse } from "next/server";
import { readBlacklist, writeBlacklist } from "@/lib/blacklist";

// DELETE /api/blacklist/:domain
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const target = decodeURIComponent(domain).toLowerCase().trim();
    const current = await readBlacklist();
    const updated = current.filter((d) => d !== target);
    await writeBlacklist(updated);

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
