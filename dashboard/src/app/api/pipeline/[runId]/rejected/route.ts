import { NextRequest, NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const APIFY_BASE = "https://api.apify.com/v2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const runRes = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`,
      { cache: "no-store" }
    );
    const runData = await runRes.json();
    const kvId = runData.data?.defaultKeyValueStoreId;
    if (!kvId)
      return NextResponse.json({ error: "KV store not found" }, { status: 404 });

    const url = `${APIFY_BASE}/key-value-stores/${kvId}/records/REJECTED_DOMAINS?token=${APIFY_TOKEN}`;
    const r = await fetch(url, { cache: "no-store" });
    if (r.status === 404) return NextResponse.json([]);
    const data = await r.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
