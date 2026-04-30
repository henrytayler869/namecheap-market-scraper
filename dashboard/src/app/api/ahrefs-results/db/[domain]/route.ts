import { NextRequest, NextResponse } from "next/server";
import { deleteTarget } from "@/lib/ahrefs-db";

// DELETE /api/ahrefs-results/db/:domain — remove all rows for one target
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const removed = await deleteTarget(decodeURIComponent(domain));
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
