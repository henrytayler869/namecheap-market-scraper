import { NextRequest, NextResponse } from "next/server";
import { readAll, addEntry, AddInput, ORDER_CURRENCIES } from "@/lib/os-orders-db";

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
    if (!body.packageName?.trim() || typeof body.price !== "number" || typeof body.revenue !== "number") {
      return NextResponse.json(
        { error: "Thiếu trường bắt buộc: packageName, price, revenue" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.paymentSplits) || body.paymentSplits.length === 0) {
      return NextResponse.json(
        { error: "paymentSplits phải là mảng không rỗng" },
        { status: 400 }
      );
    }
    const total = body.paymentSplits.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json(
        { error: `Tổng % thanh toán phải = 100 (hiện tại: ${total})` },
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
