const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const BL_STORE_NAME = process.env.BL_STORE_NAME ?? "domain-blacklist";
const BL_KEY = process.env.BL_KEY ?? "LIST";
const APIFY_BASE = "https://api.apify.com/v2";

let _blStoreId: string | null = null;

export async function getBlacklistStoreId(): Promise<string> {
  if (_blStoreId) return _blStoreId;

  const r = await fetch(
    `${APIFY_BASE}/key-value-stores?token=${APIFY_TOKEN}&limit=100`,
    { cache: "no-store" }
  );
  const data = await r.json();
  const match = (data.data?.items ?? []).find(
    (s: { name: string; id: string }) => s.name === BL_STORE_NAME
  );
  if (match) {
    _blStoreId = match.id as string;
    return _blStoreId!;
  }

  const cr = await fetch(
    `${APIFY_BASE}/key-value-stores?token=${APIFY_TOKEN}&name=${BL_STORE_NAME}`,
    { method: "POST" }
  );
  const cdata = await cr.json();
  _blStoreId = cdata.data.id as string;
  return _blStoreId!;
}

export async function readBlacklist(): Promise<string[]> {
  const storeId = await getBlacklistStoreId();
  const r = await fetch(
    `${APIFY_BASE}/key-value-stores/${storeId}/records/${BL_KEY}?token=${APIFY_TOKEN}`,
    { cache: "no-store" }
  );
  if (r.status === 404) return [];
  const data = await r.json();
  return Array.isArray(data?.domains) ? (data.domains as string[]) : [];
}

export async function writeBlacklist(domains: string[]): Promise<void> {
  const storeId = await getBlacklistStoreId();
  await fetch(
    `${APIFY_BASE}/key-value-stores/${storeId}/records/${BL_KEY}?token=${APIFY_TOKEN}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domains }),
    }
  );
}
