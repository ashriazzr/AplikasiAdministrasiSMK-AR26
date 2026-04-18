import { useEffect, useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { StudentName } from "./ui/student-name";
import {
  Download, Search, Calendar, FileSpreadsheet,
  Edit2, Trash2, AlertCircle, ChevronLeft, ChevronRight,
  TrendingUp, X, RotateCcw, Receipt
} from "lucide-react";
import { db } from "../../../utils/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

/* ─── Types ─────────────────────────────────────────────────── */
interface Pembayaran {
  id: string;
  siswa_id: string;
  tagihan_id: string;
  kegiatan_id: string;
  jumlah: number;
  tanggal_pembayaran: string;
  bukti_pembayaran?: string;
  metode_pembayaran?: string;
  siswa_nama?: string;
  siswa_nis?: string;
  siswa_status?: "aktif" | "pindahan" | "keluar";
  kelas_id?: string;
  nama_kegiatan?: string;
  created_at: string;
}

interface Kelas { id: string; nama_kelas: string }

interface RiwayatRow {
  id: string;
  tanggal: string;
  nama_siswa: string;
  status_siswa?: "aktif" | "pindahan" | "keluar";
  nis: string;
  kelas: string;
  nama_kegiatan: string;
  jumlah_bayar: number;
  keterangan: string;
  metode: string;
}

/* ─── Constants ──────────────────────────────────────────────── */
const PAGE_SIZE = 20;

/* ─── Helpers ────────────────────────────────────────────────── */
const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const formatDate = (ds: string) =>
  new Date(ds).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });

const formatDateLong = (ds: string) =>
  new Date(ds).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const metodeLabel: Record<string, string> = {
  transfer: "Transfer",
  tunai: "Tunai",
  qris: "QRIS",
  lainnya: "Lainnya",
};

const metodeBadgeColor: Record<string, string> = {
  transfer: "bg-blue-100 text-blue-700",
  tunai: "bg-emerald-100 text-emerald-700",
  qris: "bg-violet-100 text-violet-700",
  lainnya: "bg-slate-100 text-slate-600",
};

