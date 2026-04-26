import { NextRequest, NextResponse } from "next/server";
import { readBlacklist, writeBlacklist } from "@/lib/blacklist";

// POST /api/blacklist/add  body: { domains: string[] }
export async function POST(request: NextRequest) {
  try {
    const { domains: toAdd } = await request.json();
    if (!Array.isArray(toAdd) || toAdd.length === 0) {
      return NextResponse.json(
        { error: "domains phải là mảng không rỗng" },
        { status: 400 }
      );
    }

    const current = await readBlacklist();
    const updated = [
      ...new Set([
        ...current,
        ...toAdd.map((d: string) => d.toLowerCase().trim()),
      ]),
    ];
    await writeBlacklist(updated);

    return NextResponse.json({
      ok: true,
      added: updated.length - current.length,
      total: updated.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
