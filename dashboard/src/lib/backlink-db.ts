/**
 * Backlink DB — persistent storage for curated Domain→DR reference data.
 * Backed by Apify Key-Value Store ("backlink-database").
 */

const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const STORE_NAME = "backlink-database";
const STORE_KEY = "ENTRIES";
const APIFY_BASE = "https://api.apify.com/v2";

export interface DbEntry {
  domain: string;
  dr: number;
}

let _storeId: string | null = null;

async function getStoreId(): Promise<string> {
  if (_storeId) return _storeId;

  const r = await fetch(
    `${APIFY_BASE}/key-value-stores?token=${APIFY_TOKEN}&limit=100`,
    { cache: "no-store" }
  );
  const data = await r.json();
  const match = (data.data?.items ?? []).find(
    (s: { name: string; id: string }) => s.name === STORE_NAME
  );
  if (match) {
    _storeId = match.id as string;
    return _storeId!;
  }

  const cr = await fetch(
    `${APIFY_BASE}/key-value-stores?token=${APIFY_TOKEN}&name=${STORE_NAME}`,
    { method: "POST" }
  );
  const cdata = await cr.json();
  _storeId = cdata.data.id as string;
  return _storeId!;
}

export async function readDb(): Promise<DbEntry[]> {
  const storeId = await getStoreId();
  const r = await fetch(
    `${APIFY_BASE}/key-value-stores/${storeId}/records/${STORE_KEY}?token=${APIFY_TOKEN}`,
    { cache: "no-store" }
  );
  if (r.status === 404) return [];
  const data = await r.json();
  return Array.isArray(data?.entries) ? (data.entries as DbEntry[]) : [];
}

export async function writeDb(entries: DbEntry[]): Promise<void> {
  const storeId = await getStoreId();
  await fetch(
    `${APIFY_BASE}/key-value-stores/${storeId}/records/${STORE_KEY}?token=${APIFY_TOKEN}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    }
  );
}
