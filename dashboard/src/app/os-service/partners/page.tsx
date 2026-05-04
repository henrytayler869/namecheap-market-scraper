"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  X,
  ExternalLink,
  Edit2,
  Save as SaveIcon,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Partner } from "@/lib/os-partners-db";

interface ToastItem { id: number; message: string; isError: boolean }

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pName, setPName] = useState("");
  const [pDiscount, setPDiscount] = useState("");
  const [pLink, setPLink] = useState("");
  const [pNotes, setPNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback((msg: string, isError = false) => {
    const id = ++toastIdRef.current;
    setToasts((p) => [...p, { id, message: msg, isError }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/os-partners");
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => partners.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase())),
    [partners, search]
  );

  const openCreateForm = () => {
    setEditingId(null);
    setPName(""); setPDiscount(""); setPLink(""); setPNotes("");
    setFormOpen(true);
  };

  const openEditForm = (p: Partner) => {
    setEditingId(p.id);
    setPName(p.name);
    setPDiscount(String(p.discountPercent));
    setPLink(p.quotationLink ?? "");
    setPNotes(p.notes ?? "");
    setFormOpen(true);
  };

  const save = useCallback(async () => {
    const discount = parseFloat(pDiscount);
    if (!pName.trim() || isNaN(discount)) {
      showToast("❌ Cần nhập tên và % chiết khấu", true);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: pName.trim(),
        discountPercent: discount,
        quotationLink: pLink.trim() || null,
        notes: pNotes.trim() || null,
      };
      if (editingId) {
        const res = await fetch(`/api/os-partners/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Lỗi");
        setPartners((prev) => prev.map((p) => p.id === editingId ? { ...p, ...payload } : p));
        showToast("✅ Đã cập nhật");
      } else {
        const res = await fetch("/api/os-partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Lỗi");
        setPartners((prev) => [...prev, data.entry].sort((a, b) => a.name.localeCompare(b.name)));
        showToast(`✅ Đã thêm ${pName}`);
      }
      setFormOpen(false);
      setEditingId(null);
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : "Lỗi"}`, true);
    } finally {
      setSaving(false);
    }
  }, [pName, pDiscount, pLink, pNotes, editingId, showToast]);

  const remove = useCallback(async (p: Partner) => {
    if (!confirm(`Xóa đối tác "${p.name}"?\n\nLưu ý: nếu đã có đơn hàng dùng đối tác này, không xóa được.`)) return;
    try {
      const res = await fetch(`/api/os-partners/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi");
      setPartners((prev) => prev.filter((x) => x.id !== p.id));
      showToast(`🗑️ Đã xóa ${p.name}`);
    } catch (err) {
      showToast(`❌ ${err instanceof Error ? err.message : "Lỗi"}`, true);
    }
  }, [showToast]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Danh sách đối tác</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Đối tác cung cấp dịch vụ với mức chiết khấu cho từng gói.
          </p>
        </div>
        <Button onClick={openCreateForm} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm đối tác
        </Button>
      </div>

      {/* Form */}
      {formOpen && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {editingId ? "Sửa đối tác" : "Thêm đối tác"}
            </h3>
            <button onClick={() => { setFormOpen(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Tên đối tác *</label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="vd: Acme Corp" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Chiết khấu (%) *</label>
              <Input type="number" step="0.01" value={pDiscount} onChange={(e) => setPDiscount(e.target.value)} placeholder="vd: 30" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Link báo giá</label>
            <Input value={pLink} onChange={(e) => setPLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Ghi chú</label>
            <Input value={pNotes} onChange={(e) => setPNotes(e.target.value)} placeholder="optional" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
              {saving ? "Đang lưu..." : (editingId ? "Cập nhật" : "Lưu")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setFormOpen(false); setEditingId(null); }}>Hủy</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Tìm đối tác..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-center py-12 text-muted-foreground text-sm">Đang tải...</p>
        ) : partners.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
            <Users className="h-8 w-8 opacity-40" />
            <p className="text-sm">Chưa có đối tác — click <strong>Thêm đối tác</strong> để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Tên</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Chiết khấu</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Link báo giá</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Ghi chú</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 group">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center font-bold text-emerald-600 dark:text-emerald-400">
                        {p.discountPercent}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.quotationLink ? (
                        <a
                          href={p.quotationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[280px]"
                        >
                          {p.quotationLink.replace(/^https?:\/\//, "").slice(0, 40)}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground italic max-w-[300px] truncate" title={p.notes ?? ""}>
                      {p.notes || <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => openEditForm(p)} className="text-muted-foreground hover:text-primary" title="Sửa">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => remove(p)} className="text-destructive hover:opacity-80" title="Xóa">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white pointer-events-auto",
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
