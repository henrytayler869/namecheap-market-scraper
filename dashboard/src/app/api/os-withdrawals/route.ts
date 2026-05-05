import { NextRequest, NextResponse } from "next/server";
import { readAll, addEntry } from "@/lib/os-withdrawal-db";
import { supabase } from "@/lib/supabase";
import { ORDER_CURRENCIES, OrderCurrency } from "@/lib/os-orders-db";

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

interface PostBody {
  orderId: string;
  installment?: number | null;
  withdrawnAt: string;
  amount: number;
  notes?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PostBody;
    if (!body.orderId || !body.withdrawnAt || typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "Thiếu hoặc sai trường: orderId, withdrawnAt, amount (>0)" },
        { status: 400 }
      );
    }
    // Look up the order to inherit currency + validate installment range
    const sb = supabase();
    const { data: order, error: orderErr } = await sb
      .from("os_orders")
      .select("id, currency, payment_count")
      .eq("id", body.orderId)
      .single();
    if (orderErr || !order) {
      return NextResponse.json({ error: "Đơn hàng không tồn tại" }, { status: 400 });
    }
    const cur = (order.currency || "USD").toUpperCase();
    const currency: OrderCurrency = (ORDER_CURRENCIES as readonly string[]).includes(cur)
      ? (cur as OrderCurrency)
      : "USD";

    // Validate installment (if provided) is within range [1, payment_count]
    let installment: number | null = null;
    if (body.installment !== undefined && body.installment !== null) {
      const n = Number(body.installment);
      if (!Number.isInteger(n) || n < 1 || n > (order.payment_count || 1)) {
        return NextResponse.json(
          { error: `Đợt thanh toán không hợp lệ (phải trong khoảng 1..${order.payment_count})` },
          { status: 400 }
        );
      }
      installment = n;
    }

    const entry = await addEntry({
      orderId: body.orderId,
      installment,
      withdrawnAt: body.withdrawnAt,
      amount: body.amount,
      currency,
      notes: body.notes,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
