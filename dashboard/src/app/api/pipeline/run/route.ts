import { NextRequest, NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const ACTOR_ID = process.env.PIPELINE_ACTOR_ID!;
const APIFY_BASE = "https://api.apify.com/v2";

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();
    const url = `${APIFY_BASE}/acts/${encodeURIComponent(ACTOR_ID)}/runs?token=${APIFY_TOKEN}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await r.json();
    if (!r.ok) return NextResponse.json(data, { status: r.status });

    return NextResponse.json({
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
