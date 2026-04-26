import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/lib/backlink-db";

const DATAFORSEO_ENDPOINT =
  "https://api.dataforseo.com/v3/backlinks/referring_domains/live";

export interface TopDomain {
  domain: string;
  dr: number;
  backlinks: number;
  inDb: boolean;
}

export interface DomainResult {
  domain: string;
  totalRefDomains: number;
  apiHighDr: number;   // referring domains with DataforSEO rank ≥ minDr
  dbMatches: number;   // referring domains found in curated DB with DR ≥ minDr
  maxDr: number;
  topDomains: TopDomain[];
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      domains,
      minDr = 30,
      limitPerDomain = 100,
    }: { domains: string[]; minDr: number; limitPerDomain: number } =
      await request.json();

    if (!domains?.length) {
      return NextResponse.json({ error: "No domains provided" }, { status: 400 });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    if (!login || !password) {
      return NextResponse.json(
        { error: "DataforSEO credentials not configured" },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${login}:${password}`).toString("base64");

    // Build tasks array — one per domain
    const tasks = domains.map((d) => ({
      target: d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""),
      limit: Math.min(limitPerDomain, 1000),
      order_by: ["rank,desc"],
    }));

    // Call DataforSEO (all domains in one request)
    const dfsRes = await fetch(DATAFORSEO_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tasks),
    });

    if (!dfsRes.ok) {
      const err = await dfsRes.text();
      return NextResponse.json(
        { error: `DataforSEO error: ${err}` },
        { status: 502 }
      );
    }

    const dfsData = await dfsRes.json();

    // Load curated backlink DB
    const dbEntries = await readDb();
    const dbMap = new Map<string, number>(dbEntries.map((e) => [e.domain, e.dr]));

    // Process each task result
    const results: DomainResult[] = (dfsData.tasks ?? []).map(
      (task: {
        status_code: number;
        status_message: string;
        data: { target: string };
        result?: {
          total_count?: number;
          items?: {
            domain: string;
            rank: number;
            backlinks: number;
          }[];
        }[];
      }) => {
        const target = task.data?.target ?? "unknown";

        if (task.status_code !== 20000 || !task.result?.[0]) {
          return {
            domain: target,
            totalRefDomains: 0,
            apiHighDr: 0,
            dbMatches: 0,
            maxDr: 0,
            topDomains: [],
            error: task.status_message ?? "No data",
          } satisfies DomainResult;
        }

        const result = task.result[0];
        const items = result.items ?? [];
        const totalRefDomains = result.total_count ?? 0;

        const apiHighDr = items.filter((i) => i.rank >= minDr).length;
        const dbMatches = items.filter((i) => {
          const dbDr = dbMap.get(i.domain);
          return dbDr !== undefined && dbDr >= minDr;
        }).length;
        const maxDr = items.length > 0 ? Math.max(...items.map((i) => i.rank)) : 0;

        // Top 10 by rank, annotated with DB status
        const topDomains: TopDomain[] = items.slice(0, 10).map((i) => ({
          domain: i.domain,
          dr: i.rank,
          backlinks: i.backlinks,
          inDb: dbMap.has(i.domain),
        }));

        return {
          domain: target,
          totalRefDomains,
          apiHighDr,
          dbMatches,
          maxDr,
          topDomains,
        } satisfies DomainResult;
      }
    );

    return NextResponse.json({ results, cost: dfsData.cost ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
