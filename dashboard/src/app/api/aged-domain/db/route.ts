import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/backlink-db";

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
    await writeDb([]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
