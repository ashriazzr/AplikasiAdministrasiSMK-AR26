import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Edit, Trash2, AlertCircle, Clock, FileText,
  Calendar, User, GraduationCap, Search,
  ChevronLeft, ChevronRight, CheckCircle2,
  Banknote, Receipt, AlertTriangle
} from "lucide-react";
import { db } from "../../../utils/supabase/client";
import { toast } from "sonner";

/* ─── Types ────────────────────────────────────────────────── */
interface Kelas       { id: string; nama_kelas: string }
interface Siswa       { id: string; nama: string; nis: string; kelas_id: string }
interface Tagihan     { id: string; kegiatan_id: string; nama_kegiatan: string; nominal: number; batas_pembayaran: string; total_dibayar: number; sisa_bayar: number; status: string }
interface Pembayaran  { id: string; tagihan_id: string; kegiatan_id: string; siswa_id: string; jumlah: number; tanggal_pembayaran: string; bukti_pembayaran?: string; metode_pembayaran?: string; dicatat_oleh?: string; siswa?: { id: string; nama: string; nis: string; kelas_id: string }; kegiatan?: { id: string; nama_kegiatan: string; nominal: number } }
interface SiswaTagihanSummary {
  siswa_id: string;
  nama: string;
  nis: string;
  jumlah_tagihan: number;
  jumlah_lunas: number;
  total_tagihan: number;
  total_terbayar: number;
  total_sisa: number;
  belum_lunas_items: Array<{ nama_kegiatan: string; sisa_bayar: number }>;
}

/* ─── Helpers ──────────────────────────────────────────────── */
const PAGE_SIZE = 20;

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const formatDate = (s: string) => {
  try { return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
};

/* ─── Pagination hook ──────────────────────────────────────── */
function usePaginate<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = Math.max(1, Math.ceil(items.length / pageSize));
  const slice = items.slice((page - 1) * pageSize, page * pageSize);
  const reset = () => setPage(1);
  return { page, total, slice, setPage, reset, count: items.length };
}

/* ─── Sub-components ───────────────────────────────────────── */
function Paginator({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
      <span className="text-xs text-slate-400">
        Hal <span className="font-semibold text-slate-600">{page}</span> / {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setPage(Math.min(total, page + 1))}
          disabled={page === total}
          className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ lunas }: { lunas: boolean }) {
  return lunas
    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" /> LUNAS
      </span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" /> BELUM LUNAS
      </span>;
}

