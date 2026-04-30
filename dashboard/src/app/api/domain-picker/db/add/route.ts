import { NextRequest, NextResponse } from "next/server";
import { upsertEntries, PickerEntry } from "@/lib/picker-db";

// POST body: { entries: Omit<PickerEntry, "addedAt">[] }
export async function POST(request: NextRequest) {
  try {
    const { entries }: { entries: Omit<PickerEntry, "addedAt">[] } = await request.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "entries phải là mảng không rỗng" },
        { status: 400 }
      );
    }

    // Normalize domains
    const normalized = entries
      .map((e) => ({ ...e, domain: (e.domain || "").trim().toLowerCase() }))
      .filter((e) => e.domain);

    const result = await upsertEntries(normalized);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