/* ─── Paginator Component ─────────────────────────────────────── */
function Paginator({
  page, total, count, pageSize, setPage
}: { page: number; total: number; count: number; pageSize: number; setPage: (p: number) => void }) {
  if (total <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, count);

  // Show up to 5 page buttons
  const pages: (number | "…")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i);
    if (page < total - 2) pages.push("…");
    pages.push(total);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs text-slate-500">
        Menampilkan <span className="font-semibold text-slate-700">{from}–{to}</span> dari{" "}
        <span className="font-semibold text-slate-700">{count}</span> transaksi
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p as number)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                p === page
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => setPage(Math.min(total, page + 1))}
          disabled={page === total}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function RiwayatPembayaran() {
  const [pembayaran,       setPembayaran]       = useState<Pembayaran[]>([]);
  const [kelas,            setKelas]            = useState<Kelas[]>([]);
  const [riwayat,          setRiwayat]          = useState<RiwayatRow[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [page,             setPage]             = useState(1);

  /* filters */
  const [searchQuery,          setSearchQuery]          = useState("");
  const [filterKelas,          setFilterKelas]          = useState("");
  const [filterTanggalMulai,   setFilterTanggalMulai]   = useState("");
  const [filterTanggalAkhir,   setFilterTanggalAkhir]   = useState("");

  /* edit dialog */
  const [editDialogOpen,      setEditDialogOpen]      = useState(false);
  const [selectedPembayaran,  setSelectedPembayaran]  = useState<Pembayaran | null>(null);
  const [editJumlah,          setEditJumlah]          = useState("");
  const [editTanggal,         setEditTanggal]         = useState("");
  const [editKeterangan,      setEditKeterangan]      = useState("");
  const [isUpdating,          setIsUpdating]          = useState(false);

  /* delete dialog */
  const [deleteDialogOpen,   setDeleteDialogOpen]   = useState(false);
  const [deletingPembayaran, setDeletingPembayaran] = useState<Pembayaran | null>(null);
  const [isDeleting,         setIsDeleting]         = useState(false);

  /* ── Effects ─────────────────────────────────────────────── */
  useEffect(() => { fetchAllData(); }, []);

  useEffect(() => {
    if (pembayaran.length >= 0) buildRiwayat();
  }, [pembayaran, kelas]);

  /* ── Derived filtered list ───────────────────────────────── */
  const filteredRiwayat = useMemo(() => {
    let list = [...riwayat];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        r.nama_siswa.toLowerCase().includes(q) ||
        r.nis.toLowerCase().includes(q) ||
        r.nama_kegiatan.toLowerCase().includes(q) ||
        r.kelas.toLowerCase().includes(q)
      );
    }
    if (filterKelas)        list = list.filter((r) => r.kelas === filterKelas);
    if (filterTanggalMulai) list = list.filter((r) => new Date(r.tanggal) >= new Date(filterTanggalMulai));
    if (filterTanggalAkhir) list = list.filter((r) => new Date(r.tanggal) <= new Date(filterTanggalAkhir));
    return list;
  }, [riwayat, searchQuery, filterKelas, filterTanggalMulai, filterTanggalAkhir]);

  /* pagination slice */
  const totalPages  = Math.max(1, Math.ceil(filteredRiwayat.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice   = filteredRiwayat.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resetPage   = () => setPage(1);

  const totalPembayaran = filteredRiwayat.reduce((s, r) => s + r.jumlah_bayar, 0);
  const uniqueKelas     = [...new Set(riwayat.map((r) => r.kelas).filter(Boolean))].sort();
  const hasFilter       = !!(searchQuery || filterKelas || filterTanggalMulai || filterTanggalAkhir);

  /* ── Data fetching ───────────────────────────────────────── */
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [pb, kl] = await Promise.all([db.getPembayaran(), db.getKelas()]);
      if (pb.error) { toast.error("❌ Gagal memuat pembayaran: " + pb.error.message); return; }
      if (kl.error) { toast.error("❌ Gagal memuat kelas: " + kl.error.message); return; }
      setPembayaran(pb.data || []);
      setKelas(kl.data || []);
    } catch (err) {
      toast.error("Error: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  const buildRiwayat = () => {
    const rows: RiwayatRow[] = pembayaran.map((p) => {
      const kelasData = kelas.find((k) => k.id === p.kelas_id);
      return {
        id: p.id,
        tanggal: p.tanggal_pembayaran,
        nama_siswa: p.siswa_nama || "-",
        status_siswa: p.siswa_status || "aktif",
        nis: p.siswa_nis || "-",
        kelas: kelasData?.nama_kelas || "-",
        nama_kegiatan: p.nama_kegiatan || "Pembayaran",
        jumlah_bayar: p.jumlah,
        keterangan: p.bukti_pembayaran || "",
        metode: p.metode_pembayaran || "lainnya",
      };
    });
    rows.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    setRiwayat(rows);
  };

  /* ── Edit ─────────────────────────────────────────────────── */
  const openEditDialog = (p: Pembayaran) => {
    setSelectedPembayaran(p);
    setEditJumlah(String(p.jumlah ?? ""));
    setEditTanggal(p.tanggal_pembayaran ? p.tanggal_pembayaran.split("T")[0] : "");
    setEditKeterangan(p.bukti_pembayaran ?? "");
    setEditDialogOpen(true);
  };

  const handleUpdatePembayaran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPembayaran) return;
    const jumlahNum = parseFloat(editJumlah);
    if (isNaN(jumlahNum) || jumlahNum <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
    setIsUpdating(true);
    try {
      const { error } = await db.updatePembayaran(selectedPembayaran.id, {
        jumlah: jumlahNum,
        tanggal_pembayaran: new Date(editTanggal).toISOString(),
        bukti_pembayaran: editKeterangan.trim(),
      });
      if (error) { toast.error(`❌ Gagal update: ${error.message}`); return; }
      await fetchAllData();
      toast.success("✅ Pembayaran diperbarui");
      setEditDialogOpen(false);
    } catch (err) {
      toast.error(`❌ ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  /* ── Delete ───────────────────────────────────────────────── */
  const openDeleteDialog = (p: Pembayaran) => { setDeletingPembayaran(p); setDeleteDialogOpen(true); };

  const handleDeletePembayaran = async () => {
    if (!deletingPembayaran) return;
    setIsDeleting(true);
    try {
      const { error } = await db.deletePembayaran(deletingPembayaran.id);
      if (error) { toast.error(`❌ Gagal hapus: ${error.message}`); return; }
      await fetchAllData();
      toast.success("✅ Pembayaran dihapus");
      setDeleteDialogOpen(false);
    } catch (err) {
      toast.error(`❌ ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── Export ───────────────────────────────────────────────── */
  const exportToExcel = () => {
    if (filteredRiwayat.length === 0) { toast.error("Tidak ada data untuk diekspor"); return; }
    const excelData = filteredRiwayat.map((r, i) => ({
      No: i + 1,
      Tanggal: formatDate(r.tanggal),
      NIS: r.nis,
      "Nama Siswa": r.nama_siswa,
      Kelas: r.kelas,
      Kegiatan: r.nama_kegiatan,
      "Jumlah Bayar": r.jumlah_bayar,
      Keterangan: r.keterangan,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Pembayaran");
    XLSX.writeFile(wb, `Riwayat_Pembayaran_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("✅ Diekspor ke Excel");
  };

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center space-y-3">
        <div className="mx-auto w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Memuat data...</p>
      </div>
    </div>
  );

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Riwayat Pembayaran</h1>
              <p className="text-xs text-slate-500">Data pembayaran siswa secara realtime</p>
            </div>
          </div>
          <button
            onClick={exportToExcel}
            disabled={filteredRiwayat.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 space-y-5">

        {/* ── Summary Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <FileSpreadsheet className="w-5 h-5 text-blue-600" />,
              bg: "bg-blue-50",
              label: "Total Transaksi",
              value: filteredRiwayat.length.toLocaleString("id-ID"),
              sub: `dari ${riwayat.length} total`,
            },
            {
              icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
              bg: "bg-emerald-50",
              label: "Total Pembayaran",
              value: formatRupiah(totalPembayaran),
              sub: hasFilter ? "sesuai filter" : "semua data",
              accent: "text-emerald-700",
            },
            {
              icon: <Calendar className="w-5 h-5 text-violet-600" />,
              bg: "bg-violet-50",
              label: "Transaksi Terakhir",
              value: riwayat.length > 0 ? formatDate(riwayat[0].tanggal) : "—",
              sub: riwayat.length > 0 ? riwayat[0].nama_siswa : "",
            },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className={`${card.bg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">{card.label}</p>
                <p className={`text-base font-bold truncate ${card.accent ?? "text-slate-800"}`}>{card.value}</p>
                {card.sub && <p className="text-xs text-slate-400 truncate">{card.sub}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-700">Filter Pencarian</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Nama / NIS / Kegiatan
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
                  placeholder="Ketik untuk mencari..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); resetPage(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Kelas */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kelas</label>
              <select
                value={filterKelas}
                onChange={(e) => { setFilterKelas(e.target.value); resetPage(); }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="">Semua Kelas</option>
                {uniqueKelas.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {/* Tanggal Mulai */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dari Tanggal</label>
              <input
                type="date"
                value={filterTanggalMulai}
                onChange={(e) => { setFilterTanggalMulai(e.target.value); resetPage(); }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Tanggal Akhir */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sampai Tanggal</label>
              <input
                type="date"
                value={filterTanggalAkhir}
                onChange={(e) => { setFilterTanggalAkhir(e.target.value); resetPage(); }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Active filter chips + reset */}
          {hasFilter && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  Cari: "{searchQuery}"
                  <button onClick={() => { setSearchQuery(""); resetPage(); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterKelas && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  Kelas: {filterKelas}
                  <button onClick={() => { setFilterKelas(""); resetPage(); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterTanggalMulai && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  Dari: {formatDate(filterTanggalMulai)}
                  <button onClick={() => { setFilterTanggalMulai(""); resetPage(); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filterTanggalAkhir && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  Sampai: {formatDate(filterTanggalAkhir)}
                  <button onClick={() => { setFilterTanggalAkhir(""); resetPage(); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button
                onClick={() => { setSearchQuery(""); setFilterKelas(""); setFilterTanggalMulai(""); setFilterTanggalAkhir(""); resetPage(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset Semua
              </button>
              <span className="ml-auto text-xs text-slate-400">
                {filteredRiwayat.length} dari {riwayat.length} transaksi
              </span>
            </div>
          )}
        </div>

        {/* ── Table Card ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Daftar Riwayat Pembayaran
            </h2>
            {filteredRiwayat.length > 0 && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                {filteredRiwayat.length} transaksi
              </span>
            )}
          </div>

          {filteredRiwayat.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["No", "Tanggal", "NIS", "Nama Siswa", "Kelas", "Kegiatan", "Metode", "Jumlah Bayar", "Keterangan", "Aksi"].map((h, i) => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${
                            i === 7 ? "text-right" : i === 9 ? "text-center" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pageSlice.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {(currentPage - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{formatDate(r.tanggal)}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.nis}</td>
                        <td className="px-4 py-3">
                          <StudentName name={r.nama_siswa} status={r.status_siswa} className="font-semibold text-slate-800" />
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium whitespace-nowrap">
                            {r.kelas}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-[160px]">
                          <span className="line-clamp-1">{r.nama_kegiatan}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${metodeBadgeColor[r.metode] ?? metodeBadgeColor.lainnya}`}>
                            {metodeLabel[r.metode] ?? r.metode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                          {formatRupiah(r.jumlah_bayar)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px]">
                          <span className="line-clamp-1 italic">{r.keterangan || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditDialog(pembayaran.find((p) => p.id === r.id) as Pembayaran)}
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(pembayaran.find((p) => p.id === r.id) as Pembayaran)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={7} className="px-4 py-3 text-right text-xs font-bold text-slate-600">
                        Total {hasFilter ? "(difilter)" : "Keseluruhan"}:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">
                        {formatRupiah(totalPembayaran)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination */}
              <Paginator
                page={currentPage}
                total={totalPages}
                count={filteredRiwayat.length}
                pageSize={PAGE_SIZE}
                setPage={setPage}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              {riwayat.length === 0 ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <FileSpreadsheet className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="font-semibold text-slate-600 mb-1">Belum ada riwayat pembayaran</p>
                  <p className="text-sm">Data pembayaran akan muncul di sini</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="font-semibold text-slate-600 mb-1">Tidak ada data sesuai filter</p>
                  <p className="text-sm mb-4">Coba ubah atau reset kriteria pencarian</p>
                  <button
                    onClick={() => { setSearchQuery(""); setFilterKelas(""); setFilterTanggalMulai(""); setFilterTanggalAkhir(""); resetPage(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Filter
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Dialog ────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[92vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-base font-bold text-slate-900">Edit Pembayaran</DialogTitle>
            <DialogDescription className="text-sm text-blue-600 font-semibold">
              {selectedPembayaran?.siswa_nama || ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePembayaran} className="flex max-h-[92vh] flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tanggal Pembayaran</Label>
              <Input
                type="date" value={editTanggal}
                onChange={(e) => setEditTanggal(e.target.value)} required
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Jumlah Bayar (Rp)</Label>
              <Input
                type="number" value={editJumlah}
                onChange={(e) => setEditJumlah(e.target.value)} required min="0"
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Keterangan <span className="font-normal text-slate-400 normal-case">(opsional)</span>
              </Label>
              <Input
                value={editKeterangan}
                onChange={(e) => setEditKeterangan(e.target.value)}
                placeholder="Catatan atau nomor referensi"
                className="rounded-xl border-slate-200"
              />
            </div>
            </div>
            <DialogFooter className="gap-2 px-6 py-4 border-t bg-white mt-auto">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">
                Batal
              </Button>
              <Button type="submit" disabled={isUpdating} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ──────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm max-h-[92vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-red-600 text-base">
              <AlertCircle className="w-5 h-5" /> Hapus Pembayaran?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {deletingPembayaran && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal</span>
                <span className="font-semibold text-slate-800">{formatDateLong(deletingPembayaran.tanggal_pembayaran)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah</span>
                <span className="font-bold text-red-600">{formatRupiah(deletingPembayaran.jumlah)}</span>
              </div>
              {deletingPembayaran.bukti_pembayaran && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Keterangan</span>
                  <span className="text-slate-700 text-right max-w-[180px] truncate">{deletingPembayaran.bukti_pembayaran}</span>
                </div>
              )}
            </div>
          )}
          </div>
          <DialogFooter className="gap-2 px-6 py-4 border-t bg-white mt-auto">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Batal</Button>
            <Button
              onClick={handleDeletePembayaran}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}