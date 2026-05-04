import { NextRequest, NextResponse } from "next/server";
import { readAll, addEntry, AddInput } from "@/lib/os-partners-db";

export async function GET() {
  try {
    const list = await readAll();
    return NextResponse.json(list);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AddInput;
    if (!body.name?.trim() || typeof body.discountPercent !== "number") {
      return NextResponse.json(
        { error: "Thiếu trường bắt buộc: name, discountPercent" },
        { status: 400 }
      );
    }
    const entry = await addEntry(body);
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
