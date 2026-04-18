import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import {
  Plus, Edit, Trash2, Calendar, DollarSign, Loader2,
  Eye, TrendingUp, Users, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { db, supabase } from "../../../utils/supabase/client";
import { toast } from "sonner";
import { LayoutWrapper } from "./LayoutWrapper";

interface Kegiatan {
  id: string; nama_kegiatan: string; nominal: number;
  tanggal_mulai: string; tanggal_selesai?: string;
  kelas_ids?: string[]; kelas_list?: Kelas[]; status?: string;
}
interface Kelas { id: string; nama_kelas: string; tingkat?: string; }
interface SiswaTagihan {
  tagihan_id: string; siswa_id: string; nama: string; nis: string;
  kelas_nama: string; nominal: number; terbayar: number; sisa: number;
  status: "paid" | "pending" | "overdue";
}
interface DetailData {
  siswaList: SiswaTagihan[];
  totalTagihan: number; totalTerbayar: number; totalSisa: number;
  jumlahLunas: number; jumlahPending: number; jumlahOverdue: number;
}

const rp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));
const isDupe = (e: unknown) => !!(e && typeof e === "object" && (e as any).code === "23505");
const getErrMsg = (e: unknown) => {
  if (!e || typeof e !== "object") return "Terjadi kesalahan";
  const err = e as { code?: string; message?: string };
  if (err.code === "23505") return "Tagihan duplikat diabaikan";
  return err.message ?? "Terjadi kesalahan";
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    paid:    { label: "Lunas",       cls: "bg-emerald-100 text-emerald-700" },
    pending: { label: "Belum Bayar", cls: "bg-blue-100 text-blue-700" },
    overdue: { label: "Jatuh Tempo", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
};

export default function KegiatanAdministrasi() {
  const [kegiatan, setKegiatan]           = useState<Kegiatan[]>([]);
  const [kelas, setKelas]                 = useState<Kelas[]>([]);
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [formOpen, setFormOpen]           = useState(false);
  const [detailOpen, setDetailOpen]       = useState(false);
  const [selectedKeg, setSelectedKeg]     = useState<Kegiatan | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail]               = useState<DetailData | null>(null);
  const [editingKeg, setEditingKeg]       = useState<Kegiatan | null>(null);
  const [searchDetail, setSearchDetail]   = useState("");
  const [kelasFilter, setKelasFilter]     = useState("all");
  const [sortCol, setSortCol]             = useState<"nama" | "sisa" | "status">("status");
  const [sortAsc, setSortAsc]             = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending" | "overdue" | "unpaid">("all");
  const [form, setForm] = useState({
    nama_kegiatan: "", nominal: "", tanggal_mulai: "",
    tanggal_selesai: "", kelas_ids: [] as string[],
  });

  useEffect(() => { fetchKegiatan(); fetchKelas(); }, []);

  const fetchKegiatan = async () => {
    try {
      const { data, error } = await db.getKegiatanAdministrasi();
      if (error) { toast.error("Gagal memuat: " + error.message); return; }
      setKegiatan(data || []);
    } finally { setLoading(false); }
  };
  const fetchKelas = async () => { const { data } = await db.getKelas(); setKelas(data || []); };

  const openForm = (keg?: Kegiatan) => {
    if (keg) {
      setEditingKeg(keg);
      setForm({ nama_kegiatan: keg.nama_kegiatan, nominal: keg.nominal.toString(),
        tanggal_mulai: keg.tanggal_mulai.split("T")[0],
        tanggal_selesai: keg.tanggal_selesai?.split("T")[0] ?? "",
        kelas_ids: keg.kelas_ids ?? [] });
    } else {
      setEditingKeg(null);
      setForm({ nama_kegiatan: "", nominal: "", tanggal_mulai: "", tanggal_selesai: "", kelas_ids: [] });
    }
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.kelas_ids.length === 0) { toast.error("Pilih minimal 1 kelas!"); return; }
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      nama_kegiatan: form.nama_kegiatan,
      nominal: parseFloat(form.nominal),
      deskripsi: "",
      status: editingKeg?.status ?? "pending",
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai || undefined,
      kelas_ids: form.kelas_ids,
    };
    try {
      if (editingKeg) {
        const { error } = await db.updateKegiatanAdministrasi(editingKeg.id, payload);
        if (error && !isDupe(error)) { toast.error(getErrMsg(error)); return; }
        toast.success(isDupe(error) ? "Diperbarui — tagihan duplikat diabaikan" : "Data berhasil diperbarui");
      } else {
        const { error } = await db.createKegiatanAdministrasi(payload);
        if (error && !isDupe(error)) { toast.error(getErrMsg(error)); return; }
        toast.success(isDupe(error) ? "Dibuat — tagihan duplikat diabaikan" : "Kegiatan dan tagihan berhasil dibuat");
      }
      setFormOpen(false); fetchKegiatan();
    } catch { toast.error("Terjadi kesalahan tidak terduga"); }
    finally { setSubmitting(false); }
  };

  const openDetail = async (keg: Kegiatan) => {
    setSelectedKeg(keg); setDetail(null); setSearchDetail(""); setKelasFilter("all"); setPaymentFilter("all"); setDetailOpen(true); setDetailLoading(true);
    try {
      // Fetch tagihan + siswa + kelas sekaligus
      const { data: tagihanRows, error: tErr } = await supabase
        .from("tagihan")
        .select("id, siswa_id, jumlah, status, tanggal_jatuh_tempo, siswa:siswa_id (nama, nis, kelas_id, kelas:kelas_id (nama_kelas))")
        .eq("kegiatan_id", keg.id);
      if (tErr || !tagihanRows?.length) {
        setDetail({ siswaList: [], totalTagihan: 0, totalTerbayar: 0, totalSisa: 0, jumlahLunas: 0, jumlahPending: 0, jumlahOverdue: 0 });
        return;
      }
      // Fetch semua pembayaran untuk tagihan-tagihan ini (bukan 1 siswa saja)
      const tagihanIds = tagihanRows.map((t: any) => t.id);
      const { data: pembayaranRows } = await supabase
        .from("pembayaran").select("tagihan_id, jumlah").in("tagihan_id", tagihanIds);

      // Map: tagihan_id → total terbayar
      const terbayarMap: Record<string, number> = {};
      (pembayaranRows || []).forEach((p: any) => {
        terbayarMap[p.tagihan_id] = (terbayarMap[p.tagihan_id] ?? 0) + (p.jumlah ?? 0);
      });

      const siswaList: SiswaTagihan[] = tagihanRows.map((t: any) => {
        const terbayar = terbayarMap[t.id] ?? 0;
        return {
          tagihan_id: t.id, siswa_id: t.siswa_id,
          nama: t.siswa?.nama ?? "Unknown", nis: t.siswa?.nis ?? "-",
          kelas_nama: (t.siswa?.kelas as any)?.nama_kelas ?? "-",
          nominal: t.jumlah ?? 0, terbayar,
          sisa: Math.max(0, (t.jumlah ?? 0) - terbayar),
          status: t.status as "paid" | "pending" | "overdue",
        };
      });

      setDetail({
        siswaList,
        totalTagihan:  siswaList.reduce((s, r) => s + r.nominal, 0),
        totalTerbayar: siswaList.reduce((s, r) => s + r.terbayar, 0),
        totalSisa:     siswaList.reduce((s, r) => s + r.sisa, 0),
        jumlahLunas:   siswaList.filter(s => s.status === "paid").length,
        jumlahPending: siswaList.filter(s => s.status === "pending").length,
        jumlahOverdue: siswaList.filter(s => s.status === "overdue").length,
      });
    } catch (err) { console.error(err); toast.error("Gagal memuat detail"); }
    finally { setDetailLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kegiatan ini? Semua tagihan terkait juga akan dihapus.")) return;
    const { error } = await db.deleteKegiatanAdministrasi(id);
    if (error) { toast.error("Gagal menghapus: " + error.message); return; }
    toast.success("Kegiatan berhasil dihapus"); fetchKegiatan();
  };

  const getKelasNames = (keg: Kegiatan) => {
    if (keg.kelas_list?.length) return keg.kelas_list.map(k => k.nama_kelas).join(", ");
    if (keg.kelas_ids?.length) return keg.kelas_ids.map(id => kelas.find(k => k.id === id)?.nama_kelas).filter(Boolean).join(", ");
    return "Tidak ada kelas";
  };

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortAsc(p => !p); else { setSortCol(col); setSortAsc(false); }
  };

  const filteredSiswa = (detail?.siswaList ?? [])
    .filter(s => kelasFilter === "all" || s.kelas_nama === kelasFilter)
    .filter(s => s.nama.toLowerCase().includes(searchDetail.toLowerCase()) || s.nis.includes(searchDetail))
    .filter(s => {
      if (paymentFilter === "paid")    return s.status === "paid";
      if (paymentFilter === "pending") return s.status === "pending";
      if (paymentFilter === "overdue") return s.status === "overdue";
      if (paymentFilter === "unpaid")  return s.status === "pending" || s.status === "overdue";
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortCol === "nama")   cmp = a.nama.localeCompare(b.nama);
      if (sortCol === "sisa")   cmp = a.sisa - b.sisa;
      if (sortCol === "status") { const o = { overdue: 0, pending: 1, paid: 2 }; cmp = (o[a.status] ?? 1) - (o[b.status] ?? 1); }
      return sortAsc ? cmp : -cmp;
    });

  const SortIcon = ({ col }: { col: typeof sortCol }) =>
    sortCol === col
      ? (sortAsc ? <ChevronUp size={11}/> : <ChevronDown size={11}/>)
      : <ChevronDown size={11} className="opacity-25"/>;

  const kelasOptions = Array.from(new Set((detail?.siswaList ?? []).map((s) => s.kelas_nama).filter(Boolean)));

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin w-8 h-8 text-gray-400"/>
    </div>
  );

  return (
    <LayoutWrapper title="Kegiatan Administrasi" subtitle="Kelola kegiatan dan pantau tagihan per kegiatan">
      {/* Header */}
      <div className="mb-3 flex justify-between items-center">
        <Button onClick={() => openForm()} className="gap-2">
          <Plus className="w-4 h-4"/> Tambah Kegiatan
        </Button>
      </div>

      {/* Card Grid */}
      {kegiatan.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p className="font-medium">Belum ada kegiatan administrasi</p>
          <p className="text-sm mt-1">Klik "Tambah Kegiatan" untuk memulai</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {kegiatan.map(keg => (
            <Card key={keg.id} className="hover:shadow-md transition-all border border-gray-100">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{keg.nama_kegiatan}</CardTitle>
                  {keg.status && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      keg.status === "completed" ? "bg-emerald-100 text-emerald-700"
                      : keg.status === "ongoing"  ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"}`}>
                      {keg.status === "completed" ? "Selesai" : keg.status === "ongoing" ? "Berjalan" : "Pending"}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400 shrink-0"/>
                  <span className="font-bold text-emerald-600 text-sm">{rp(keg.nominal)}</span>
                  <span className="text-xs text-gray-400">/ siswa</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="w-4 h-4 shrink-0"/>
                  <span className="text-xs">{fmtDate(keg.tanggal_mulai)}{keg.tanggal_selesai ? ` — ${fmtDate(keg.tanggal_selesai)}` : ""}</span>
                </div>
                <div className="pt-2 border-t border-dashed">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Kelas</p>
                  <p className="text-xs font-medium text-gray-700">{getKelasNames(keg)}</p>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" onClick={() => openDetail(keg)} className="flex-1 h-8 text-xs gap-1">
                    <Eye className="w-3 h-3"/> Detail Tagihan
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openForm(keg)} className="h-8 w-8 p-0">
                    <Edit className="w-3 h-3"/>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(keg.id)} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3 h-3"/>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Form Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={open => { if (!submitting) setFormOpen(open); }}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[92vh] overflow-hidden p-0">
          <DialogHeader>
            <DialogTitle className="px-6 pt-6">{editingKeg ? "Edit Kegiatan" : "Tambah Kegiatan Baru"}</DialogTitle>
            <DialogDescription className="px-6">
              Tagihan akan digenerate otomatis untuk semua siswa di kelas yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex max-h-[92vh] flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nama Kegiatan</Label>
                  <Input
                    value={form.nama_kegiatan}
                    onChange={e => setForm(p => ({ ...p, nama_kegiatan: e.target.value }))}
                    placeholder="Contoh: SPP Januari, Uang Seragam..."
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nominal (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.nominal}
                    onChange={e => setForm(p => ({ ...p, nominal: e.target.value }))}
                    placeholder="500000"
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    value={form.tanggal_mulai}
                    onChange={e => setForm(p => ({ ...p, tanggal_mulai: e.target.value }))}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Tanggal Selesai <span className="text-gray-400 font-normal text-xs">(opsional)</span></Label>
                  <Input
                    type="date"
                    value={form.tanggal_selesai}
                    onChange={e => setForm(p => ({ ...p, tanggal_selesai: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Kelas yang Wajib Membayar</Label>
                {kelas.length > 0 ? (
                  <>
                    <div className="border rounded-lg p-3 h-48 overflow-y-auto">
                      <div className="space-y-1 pr-2">
                        {kelas.map(k => (
                          <label key={k.id} className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50">
                            <Checkbox
                              checked={form.kelas_ids.includes(k.id)}
                              disabled={submitting}
                              onCheckedChange={v => setForm(p => ({
                                ...p,
                                kelas_ids: v ? [...p.kelas_ids, k.id] : p.kelas_ids.filter(id => id !== k.id),
                              }))}
                            />
                            <span className="text-sm">{k.nama_kelas}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {form.kelas_ids.length > 0 ? `✓ ${form.kelas_ids.length} kelas dipilih` : "Pilih minimal 1 kelas"}
                    </p>
                  </>
                ) : (
                  <div className="border rounded-lg p-6 text-center bg-gray-50 text-sm text-gray-500">
                    Belum ada kelas — tambahkan di menu Kelas terlebih dahulu
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-white mt-auto flex gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting} className="flex-1">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Menyimpan...</> : editingKeg ? "Update" : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="!max-w-5xl w-[95vw] !max-h-[90vh] h-[90vh] !p-0 gap-0 overflow-hidden grid"
          style={{ gridTemplateRows: "auto 1fr auto" }}
        >
          {/* Row 1: Fixed Header — tidak ikut scroll */}
          <div className="px-6 pt-5 pb-4 border-b bg-white">
            <DialogTitle className="text-lg font-bold">{selectedKeg?.nama_kegiatan}</DialogTitle>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5"><DollarSign size={13}/>{rp(selectedKeg?.nominal ?? 0)} / siswa</span>
              {selectedKeg?.tanggal_mulai && (
                <span className="flex items-center gap-1.5"><Calendar size={13}/>{fmtDate(selectedKeg.tanggal_mulai)}
                  {selectedKeg.tanggal_selesai ? ` — ${fmtDate(selectedKeg.tanggal_selesai)}` : ""}
                </span>
              )}
              {detail && (
                <span className="flex items-center gap-1.5"><Users size={13}/>{detail.siswaList.length} siswa</span>
              )}
            </div>
          </div>

          {/* Row 2: Scrollable Body — hanya bagian ini yang scroll */}
          <div className="overflow-y-auto overscroll-contain px-6 py-5 space-y-5 min-h-0">
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500"/>
                <p className="text-sm text-gray-500">Memuat data tagihan...</p>
              </div>
            ) : !detail || detail.siswaList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-gray-400">
                <Users size={40} className="opacity-30"/>
                <p className="font-medium">Belum ada tagihan untuk kegiatan ini</p>
                <p className="text-sm">Pastikan siswa sudah terdaftar di kelas yang dipilih</p>
              </div>
            ) : (
              <>
                {/* Summary 4 cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Tagihan",  val: rp(detail.totalTagihan),  icon: <DollarSign size={16}/>, col: "text-blue-600",    bg: "bg-blue-50" },
                    { label: "Terbayar",       val: rp(detail.totalTerbayar), icon: <CheckCircle size={16}/>, col: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Sisa Tunggakan", val: rp(detail.totalSisa),     icon: <AlertCircle size={16}/>, col: "text-red-600",    bg: "bg-red-50" },
                    { label: "Kolektibilitas", val: `${pct(detail.totalTerbayar, detail.totalTagihan)}%`, icon: <TrendingUp size={16}/>, col: "text-purple-600", bg: "bg-purple-50" },
                  ].map(c => (
                    <div key={c.label} className={`${c.bg} rounded-xl p-3.5`}>
                      <div className={`${c.col} mb-1.5`}>{c.icon}</div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-none">{c.label}</p>
                      <p className={`text-sm font-bold ${c.col} mt-1`}>{c.val}</p>
                    </div>
                  ))}
                </div>

                {/* Tabel siswa */}
                <div className="border rounded-xl overflow-hidden">
                  {/* Toolbar: search + filter */}
                  <div className="px-4 py-3 bg-gray-50 border-b space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-700">
                        Daftar Siswa
                        <span className="text-gray-400 font-normal text-xs ml-1.5">({filteredSiswa.length} ditampilkan)</span>
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={kelasFilter}
                          onChange={(e) => setKelasFilter(e.target.value)}
                          className="w-44 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        >
                          <option value="all">Semua Kelas</option>
                          {kelasOptions.map((namaKelas) => (
                            <option key={namaKelas} value={namaKelas}>{namaKelas}</option>
                          ))}
                        </select>
                        <div className="relative w-52 shrink-0">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                          <input value={searchDetail} onChange={e => setSearchDetail(e.target.value)}
                            placeholder="Cari nama / NIS..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"/>
                        </div>
                      </div>
                    </div>
                    {/* Filter status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { key: "all",     label: "Semua",        count: detail.siswaList.length,                               cls: "bg-gray-200 text-gray-700",    active: "bg-gray-800 text-white" },
                        { key: "paid",    label: "✓ Lunas",      count: detail.jumlahLunas,                                    cls: "bg-emerald-100 text-emerald-700", active: "bg-emerald-600 text-white" },
                        { key: "pending", label: "○ Belum Bayar",count: detail.jumlahPending,                                  cls: "bg-blue-100 text-blue-700",    active: "bg-blue-600 text-white" },
                        { key: "overdue", label: "! Jatuh Tempo",count: detail.jumlahOverdue,                                  cls: "bg-red-100 text-red-600",      active: "bg-red-600 text-white" },
                        { key: "unpaid",  label: "✗ Semua Belum",count: detail.jumlahPending + detail.jumlahOverdue,           cls: "bg-orange-100 text-orange-700", active: "bg-orange-600 text-white" },
                      ].map(f => (
                        <button
                          key={f.key}
                          onClick={() => setPaymentFilter(f.key as any)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                            paymentFilter === f.key ? f.active : f.cls + " hover:opacity-80"
                          }`}
                        >
                          {f.label}
                          <span className="ml-1.5 opacity-70">({f.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="bg-gray-50 border-b">
                        <tr className="text-[11px] text-gray-500 uppercase tracking-wide">
                          <th className="px-4 py-2.5 text-left w-8">No</th>
                          <th className="px-4 py-2.5 text-left cursor-pointer select-none" onClick={() => toggleSort("nama")}>
                            <span className="flex items-center gap-1">Nama Siswa <SortIcon col="nama"/></span>
                          </th>
                          <th className="px-4 py-2.5 text-left">NIS</th>
                          <th className="px-4 py-2.5 text-left">Kelas</th>
                          <th className="px-4 py-2.5 text-right">Tagihan</th>
                          <th className="px-4 py-2.5 text-right">Terbayar</th>
                          <th className="px-4 py-2.5 text-right cursor-pointer select-none" onClick={() => toggleSort("sisa")}>
                            <span className="flex items-center justify-end gap-1">Sisa <SortIcon col="sisa"/></span>
                          </th>
                          <th className="px-4 py-2.5 text-center cursor-pointer select-none" onClick={() => toggleSort("status")}>
                            <span className="flex items-center justify-center gap-1">Status <SortIcon col="status"/></span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredSiswa.map((s, i) => (
                          <tr key={s.tagihan_id} className={`hover:bg-gray-50 transition-colors ${s.status === "overdue" ? "bg-red-50/40" : ""}`}>
                            <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-medium text-gray-800">{s.nama}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs font-mono">{s.nis}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.kelas_nama}</td>
                            <td className="px-4 py-3 text-right text-gray-700 text-xs">{rp(s.nominal)}</td>
                            <td className="px-4 py-3 text-right text-emerald-700 text-xs font-medium">{rp(s.terbayar)}</td>
                            <td className="px-4 py-3 text-right text-xs">
                              {s.sisa > 0
                                ? <span className="font-bold text-red-600">{rp(s.sisa)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center"><StatusBadge status={s.status}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredSiswa.length === 0 && (
                      <div className="text-center py-8 text-sm text-gray-400">Tidak ada siswa yang cocok dengan pencarian</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Row 3: Fixed Footer — tidak ikut scroll */}
          <div className="px-6 py-3.5 border-t bg-white flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  );
}