/* ─── Main Component ────────────────────────────────────────── */
export default function Tagihan() {
  /* state */
  const [kelas,          setKelas]          = useState<Kelas[]>([]);
  const [siswaList,      setSiswaList]      = useState<Siswa[]>([]);
  const [tagihanList,    setTagihanList]    = useState<Tagihan[]>([]);
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [loading,        setLoading]        = useState(true);

  const [dialogOpen,        setDialogOpen]        = useState(false);
  const [editingPembayaran, setEditingPembayaran] = useState<Pembayaran | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId,    setDeleteTargetId]    = useState<string | null>(null);

  const [selectedKelas,   setSelectedKelas]   = useState("");
  const [selectedSiswa,   setSelectedSiswa]   = useState("");
  const [selectedKegiatan, setSelectedKegiatan] = useState("");
  const [searchSiswa,     setSearchSiswa]     = useState("");
  const [siswaSummary,    setSiswaSummary]    = useState<SiswaTagihanSummary[]>([]);
  const [summaryLoading,  setSummaryLoading]  = useState(false);

  const [jumlahBayar,      setJumlahBayar]      = useState("");
  const [keterangan,       setKeterangan]       = useState("");
  const [tanggalBayar,     setTanggalBayar]     = useState(new Date().toISOString().split("T")[0]);
  const [metodePembayaran, setMetodePembayaran] = useState("tunai");

  /* pagination */
  const tagihanPag    = usePaginate(tagihanList);
  const pembayaranPag = usePaginate(pembayaranList);

  /* effects */
  useEffect(() => { fetchKelas(); }, []);

  useEffect(() => {
    if (selectedKelas) {
      fetchSiswaByKelas(selectedKelas);
      fetchSiswaSummaryByKelas(selectedKelas);
      setSelectedSiswa("");
      setSearchSiswa("");
    } else {
      setSiswaList([]);
      setSiswaSummary([]);
      setTagihanList([]);
      setPembayaranList([]);
    }
  }, [selectedKelas]);

  useEffect(() => {
    if (selectedSiswa && selectedKelas) {
      fetchTagihan(selectedSiswa);
      fetchPembayaran(selectedSiswa);
      tagihanPag.reset();
      pembayaranPag.reset();
    }
  }, [selectedSiswa]);

  /* fetchers */
  const fetchKelas = async () => {
    try {
      const { data, error } = await db.getKelas();
      if (error) { toast.error("Gagal memuat kelas: " + error.message); return; }
      setKelas(data || []);
    } finally { setLoading(false); }
  };

  const fetchSiswaByKelas = async (kelasId: string) => {
    const { data } = await db.getSiswaWithKelas();
    setSiswaList((data || []).filter((s: any) => s.kelas_id === kelasId));
  };

  const fetchSiswaSummaryByKelas = async (kelasId: string) => {
    setSummaryLoading(true);
    try {
      const siswaRes = await db.getSiswaWithKelas();

      const siswaKelas = ((siswaRes.data || []) as any[]).filter((s) => s.kelas_id === kelasId);

      const summaryRows: SiswaTagihanSummary[] = await Promise.all(
        siswaKelas.map(async (siswa) => {
          const tagihanRes = await db.getTagihanBySiswaId(siswa.id);
          const tagihanSiswa = (tagihanRes.data || []) as Tagihan[];
          const belumLunasItems = tagihanSiswa
            .filter((t) => Number(t.sisa_bayar || 0) > 0)
            .map((t) => ({ nama_kegiatan: t.nama_kegiatan, sisa_bayar: Number(t.sisa_bayar || 0) }));

          return {
            siswa_id: siswa.id,
            nama: siswa.nama,
            nis: siswa.nis,
            jumlah_tagihan: tagihanSiswa.length,
            jumlah_lunas: tagihanSiswa.filter((t) => Number(t.sisa_bayar || 0) === 0).length,
            total_tagihan: tagihanSiswa.reduce((sum, t) => sum + Number(t.nominal || 0), 0),
            total_terbayar: tagihanSiswa.reduce((sum, t) => sum + Number(t.total_dibayar || 0), 0),
            total_sisa: tagihanSiswa.reduce((sum, t) => sum + Number(t.sisa_bayar || 0), 0),
            belum_lunas_items: belumLunasItems,
          };
        })
      );

      setSiswaSummary(summaryRows);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchTagihan = async (siswaId: string) => {
    const { data, error } = await db.getTagihanBySiswaId(siswaId);
    if (error) { console.error("Error tagihan:", error); return; }
    setTagihanList(data || []);
  };

  const fetchPembayaran = async (siswaId: string) => {
    const { data, error } = await db.getPembayaranBySiswaId(siswaId);
    if (error) { console.error("Error pembayaran:", error); return; }
    setPembayaranList(data || []);
  };

  /* dialog */
  const handleOpenDialog = (kegiatanId: string, sisaBayar: number, pembayaran?: Pembayaran) => {
    if (pembayaran) {
      setEditingPembayaran(pembayaran);
      setJumlahBayar(String(pembayaran.jumlah ?? ""));
      setKeterangan(pembayaran.bukti_pembayaran ?? "");
      setTanggalBayar(pembayaran.tanggal_pembayaran ? pembayaran.tanggal_pembayaran.split("T")[0] : new Date().toISOString().split("T")[0]);
      setMetodePembayaran(pembayaran.metode_pembayaran ?? "tunai");
    } else {
      setEditingPembayaran(null);
      setJumlahBayar(sisaBayar > 0 ? String(sisaBayar) : "");
      setKeterangan("");
      setTanggalBayar(new Date().toISOString().split("T")[0]);
      setMetodePembayaran("tunai");
    }
    setSelectedKegiatan(kegiatanId);
    setDialogOpen(true);
  };

  /* submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || !selectedKegiatan) { toast.error("Pilih siswa dan kegiatan terlebih dahulu"); return; }
    const tagihanForKegiatan = tagihanList.find((t) => t.kegiatan_id === selectedKegiatan);
    if (!tagihanForKegiatan) { toast.error("Tagihan tidak ditemukan untuk kegiatan ini"); return; }
    const jumlahNum = parseFloat(jumlahBayar);
    if (isNaN(jumlahNum) || jumlahNum <= 0) { toast.error("Jumlah bayar harus lebih dari 0"); return; }
    if (!editingPembayaran && jumlahNum > tagihanForKegiatan.sisa_bayar) {
      toast.error(`Melebihi sisa tagihan! Maks: ${formatRupiah(tagihanForKegiatan.sisa_bayar)}`); return;
    }
    const payload = {
      tagihan_id: tagihanForKegiatan.id,
      siswa_id: selectedSiswa,
      jumlah: jumlahNum,
      metode_pembayaran: metodePembayaran,
      tanggal_pembayaran: new Date(tanggalBayar).toISOString(),
      bukti_pembayaran: keterangan.trim(),
    };
    try {
      const { error } = editingPembayaran
        ? await db.updatePembayaran(editingPembayaran.id, payload)
        : await db.createPembayaran(payload);
      if (error) throw new Error(error.message);
      setDialogOpen(false);
      setEditingPembayaran(null);
      setJumlahBayar("");
      setKeterangan("");
      await Promise.all([fetchTagihan(selectedSiswa), fetchPembayaran(selectedSiswa)]);
      if (selectedKelas) await fetchSiswaSummaryByKelas(selectedKelas);
      toast.success(editingPembayaran ? "✅ Pembayaran diperbarui" : "✅ Pembayaran dicatat");
    } catch (error) {
      toast.error(`❌ ${error instanceof Error ? error.message : "Terjadi kesalahan"}`);
    }
  };

  /* delete */
  const handleDeletePembayaran = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await db.deletePembayaran(deleteTargetId);
      if (error) throw new Error(error.message);
      await Promise.all([fetchTagihan(selectedSiswa), fetchPembayaran(selectedSiswa)]);
      if (selectedKelas) await fetchSiswaSummaryByKelas(selectedKelas);
      toast.success("✅ Pembayaran dihapus");
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(`❌ ${error instanceof Error ? error.message : "Gagal menghapus"}`);
    }
  };

  /* derived */
  const filteredSiswa     = siswaList.filter((s) => {
    const q = searchSiswa.toLowerCase().trim();
    return !q || s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
  });
  const filteredSiswaSummary = siswaSummary.filter((s) => {
    const q = searchSiswa.toLowerCase().trim();
    return !q || s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
  });
  const selectedSiswaData = siswaList.find((s) => s.id === selectedSiswa);
  const totalTagihan      = tagihanList.reduce((sum, t) => sum + t.nominal,      0);
  const totalTerbayar     = tagihanList.reduce((sum, t) => sum + t.total_dibayar, 0);
  const totalSisa         = tagihanList.reduce((sum, t) => sum + t.sisa_bayar,   0);
  const pctGlobal         = totalTagihan > 0 ? Math.round((totalTerbayar / totalTagihan) * 100) : 0;

  /* loading */
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
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Top Header Bar ─────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Tagihan & Pembayaran</h1>
            <p className="text-xs text-slate-500">Kelola pembayaran siswa secara transparan</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 space-y-5">

        {/* ── Filter Card ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" /> Filter Kelas & Siswa
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Kelas */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Kelas
              </label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              >
                <option value="">Pilih Kelas...</option>
                {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
              </select>
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> Cari Siswa
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchSiswa}
                  onChange={(e) => setSearchSiswa(e.target.value)}
                  placeholder="Nama atau NIS siswa..."
                  disabled={!selectedKelas}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {selectedSiswa && (
            <div className="mt-3 p-3 rounded-xl border border-blue-100 bg-blue-50 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-blue-600">Siswa dipilih</p>
                <p className="text-sm font-semibold text-slate-800">{selectedSiswaData?.nama} ({selectedSiswaData?.nis})</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedSiswa("")}
                className="rounded-lg border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                Ganti Siswa
              </Button>
            </div>
          )}
        </div>

        {/* ── Tabel Siswa Per Kelas (muncul setelah pilih kelas) ───── */}
        {selectedKelas && !selectedSiswa && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Data Siswa dan Keterangan Tagihan</h2>
                <p className="text-xs text-slate-500 mt-0.5">Klik nama siswa untuk masuk ke administrasi tagihan siswa.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {filteredSiswaSummary.length} siswa
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Siswa</th>
                    <th className="px-4 py-3">Jumlah Tagihan</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Terbayar</th>
                    <th className="px-4 py-3">Sisa</th>
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Memuat ringkasan tagihan siswa...</td>
                    </tr>
                  ) : filteredSiswaSummary.length > 0 ? (
                    filteredSiswaSummary.map((row) => {
                      const lunas = row.total_sisa === 0 && row.jumlah_tagihan > 0;
                      return (
                        <tr key={row.siswa_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setSelectedSiswa(row.siswa_id)}
                              className="text-left"
                            >
                              <p className="font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2">{row.nama}</p>
                              <p className="text-xs text-slate-400">{row.nis}</p>
                            </button>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{row.jumlah_tagihan}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{formatRupiah(row.total_tagihan)}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">{formatRupiah(row.total_terbayar)}</td>
                          <td className="px-4 py-3 font-semibold text-amber-700">{formatRupiah(row.total_sisa)}</td>
                          <td className="px-4 py-3">
                            {lunas ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                Semua kegiatan lunas
                              </span>
                            ) : (
                              <details className="group">
                                <summary className="cursor-pointer list-none inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                  {`Lunas ${row.jumlah_lunas}/${row.jumlah_tagihan} • ${row.belum_lunas_items.length} belum lunas`}
                                </summary>
                                <div className="mt-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 space-y-1.5 min-w-[230px]">
                                  {row.belum_lunas_items.slice(0, 4).map((item, idx) => (
                                    <div key={`${item.nama_kegiatan}-${idx}`} className="flex items-start justify-between gap-2 text-xs">
                                      <span className="text-slate-700">{item.nama_kegiatan}</span>
                                      <span className="font-semibold text-amber-700 whitespace-nowrap">{formatRupiah(item.sisa_bayar)}</span>
                                    </div>
                                  ))}
                                  {row.belum_lunas_items.length > 4 && (
                                    <p className="text-[11px] text-slate-500">+{row.belum_lunas_items.length - 4} kegiatan lainnya</p>
                                  )}
                                </div>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Data siswa tidak ditemukan pada kelas ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Summary Strip (only when siswa selected) ──────── */}
        {selectedSiswa && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Student name bar */}
            <div className="px-5 py-3 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {selectedSiswaData?.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{selectedSiswaData?.nama}</p>
                  <p className="text-slate-400 text-xs">{selectedSiswaData?.nis}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs">Progress Pembayaran</p>
                <p className="text-white text-sm font-bold">{pctGlobal}%</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-slate-200">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${pctGlobal}%` }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {[
                { label: "Total Tagihan",  value: formatRupiah(totalTagihan),  color: "text-slate-700", bg: "bg-white"        },
                { label: "Terbayar",       value: formatRupiah(totalTerbayar), color: "text-emerald-700", bg: "bg-emerald-50" },
                { label: "Sisa Bayar",     value: formatRupiah(totalSisa),     color: totalSisa === 0 ? "text-emerald-700" : "text-amber-700", bg: totalSisa === 0 ? "bg-emerald-50" : "bg-amber-50" },
              ].map((stat) => (
                <div key={stat.label} className={`${stat.bg} px-4 py-3 text-center`}>
                  <p className="text-xs text-slate-500 mb-0.5">{stat.label}</p>
                  <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Content ────────────────────────────────────── */}
        {selectedSiswa ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ── Tagihan List (left, 3 cols) ─────────────────── */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h2 className="font-semibold text-slate-800 text-sm">Daftar Tagihan</h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                      {tagihanList.length}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1">
                  {tagihanPag.slice.length > 0 ? tagihanPag.slice.map((tagihan) => {
                    const pct       = tagihan.nominal > 0 ? (tagihan.total_dibayar / tagihan.nominal) * 100 : 0;
                    const isLunas   = tagihan.sisa_bayar === 0;

                    return (
                      <div
                        key={tagihan.kegiatan_id}
                        className={`rounded-xl border-2 p-4 transition-all ${
                          isLunas
                            ? "border-emerald-200 bg-emerald-50/40"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1 truncate">
                              {tagihan.nama_kegiatan}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              <span>Nominal: <span className="font-semibold text-slate-700">{formatRupiah(tagihan.nominal)}</span></span>
                            </div>
                          </div>
                          <StatusBadge lunas={isLunas} />
                        </div>

                        {/* Progress */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-500">Progres Pembayaran</span>
                            <span className="font-semibold text-slate-700">{Math.round(pct)}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isLunas ? "bg-emerald-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                          {[
                            { label: "Total",    value: tagihan.nominal,      color: "text-slate-700",  bg: "bg-slate-50"   },
                            { label: "Terbayar", value: tagihan.total_dibayar, color: "text-emerald-700", bg: "bg-emerald-50" },
                            { label: "Sisa",     value: tagihan.sisa_bayar,   color: isLunas ? "text-emerald-700" : "text-amber-700", bg: isLunas ? "bg-emerald-50" : "bg-amber-50" },
                          ].map((s) => (
                            <div key={s.label} className={`${s.bg} rounded-lg py-1.5`}>
                              <p className="text-[10px] text-slate-500 mb-0.5">{s.label}</p>
                              <p className={`text-xs font-bold ${s.color}`}>{formatRupiah(s.value)}</p>
                            </div>
                          ))}
                        </div>

                        {/* Action */}
                        {!isLunas && (
                          <button
                            onClick={() => handleOpenDialog(tagihan.kegiatan_id, tagihan.sisa_bayar)}
                            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Banknote className="w-3.5 h-3.5" /> Bayar Tagihan
                          </button>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="text-center py-16 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">Tidak ada tagihan</p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {tagihanList.length > PAGE_SIZE && (
                  <div className="px-4 pb-4">
                    <Paginator page={tagihanPag.page} total={tagihanPag.total} setPage={tagihanPag.setPage} />
                  </div>
                )}
              </div>
            </div>

            {/* ── Payment History (right, 2 cols) ─────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-semibold text-slate-800 text-sm">Riwayat Pembayaran</h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                    {pembayaranList.length}
                  </span>
                </div>

                <div className="p-4 space-y-2.5 flex-1">
                  {pembayaranPag.slice.length > 0 ? pembayaranPag.slice.map((p) => (
                    <div
                      key={p.id}
                      className="group relative rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-sm p-3.5 transition-all"
                    >
                      {/* Actions (appear on hover) */}
                      <div className="absolute top-2.5 right-2.5 hidden group-hover:flex gap-1">
                        <button
                          onClick={() => handleOpenDialog(p.kegiatan_id, 0, p)}
                          className="p-1 rounded-md text-blue-500 hover:bg-blue-100 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setDeleteTargetId(p.id); setDeleteConfirmOpen(true); }}
                          className="p-1 rounded-md text-red-500 hover:bg-red-100 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Content */}
                      <p className="text-xs font-semibold text-slate-800 pr-14 mb-1 leading-tight">
                        {(p as any).nama_kegiatan || p.kegiatan?.nama_kegiatan || "—"}
                      </p>
                      <p className="text-base font-bold text-emerald-600 mb-2">
                        {formatRupiah(p.jumlah)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{formatDate(p.tanggal_pembayaran)}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 capitalize">
                          {p.metode_pembayaran || "—"}
                        </span>
                      </div>
                      {p.bukti_pembayaran && (
                        <p className="text-xs text-slate-400 italic mt-1.5 truncate">
                          "{p.bukti_pembayaran}"
                        </p>
                      )}
                    </div>
                  )) : (
                    <div className="text-center py-14 text-slate-400">
                      <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">Belum ada pembayaran</p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {pembayaranList.length > PAGE_SIZE && (
                  <div className="px-4 pb-4">
                    <Paginator page={pembayaranPag.page} total={pembayaranPag.total} setPage={pembayaranPag.setPage} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : !selectedKelas ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 px-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-slate-700 font-semibold text-base mb-1">Pilih Siswa untuk Melihat Tagihan</h3>
            <p className="text-slate-400 text-sm text-center max-w-xs">
              Gunakan filter di atas untuk memilih kelas dan siswa terlebih dahulu.
            </p>
          </div>
        ) : null}
      </div>

      {/* ── Dialog: Pembayaran Baru / Edit ─────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingPembayaran ? "Edit Pembayaran" : "Input Pembayaran Baru"}
            </DialogTitle>
            {selectedSiswaData && (
              <DialogDescription className="text-sm text-blue-600 font-semibold flex items-center gap-1.5 mt-1">
                <User className="w-4 h-4" /> {selectedSiswaData.nama}
              </DialogDescription>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Tanggal */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Tanggal Pembayaran
              </Label>
              <Input
                type="date"
                value={tanggalBayar}
                onChange={(e) => setTanggalBayar(e.target.value)}
                required
                className="rounded-xl border-slate-200 focus:border-blue-500"
              />
            </div>

            {/* Jumlah */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Jumlah Bayar (Rp)
              </Label>
              <Input
                type="number"
                value={jumlahBayar}
                onChange={(e) => setJumlahBayar(e.target.value)}
                placeholder="0"
                required min="1"
                className="rounded-xl border-slate-200 focus:border-blue-500"
              />
            </div>

            {/* Metode */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Metode Pembayaran
              </Label>
              <select
                value={metodePembayaran}
                onChange={(e) => setMetodePembayaran(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="tunai">Tunai</option>
                <option value="transfer">Transfer Bank</option>
                <option value="qris">QRIS</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Keterangan <span className="text-slate-400 font-normal normal-case">(opsional)</span>
              </Label>
              <Input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Catatan, nomor referensi, atau bukti pembayaran"
                className="rounded-xl border-slate-200 focus:border-blue-500"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                className="rounded-xl border-slate-200 text-slate-600">
                Batal
              </Button>
              <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                {editingPembayaran ? "Perbarui Pembayaran" : "Simpan Pembayaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirm Delete ──────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 text-base">
              <AlertCircle className="w-5 h-5" /> Hapus Pembayaran?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Anda yakin ingin menghapus data pembayaran ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}
              className="rounded-xl border-slate-200">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeletePembayaran}
              className="rounded-xl bg-red-600 hover:bg-red-700">
              Hapus Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}