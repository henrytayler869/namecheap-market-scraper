import { NextResponse } from "next/server";
import { readBlacklist, writeBlacklist } from "@/lib/blacklist";

// GET /api/blacklist — list all
export async function GET() {
  try {
    const domains = await readBlacklist();
    return NextResponse.json(domains);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/blacklist — clear all
export async function DELETE() {
  try {
    await writeBlacklist([]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
