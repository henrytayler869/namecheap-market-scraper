import { NextRequest, NextResponse } from "next/server";
import { readAll, addEntry, AddInput } from "@/lib/os-withdrawal-db";
import { ORDER_CURRENCIES } from "@/lib/os-orders-db";

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
    if (!body.withdrawnAt || typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "Thiếu hoặc sai trường: withdrawnAt, amount (>0)" },
        { status: 400 }
      );
    }
    if (body.currency !== undefined && !ORDER_CURRENCIES.includes(body.currency)) {
      return NextResponse.json(
        { error: `currency phải là một trong: ${ORDER_CURRENCIES.join(", ")}` },
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
