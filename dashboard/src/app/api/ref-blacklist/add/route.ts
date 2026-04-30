import { NextRequest, NextResponse } from "next/server";
import { addEntries } from "@/lib/ref-blacklist-db";

// POST body: { domains: string[], note?: string }
export async function POST(request: NextRequest) {
  try {
    const { domains, note }: { domains: string[]; note?: string } = await request.json();
    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { error: "domains phải là mảng không rỗng" },
        { status: 400 }
      );
    }
    const result = await addEntries(domains, note);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
