import { NextRequest, NextResponse } from "next/server";
import { deleteEntry } from "@/lib/picker-db";

// DELETE /api/domain-picker/db/:domain
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
