import { NextRequest, NextResponse } from "next/server";
import { updateEntry, deleteEntry, UpdateInput } from "@/lib/os-withdrawal-db";
import { ORDER_CURRENCIES } from "@/lib/os-orders-db";

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
