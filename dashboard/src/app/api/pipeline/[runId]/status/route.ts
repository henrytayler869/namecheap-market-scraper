import { NextRequest, NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const APIFY_BASE = "https://api.apify.com/v2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const url = `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`;
    const r = await fetch(url, { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) return NextResponse.json(data, { status: r.status });

    const { status, stats, defaultDatasetId } = data.data;
    return NextResponse.json({ status, stats, datasetId: defaultDatasetId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
