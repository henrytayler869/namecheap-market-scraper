import { NextResponse } from "next/server";
import { listCheckedTargets } from "@/lib/ahrefs-db";

// GET — return list of unique target_domain values (for fast filter exclusion)
export async function GET() {
  try {
    const targets = await listCheckedTargets();
    return NextResponse.json({ targets });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
