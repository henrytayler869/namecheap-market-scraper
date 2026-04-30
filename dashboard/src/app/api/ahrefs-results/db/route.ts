import { NextResponse } from "next/server";
import { readTargetSummary, clearAll } from "@/lib/ahrefs-db";

// GET — list target summaries (one row per target)
export async function GET() {
  try {
    const summaries = await readTargetSummary();
    return NextResponse.json(summaries);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE — clear entire DB
export async function DELETE() {
  try {
    await clearAll();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
