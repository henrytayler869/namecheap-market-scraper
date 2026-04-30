import { NextResponse } from "next/server";
import { readDb, clearDb } from "@/lib/picker-db";

// GET — list all entries
export async function GET() {
  try {
    const entries = await readDb();
    return NextResponse.json(entries);
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
    await clearDb();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
