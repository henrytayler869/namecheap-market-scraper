"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Play,
  Download,
  Ban,
  ChevronDown,
  Plus,
  Trash2,
  X,
  ArrowUpDown,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PassDomain {
  domain: string;
  tld: string;
  price: number;
  priceText?: string;
  domainAge: number;
  snapshotCount: number;
  firstYear: number;
  buyUrl: string;
}

interface RejectedDomain {
  domain: string;
  domainAge: number;
  snapshotCount: number;
  rejectReasons: string[];
}

interface ToastItem {
  id: number;
  message: string;
  isError: boolean;
}

type SortDir = 1 | -1;

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TLDS = `de.com
uk.net
gb.net
us.com
eu.com
mex.com
ru.com
co.com
us.org`;

const TERMINAL_STATUSES = ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"];
const STATUS_ICON: Record<string, string> = {
  RUNNING: "🔄",
  SUCCEEDED: "✅",
  FAILED: "❌",
  ABORTED: "⛔",
  "TIMED-OUT": "⏱",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function PipelinePage() {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(200);
  const [maxResults, setMaxResults] = useState(0);
  const [minAgeYears, setMinAgeYears] = useState(2);
  const [minSnapshots, setMinSnapshots] = useState(3);
  const [sleepMs, setSleepMs] = useState(1000);
  const [excludeBetting, setExcludeBetting] = useState(true);
  const [excludeAdult, setExcludeAdult] = useState(true);
  const [tldsText, setTldsText] = useState(DEFAULT_TLDS);

  // ── Run state ───────────────────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Results state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"pass" | "fail">("pass");
  const [tableData, setTableData] = useState<PassDomain[]>([]);
  const [rejectedData, setRejectedData] = useState<RejectedDomain[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(
    new Set()
  );
  const [hasResults, setHasResults] = useState(false);

  // ── Sort state ───────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<keyof PassDomain>("domainAge");
  const [sortDir, setSortDir] = useState<SortDir>(-1);
  const [sortKeyR, setSortKeyR] = useState<keyof RejectedDomain>("domainAge");
  const [sortDirR, setSortDirR] = useState<SortDir>(-1);

  // ── Blacklist state ──────────────────────────────────────────────────────────
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [manualInput, setManualInput] = useState("");

  // ── Toast state ──────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  }, []);

  const showToast = useCallback((message: string, isError = false) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500
    );
  }, []);

  // ─── localStorage TLDs ────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem("pipeline_tlds");
    if (saved) setTldsText(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("pipeline_tlds", tldsText);
  }, [tldsText]);

  // ─── Scroll log to bottom ────────────────────────────────────────────────────

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // ─── Blacklist ────────────────────────────────────────────────────────────────

  const loadBlacklist = useCallback(async () => {
    try {
      const res = await fetch("/api/blacklist");
      const data = await res.json();
      setBlacklist(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  const addToBlacklist = useCallback(
    async (domains: string[]) => {
      if (!domains.length) return;
      try {
        const res = await fetch("/api/blacklist/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await loadBlacklist();
        showToast(`✅ Đã thêm ${data.added} domain vào blacklist`);
        // Remove from pass table
        setTableData((prev) =>
          prev.filter((d) => !domains.includes(d.domain))
        );
        setSelectedDomains(new Set());
        if (!blacklistOpen) setBlacklistOpen(true);
        return data;
      } catch (err) {
        showToast(
          `❌ Lỗi: ${err instanceof Error ? err.message : "Unknown"}`,
          true
        );
      }
    },
    [loadBlacklist, showToast, blacklistOpen]
  );

  const removeFromBlacklist = useCallback(
    async (domain: string) => {
      try {
        await fetch(`/api/blacklist/${encodeURIComponent(domain)}`, {
          method: "DELETE",
        });
        await loadBlacklist();
      } catch (err) {
        showToast(
          `❌ Lỗi: ${err instanceof Error ? err.message : "Unknown"}`,
          true
        );
      }
    },
    [loadBlacklist, showToast]
  );

  const clearBlacklist = useCallback(async () => {
    if (!blacklist.length) return;
    if (!confirm(`Xóa toàn bộ ${blacklist.length} domain khỏi blacklist?`))
      return;
    try {
      await fetch("/api/blacklist", { method: "DELETE" });
      await loadBlacklist();
      showToast("🗑️ Đã xóa toàn bộ blacklist");
    } catch (err) {
      showToast(
        `❌ Lỗi: ${err instanceof Error ? err.message : "Unknown"}`,
        true
      );
    }
  }, [blacklist.length, loadBlacklist, showToast]);

  // ─── Pipeline ─────────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const loadResults = useCallback(
    async (rid: string) => {
      addLog("📥 Đang tải kết quả...");
      const [passRes, failRes] = await Promise.all([
        fetch(`/api/pipeline/${rid}/results`).then((r) => r.json()),
        fetch(`/api/pipeline/${rid}/rejected`).then((r) => r.json()),
      ]);
      const pass: PassDomain[] = Array.isArray(passRes) ? passRes : [];
      const fail: RejectedDomain[] = Array.isArray(failRes) ? failRes : [];
      setTableData(pass);
      setRejectedData(fail);
      setHasResults(true);
      setActiveTab("pass");
      setSelectedDomains(new Set());
      addLog(`🎉 Xong! ${pass.length} đạt — ${fail.length} không đạt.`);
      setStatusText(`Hoàn tất — ${pass.length} đạt / ${fail.length} không đạt`);
    },
    [addLog]
  );

  const startPolling = useCallback(
    (rid: string) => {
      let prevStatus = "";
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/pipeline/${rid}/status`);
          const data = await res.json();
          const { status, stats } = data;

          if (status !== prevStatus) {
            prevStatus = status;
            addLog(
              `${STATUS_ICON[status] ?? "•"} Status: ${status}`
            );
            if (stats) {
              addLog(
                `   Requests: ${stats.requestsFinished ?? 0} xong / ${stats.requestsTotal ?? 0} tổng`
              );
            }
          }

          if (TERMINAL_STATUSES.includes(status)) {
            stopPolling();
            if (status === "SUCCEEDED") {
              await loadResults(rid);
            } else {
              addLog(`⚠️ Actor kết thúc: ${status}`);
              setStatusText(`Kết thúc với trạng thái: ${status}`);
            }
            setRunning(false);
          }
        } catch (err) {
          addLog(
            `⚠️ Poll error: ${err instanceof Error ? err.message : "Unknown"}`
          );
        }
      }, 3000);
    },
    [addLog, stopPolling, loadResults]
  );

  const startRun = useCallback(async () => {
    stopPolling();
    setRunning(true);
    setHasResults(false);
    setTableData([]);
    setRejectedData([]);
    setSelectedDomains(new Set());
    setLogs([]);
    setStatusText("Đang khởi động...");
    addLog("🚀 Gửi yêu cầu đến Apify...");

    const tlds = tldsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const input = {
      priceMin,
      priceMax,
      maxResults,
      minAgeYears,
      minSnapshots,
      sleepMs,
      excludeBetting,
      excludeAdult,
      batchSize: 50,
      tlds,
    };

    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");

      setRunId(data.runId);
      addLog(`✅ Run ID: ${data.runId}`);
      addLog("⏳ Đợi Actor chạy...");
      setStatusText(`Run: ${data.runId}`);
      startPolling(data.runId);
    } catch (err) {
      addLog(
        `❌ Lỗi: ${err instanceof Error ? err.message : "Unknown"}`
      );
      setStatusText("Lỗi khởi động");
      setRunning(false);
    }
  }, [
    stopPolling,
    addLog,
    tldsText,
    priceMin,
    priceMax,
    maxResults,
    minAgeYears,
    minSnapshots,
    sleepMs,
    excludeBetting,
    excludeAdult,
    startPolling,
  ]);

  // ─── Sort helpers ─────────────────────────────────────────────────────────────

  function handleSort(key: keyof PassDomain) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  function handleSortR(key: keyof RejectedDomain) {
    if (sortKeyR === key) setSortDirR((d) => (d === 1 ? -1 : 1));
    else {
      setSortKeyR(key);
      setSortDirR(-1);
    }
  }

  const sortedPass = [...tableData].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (typeof av === "number" && typeof bv === "number")
      return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });

  const sortedFail = [...rejectedData].sort((a, b) => {
    const av = a[sortKeyR] ?? "";
    const bv = b[sortKeyR] ?? "";
    if (typeof av === "number" && typeof bv === "number")
      return (av - bv) * sortDirR;
    return String(av).localeCompare(String(bv)) * sortDirR;
  });

  // ─── Selection ────────────────────────────────────────────────────────────────

  function toggleRow(domain: string) {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedDomains(checked ? new Set(tableData.map((d) => d.domain)) : new Set());
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const SortTh = ({
    label,
    col,
    onSort,
    currentKey,
  }: {
    label: string;
    col: string;
    onSort: () => void;
    currentKey: string;
  }) => (
    <th
      onClick={onSort}
      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={cn(
            "h-3 w-3",
            currentKey === col ? "text-primary" : "opacity-30"
          )}
        />
      </span>
    </th>
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Trend Domain — Pipeline
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chạy Apify pipeline: Namecheap Market → Wayback Machine → Filter.
          {statusText && (
            <span className="ml-2 font-medium text-foreground">
              {statusText}
            </span>
          )}
        </p>
      </div>

      {/* Config card */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
          Cấu hình
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <NumberField
            label="Giá tối thiểu ($)"
            value={priceMin}
            onChange={setPriceMin}
            min={0}
          />
          <NumberField
            label="Giá tối đa ($)"
            value={priceMax}
            onChange={setPriceMax}
            min={1}
          />
          <NumberField
            label={
              <>
                Số domain tối đa{" "}
                <span className="text-muted-foreground font-normal">(0=all)</span>
              </>
            }
            value={maxResults}
            onChange={setMaxResults}
            min={0}
          />
          <NumberField
            label="Tuổi tối thiểu (năm)"
            value={minAgeYears}
            onChange={setMinAgeYears}
            min={1}
          />
          <NumberField
            label="Snapshot tối thiểu"
            value={minSnapshots}
            onChange={setMinSnapshots}
            min={1}
          />
          <NumberField
            label="Delay (ms)"
            value={sleepMs}
            onChange={setSleepMs}
            min={0}
          />
        </div>

        {/* Content filters */}
        <div className="flex flex-wrap gap-5 mb-4">
          <CheckField
            label={
              <>
                🎲 Loại domain{" "}
                <span className="text-destructive font-semibold">Betting</span>
              </>
            }
            checked={excludeBetting}
            onChange={setExcludeBetting}
          />
          <CheckField
            label={
              <>
                🔞 Loại domain{" "}
                <span className="text-destructive font-semibold">Adult</span>
              </>
            }
            checked={excludeAdult}
            onChange={setExcludeAdult}
          />
        </div>

        {/* TLDs */}
        <div className="mb-5">
          <label className="block text-sm font-medium mb-1">
            TLDs{" "}
            <span className="text-muted-foreground font-normal">
              (mỗi dòng một TLD)
            </span>
          </label>
          <textarea
            value={tldsText}
            onChange={(e) => setTldsText(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
        </div>

        {/* Run button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={startRun}
            disabled={running}
            className="gap-2"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running ? "Đang chạy..." : "Chạy Pipeline"}
          </Button>
          {statusText && !running && (
            <span className="text-sm text-muted-foreground">{statusText}</span>
          )}
        </div>
      </div>

      {/* Progress log */}
      {logs.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            {running ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            <h2 className="text-sm font-semibold">Tiến trình</h2>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs space-y-0.5">
            {logs.map((line, i) => (
              <div key={i} className="text-muted-foreground">
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-3">
          {/* Tab bar + actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <TabBtn
                active={activeTab === "pass"}
                onClick={() => setActiveTab("pass")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Đạt điều kiện
                <CountBadge count={tableData.length} variant="blue" />
              </TabBtn>
              <TabBtn
                active={activeTab === "fail"}
                onClick={() => setActiveTab("fail")}
              >
                <XCircle className="h-3.5 w-3.5 text-red-400" />
                Không đạt
                <CountBadge count={rejectedData.length} variant="red" />
              </TabBtn>
            </div>

            <div className="flex items-center gap-2">
              {selectedDomains.size > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                  onClick={() =>
                    addToBlacklist([...selectedDomains])
                  }
                >
                  <Ban className="h-3.5 w-3.5" />
                  Blacklist ({selectedDomains.size})
                </Button>
              )}
              {activeTab === "pass" && runId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    (window.location.href = `/api/pipeline/${runId}/csv`)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  Tải CSV
                </Button>
              )}
            </div>
          </div>

          {/* Pass table */}
          {activeTab === "pass" && (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                          checked={
                            tableData.length > 0 &&
                            selectedDomains.size === tableData.length
                          }
                          ref={(el) => {
                            if (el)
                              el.indeterminate =
                                selectedDomains.size > 0 &&
                                selectedDomains.size < tableData.length;
                          }}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                        />
                      </th>
                      <SortTh
                        label="Domain"
                        col="domain"
                        onSort={() => handleSort("domain")}
                        currentKey={sortKey}
                      />
                      <SortTh
                        label="TLD"
                        col="tld"
                        onSort={() => handleSort("tld")}
                        currentKey={sortKey}
                      />
                      <SortTh
                        label="Giá"
                        col="price"
                        onSort={() => handleSort("price")}
                        currentKey={sortKey}
                      />
                      <SortTh
                        label="Tuổi"
                        col="domainAge"
                        onSort={() => handleSort("domainAge")}
                        currentKey={sortKey}
                      />
                      <SortTh
                        label="Snapshots"
                        col="snapshotCount"
                        onSort={() => handleSort("snapshotCount")}
                        currentKey={sortKey}
                      />
                      <SortTh
                        label="Năm đầu"
                        col="firstYear"
                        onSort={() => handleSort("firstYear")}
                        currentKey={sortKey}
                      />
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Mua
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPass.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-12 text-muted-foreground text-sm"
                        >
                          Không có domain nào đạt điều kiện
                        </td>
                      </tr>
                    ) : (
                      sortedPass.map((item) => {
                        const selected = selectedDomains.has(item.domain);
                        return (
                          <tr
                            key={item.domain}
                            className={cn(
                              "border-b border-border/50 transition-colors hover:bg-muted/30",
                              selected && "bg-orange-50 dark:bg-orange-950/30"
                            )}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRow(item.domain)}
                                className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {item.domain}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className="text-xs font-mono"
                              >
                                .{item.tld}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">
                              {item.price != null
                                ? `$${Number(item.price).toFixed(2)}`
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    (item.domainAge ?? 0) >= 5
                                      ? "bg-green-500"
                                      : "bg-yellow-400"
                                  )}
                                />
                                {item.domainAge ?? "—"} năm
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {(item.snapshotCount ?? 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {item.firstYear ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.buyUrl ? (
                                <a
                                  href={item.buyUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                  Mua
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fail table */}
          {activeTab === "fail" && (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDomains(
                                new Set(rejectedData.map((d) => d.domain))
                              );
                            } else {
                              setSelectedDomains(new Set());
                            }
                          }}
                        />
                      </th>
                      <SortTh
                        label="Domain"
                        col="domain"
                        onSort={() => handleSortR("domain")}
                        currentKey={sortKeyR}
                      />
                      <SortTh
                        label="Tuổi"
                        col="domainAge"
                        onSort={() => handleSortR("domainAge")}
                        currentKey={sortKeyR}
                      />
                      <SortTh
                        label="Snapshots"
                        col="snapshotCount"
                        onSort={() => handleSortR("snapshotCount")}
                        currentKey={sortKeyR}
                      />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Lý do không đạt
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFail.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-12 text-muted-foreground text-sm"
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      sortedFail.map((item) => {
                        const selected = selectedDomains.has(item.domain);
                        return (
                          <tr
                            key={item.domain}
                            className={cn(
                              "border-b border-border/50 transition-colors hover:bg-muted/30",
                              selected && "bg-orange-50 dark:bg-orange-950/30"
                            )}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRow(item.domain)}
                                className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {item.domain}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {item.domainAge ?? "—"} năm
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {(item.snapshotCount ?? 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {(item.rejectReasons ?? []).map((r, i) => (
                                  <span
                                    key={i}
                                    className="inline-block bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Blacklist panel */}
      <div className="rounded-xl border bg-card shadow-sm">
        <button
          onClick={() => setBlacklistOpen((o) => !o)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              Blacklist
            </h2>
            <span className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {blacklist.length}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              blacklistOpen && "rotate-180"
            )}
          />
        </button>

        {blacklistOpen && (
          <div className="border-t px-6 pb-6">
            <div className="flex items-center justify-between pt-4 pb-3">
              <p className="text-xs text-muted-foreground">
                Domain trong blacklist sẽ bị bỏ qua ở lần chạy tiếp theo.
              </p>
              <button
                onClick={clearBlacklist}
                className="flex items-center gap-1 text-xs text-destructive hover:opacity-80 font-medium transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa tất cả
              </button>
            </div>

            {/* Manual input */}
            <div className="flex gap-2 mb-4">
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                rows={2}
                placeholder={"Nhập domain thủ công, mỗi dòng một domain\nvd: example.us.com"}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                variant="outline"
                className="self-stretch border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 gap-1.5"
                onClick={async () => {
                  const domains = manualInput
                    .split("\n")
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean);
                  await addToBlacklist(domains);
                  setManualInput("");
                }}
              >
                <Plus className="h-4 w-4" />
                Thêm
              </Button>
            </div>

            {/* List */}
            {blacklist.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                Blacklist trống — chưa có domain nào bị chặn
              </p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {[...blacklist].sort().map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/40 group"
                  >
                    <span className="text-sm font-mono">{domain}</span>
                    <button
                      onClick={() => removeFromBlacklist(domain)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-destructive hover:opacity-80 font-medium transition"
                    >
                      <X className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white pointer-events-auto animate-in slide-in-from-bottom-2",
              t.isError ? "bg-destructive" : "bg-gray-800 dark:bg-gray-700"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <Input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-sm"
      />
    </div>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-primary cursor-pointer"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-semibold transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function CountBadge({
  count,
  variant,
}: {
  count: number;
  variant: "blue" | "red";
}) {
  return (
    <span
      className={cn(
        "ml-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full",
        variant === "blue"
          ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
          : "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"
      )}
    >
      {count}
    </span>
  );
}
