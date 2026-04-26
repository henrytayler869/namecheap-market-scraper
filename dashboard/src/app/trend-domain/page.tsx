"use client";

import { useState, useCallback } from "react";
import { Search, ExternalLink, RefreshCw, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Domain } from "@/app/api/domains/route";

const DEFAULT_TLDS = `de.com
uk.net
gb.net
us.com
eu.com
mex.com
ru.com
co.com
us.org`;

function parseTlds(raw: string): string[] {
  return raw
    .split(/[\n,;\s]+/)
    .map((t) => t.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
}

export default function TrendDomainPage() {
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(200);
  const [tldsText, setTldsText] = useState(DEFAULT_TLDS);
  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    const tlds = parseTlds(tldsText);
    try {
      const params = new URLSearchParams({
        priceMin: String(priceMin),
        priceMax: String(priceMax),
        tlds: tlds.join(","),
      });
      const res = await fetch(`/api/domains?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch");
      setDomains(data.domains);
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [priceMin, priceMax, tldsText]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Trend Domain — Marketplace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buy Now domains from Namecheap filtered by TLD &amp; price.
            {lastFetched && (
              <span className="ml-2">
                Last fetched: {lastFetched.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filter card */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
          Filters
        </h2>

        {/* Price range */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2">
            Price Range (USD)
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                type="number"
                min={0}
                value={priceMin}
                onChange={(e) => setPriceMin(Number(e.target.value))}
                className="pl-7"
                placeholder="0"
              />
            </div>
            <span className="text-muted-foreground">—</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                type="number"
                min={0}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="pl-7"
                placeholder="200"
              />
            </div>
          </div>
        </div>

        {/* TLD textarea */}
        <div>
          <label className="block text-sm font-medium mb-2">
            TLDs{" "}
            <span className="text-muted-foreground font-normal">
              (one per line, or comma-separated)
            </span>
          </label>
          <textarea
            value={tldsText}
            onChange={(e) => setTldsText(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            placeholder={"de.com\nuk.net\nus.com\n..."}
          />
        </div>

        {/* Search button */}
        <div className="mt-5 flex justify-end">
          <Button
            onClick={fetchDomains}
            disabled={loading || parseTlds(tldsText).length === 0}
            className="gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Loading…" : "Search Domains"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {(loading || domains !== null) && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {loading
                  ? "Loading…"
                  : `${domains?.length ?? 0} domain${(domains?.length ?? 0) !== 1 ? "s" : ""} found`}
              </span>
            </div>
            {!loading && domains && domains.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Sorted by price ↑
              </Badge>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Domain</TableHead>
                <TableHead>TLD</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-20 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                : domains?.map((d) => (
                    <TableRow key={d.domainName}>
                      <TableCell className="font-medium">
                        {d.domainName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          .{d.tld}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600 dark:text-green-400">
                        {d.priceText}
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={d.buyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ size: "sm", variant: "outline" }),
                            "gap-1.5"
                          )}
                        >
                          Buy
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && domains?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No domains found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty state */}
      {!loading && domains === null && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center gap-3">
          <Globe2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Set your filters and click{" "}
            <strong>Search Domains</strong> to find available domains.
          </p>
        </div>
      )}
    </div>
  );
}
