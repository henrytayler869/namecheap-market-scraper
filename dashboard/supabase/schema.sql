-- ─── Domain Picker DB ────────────────────────────────────────────────────────
create table if not exists picker_domains (
  domain        text primary key,
  source        text,
  tf            int  default 0,
  cf            int  default 0,
  bl            int  default 0,
  rd            int  default 0,
  da            int  default 0,
  pa            int  default 0,
  age           int  default 0,
  sz_score      int  default 0,
  sz_drops      int  default 0,
  sem_traffic   bigint default 0,
  sem_keywords  int  default 0,
  price         text,
  expires       text,
  score         double precision default 0,
  added_at      timestamptz default now()
);

create index if not exists picker_domains_score_idx
  on picker_domains (score desc);

-- ─── Backlink DB (cho Aged Domain) ───────────────────────────────────────────
create table if not exists backlink_db (
  domain text primary key,
  dr     int  not null default 0
);

create index if not exists backlink_db_dr_idx
  on backlink_db (dr desc);

-- ─── Ahrefs Result DB (kết quả check Ahrefs từ Aged Domain) ─────────────────
create table if not exists ahrefs_results (
  target_domain text not null,
  ref_domain    text not null,
  domain_rating int  not null default 0,
  checked_at    timestamptz default now(),
  primary key (target_domain, ref_domain)
);

create index if not exists ahrefs_results_target_idx
  on ahrefs_results (target_domain);

create index if not exists ahrefs_results_dr_idx
  on ahrefs_results (domain_rating desc);

-- ─── Ref Domain Blacklist (user-added entries) ──────────────────────────────
-- Default blacklist is hardcoded in src/lib/picker-csv.ts (REF_BLACKLIST).
-- This table only stores domains the user adds at runtime via the dashboard UI.
create table if not exists ref_blacklist (
  domain   text primary key,
  note     text,
  added_at timestamptz default now()
);

create index if not exists ref_blacklist_added_idx
  on ref_blacklist (added_at desc);

-- ─── Target Assessment (rating + category + detail per target) ──────────────
create table if not exists target_assessment (
  target_domain text primary key,
  rating        text,
  category      text,
  detail        text,
  updated_at    timestamptz default now()
);

create index if not exists target_assessment_rating_idx
  on target_assessment (rating);

-- ─── Domain Inventory (kho domain đã mua) ────────────────────────────────────
create table if not exists domain_inventory (
  domain          text primary key,
  purchase_price  numeric(10, 2),
  purchased_at    timestamptz default now(),
  notes           text,
  source          text,
  rating          text,
  category        text,
  updated_at      timestamptz default now()
);

create index if not exists domain_inventory_purchased_idx
  on domain_inventory (purchased_at desc);

-- Sell tracking (idempotent)
alter table domain_inventory add column if not exists sell_price numeric(10, 2);
alter table domain_inventory add column if not exists sold_at    timestamptz;
alter table domain_inventory add column if not exists expected_sell_price numeric(10, 2);
create index if not exists domain_inventory_sold_idx on domain_inventory (sold_at desc);

-- Seed default blacklist (idempotent — re-run safe)
insert into ref_blacklist (domain, note) values
  ('za.com',             'marketplace/parking'),
  ('blogspot.com',       'platform hosting'),
  ('wordpress.com',      'platform hosting'),
  ('weebly.com',         'platform hosting'),
  ('pages.dev',          'subdomain hosting'),
  ('squarespace.com',    'platform hosting'),
  ('amazonaws.com',      'subdomain hosting'),
  ('cloudfront.net',     'subdomain hosting'),
  ('azurewebsites.net',  'subdomain hosting'),
  ('netlify.app',        'subdomain hosting'),
  ('vercel.app',         'subdomain hosting'),
  ('sa.com',             'CentralNic marketplace'),
  ('eu.com',             'CentralNic marketplace'),
  ('us.com',             'CentralNic marketplace'),
  ('uk.com',             'CentralNic marketplace'),
  ('in.net',             'CentralNic marketplace'),
  ('google.com',         'PBN footprint: sites/docs/translate'),
  ('wixsite.com',        'free subdomain hosting'),
  ('hatena.ne.jp',       'JP blog platform — parasite SEO'),
  ('typepad.com',        'legacy blog hosting — abandoned/spam'),
  ('heylink.me',         'link-in-bio — strong PBN/gambling footprint')
on conflict (domain) do nothing;
