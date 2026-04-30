import { NextResponse } from "next/server";
import { readAll } from "@/lib/inventory-db";

export async function GET() {
  try {
    const entries = await readAll();
    return NextResponse.json(entries);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
