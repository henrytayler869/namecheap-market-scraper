import { NextRequest, NextResponse } from "next/server";
import { updateEntry, deleteEntry, UpdateInput, ORDER_CURRENCIES } from "@/lib/os-orders-db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as UpdateInput;
    if (body.currency !== undefined && !ORDER_CURRENCIES.includes(body.currency)) {
      return NextResponse.json(
        { error: `currency phải là một trong: ${ORDER_CURRENCIES.join(", ")}` },
        { status: 400 }
      );
    }
    if (body.paymentSplits !== undefined) {
      if (!Array.isArray(body.paymentSplits) || body.paymentSplits.length === 0) {
        return NextResponse.json({ error: "paymentSplits không hợp lệ" }, { status: 400 });
      }
      const total = body.paymentSplits.reduce((a, b) => a + b, 0);
      if (Math.abs(total - 100) > 0.01) {
        return NextResponse.json(
          { error: `Tổng % thanh toán phải = 100 (hiện tại: ${total})` },
          { status: 400 }
        );
      }
    }
    await updateEntry(id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteEntry(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
