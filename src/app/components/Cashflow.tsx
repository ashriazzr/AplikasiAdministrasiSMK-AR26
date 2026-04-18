import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  TrendingUp, TrendingDown, Plus, Trash2, Edit2,
  Download, Settings, DollarSign, RefreshCw, ChevronLeft, ChevronRight,
} from "lucide-react";
import { db } from "../../../utils/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { LayoutWrapper, PageSection } from "./LayoutWrapper";

interface Kategori { id: string; nama_kategori: string; jenis: "income" | "expense"; warna: string; icon: string; urutan: number; }
interface Pengeluaran { id: string; kegiatan_id: string; deskripsi: string; jumlah: number; tanggal: string; kategori: string; keterangan?: string; }
interface PembayaranRow { id: string; tagihan_id: string; siswa_id: string; jumlah: number; metode_pembayaran: string; tanggal_pembayaran: string; siswa?: { nama: string; nis: string }; }
interface KegiatanRow { id: string; nama_kegiatan: string; nominal: number; tanggal_mulai: string; tanggal_selesai?: string; }
interface ActivitySummary { totalPemasukan: number; totalPengeluaran: number; saldo: number; pengeluaranList: Pengeluaran[]; pembayaranList: PembayaranRow[]; }

const rp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtDate = (s: string) => { if (!s) return "-"; const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); };
const COLOR_PRESETS = ["#10b981","#06b6d4","#ef4444","#f97316","#8b5cf6","#eab308","#6366f1","#14b8a6","#64748b","#ec4899"];
const MANUAL_TX_PAGE_SIZE = 10;

export default function Cashflow() {
  const [searchParams] = useSearchParams();
  const [kegiatan, setKegiatan]     = useState<KegiatanRow[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [summaries, setSummaries]   = useState<Record<string, ActivitySummary>>({});
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [txOpen, setTxOpen]         = useState(false);
  const [catOpen, setCatOpen]       = useState(false);
  const [detailKegId, setDetailKegId] = useState<string>("");
  const [manualTxPage, setManualTxPage] = useState(1);
  const [editingTx, setEditingTx]   = useState<Pengeluaran | null>(null);
  const [editingCat, setEditingCat] = useState<Kategori | null>(null);
  const [selKegId, setSelKegId]     = useState<string>("");

  const [txForm, setTxForm] = useState({ tanggal: new Date().toISOString().split("T")[0], jenis: "expense" as "income" | "expense", kategori_id: "", jumlah: "", deskripsi: "" });
  const [catForm, setCatForm] = useState({ nama_kategori: "", jenis: "expense" as "income" | "expense", warna: "#10b981", icon: "tag", urutan: 0 });

  const kegiatanIdParam = searchParams.get("kegiatanId")?.trim() || "";

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (loading || kegiatan.length === 0) return;

    const target = kegiatanIdParam
      ? kegiatan.find((item) => item.id === kegiatanIdParam)
      : kegiatan[0];

    if (target && target.id !== detailKegId) {
      setDetailKegId(target.id);
    }
  }, [loading, kegiatan, kegiatanIdParam, detailKegId]);

  useEffect(() => {
    setManualTxPage(1);
  }, [detailKegId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [kgRes, catRes] = await Promise.all([db.getKegiatanAdministrasi(), db.getKategori()]);
      const kgData: KegiatanRow[] = (kgRes.data as any[]) || [];
      const catData: Kategori[] = (catRes.data as any[]) || [];
      setKegiatan(kgData);
      setCategories(catData);
      await Promise.all(kgData.map(k => loadActivityData(k.id, catData)));
    } catch { toast.error("Gagal memuat data cashflow"); }
    finally { setLoading(false); }
  };

  const loadActivityData = async (kegiatanId: string, _cats?: Kategori[]) => {
    try {
      const [pRes, pmRes] = await Promise.all([
        db.getPengeluaranByKegiatan(kegiatanId),
        db.getPembayaranByKegiatan(kegiatanId),
      ]);
      const pengeluaranList: Pengeluaran[] = (pRes.data as any[]) || [];
      const pembayaranList: PembayaranRow[] = (pmRes.data as any[]) || [];
      // Pemasukan = pembayaran siswa + catatan manual income (keterangan="income")
      const manualIncome = pengeluaranList.filter(p => p.keterangan === "income").reduce((s, p) => s + (p.jumlah ?? 0), 0);
      const totalPemasukan = pembayaranList.reduce((s, p) => s + (p.jumlah ?? 0), 0) + manualIncome;
      // Pengeluaran = hanya catatan yang bukan income manual
      const totalPengeluaran = pengeluaranList.filter(p => p.keterangan !== "income").reduce((s, p) => s + (p.jumlah ?? 0), 0);
      setSummaries(prev => ({ ...prev, [kegiatanId]: { totalPemasukan, totalPengeluaran, saldo: totalPemasukan - totalPengeluaran, pengeluaranList, pembayaranList } }));
    } catch (e) { console.error("Error loading activity data:", e); }
  };

  const handleRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); toast.success("Data diperbarui"); };

  const openAddTx = (kegiatanId: string, jenis: "income" | "expense" = "expense") => { setSelKegId(kegiatanId); setEditingTx(null); setTxForm({ tanggal: new Date().toISOString().split("T")[0], jenis, kategori_id: "", jumlah: "", deskripsi: "" }); setTxOpen(true); };
  const openEditTx = (tx: Pengeluaran, kegiatanId: string) => { setSelKegId(kegiatanId); setEditingTx(tx); setTxForm({ tanggal: tx.tanggal?.split("T")[0] ?? "", jenis: "expense", kategori_id: tx.kategori ?? "", jumlah: tx.jumlah?.toString() ?? "", deskripsi: tx.deskripsi ?? "" }); setTxOpen(true); };

  const handleSaveTx = async () => {
    if (!selKegId || !txForm.jumlah || parseFloat(txForm.jumlah) <= 0) { toast.error("Isi nominal dengan benar"); return; }
    // Pemasukan manual disimpan ke tabel pengeluaran dengan kategori income
    // Pengeluaran disimpan normal ke tabel pengeluaran
    // Keduanya pakai tabel yang sama karena schema tidak punya tabel income manual terpisah
    const payload = { kegiatan_id: selKegId, tanggal: txForm.tanggal, jumlah: parseFloat(txForm.jumlah), kategori: txForm.kategori_id, deskripsi: txForm.deskripsi, keterangan: txForm.jenis };
    try {
      if (editingTx) { const { error } = await db.updatePengeluaran(editingTx.id, payload); if (error) throw error; toast.success("Catatan diperbarui"); }
      else { const { error } = await db.createPengeluaran(payload); if (error) throw error; toast.success(txForm.jenis === "income" ? "Pemasukan manual dicatat" : "Pengeluaran dicatat"); }
      setTxOpen(false); await loadActivityData(selKegId);
    } catch { toast.error("Gagal menyimpan catatan"); }
  };

  const handleDeleteTx = async (id: string, kegiatanId: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    const { error } = await db.deletePengeluaran(id);
    if (error) { toast.error("Gagal menghapus"); return; }
    toast.success("Transaksi dihapus");
    await loadActivityData(kegiatanId);
  };

  const exportKegiatan = (kegiatanId: string) => {
    const kg = kegiatan.find(k => k.id === kegiatanId);
    const s = summaries[kegiatanId];
    if (!s) return;

    const rows = [
      ...s.pembayaranList.map(p => ({
        Tanggal: fmtDate(p.tanggal_pembayaran),
        Jenis: "Pemasukan",
        Keterangan: `Pembayaran - ${p.siswa?.nama ?? "-"}`,
        Nominal: p.jumlah,
      })),
      ...s.pengeluaranList.map(p => ({
        Tanggal: fmtDate(p.tanggal),
        Jenis: p.keterangan === "income" ? "Pemasukan" : "Pengeluaran",
        Keterangan: p.deskripsi || "-",
        Nominal: p.jumlah,
      })),
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cashflow");
    XLSX.writeFile(wb, `Cashflow_${kg?.nama_kegiatan ?? kegiatanId}_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("File Excel diunduh");
  };

  const handleSaveCat = async () => {
    if (!catForm.nama_kategori.trim()) { toast.error("Nama kategori wajib diisi"); return; }
    try {
      if (editingCat) {
        const { error } = await db.updateKategori(editingCat.id, catForm);
        if (error) throw error;
        toast.success("Kategori diperbarui");
      } else {
        const { error } = await db.createKategori(catForm);
        if (error) throw error;
        toast.success("Kategori ditambahkan");
      }

      const res = await db.getKategori();
      setCategories((res.data as Kategori[]) || []);
      setEditingCat(null);
      setCatForm({ nama_kategori: "", jenis: "expense", warna: "#10b981", icon: "tag", urutan: 0 });
    } catch {
      toast.error("Gagal menyimpan kategori");
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    const { error } = await db.deleteKategori(id);
    if (error) { toast.error("Gagal menghapus"); return; }
    const res = await db.getKategori();
    setCategories((res.data as Kategori[]) || []);
    toast.success("Kategori dihapus");
  };

  const detailKg = kegiatan.find(k => k.id === detailKegId);
  const detailSumm = summaries[detailKegId];
  const sortedManualTransactions = (detailSumm?.pengeluaranList ?? [])
    .slice()
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  const manualTxTotalPages = Math.max(1, Math.ceil(sortedManualTransactions.length / MANUAL_TX_PAGE_SIZE));
  const currentManualTxPage = Math.min(manualTxPage, manualTxTotalPages);
  const paginatedManualTransactions = sortedManualTransactions.slice(
    (currentManualTxPage - 1) * MANUAL_TX_PAGE_SIZE,
    currentManualTxPage * MANUAL_TX_PAGE_SIZE,
  );
  const manualTxStart = sortedManualTransactions.length === 0 ? 0 : (currentManualTxPage - 1) * MANUAL_TX_PAGE_SIZE + 1;
  const manualTxEnd = Math.min(currentManualTxPage * MANUAL_TX_PAGE_SIZE, sortedManualTransactions.length);

  return (
    <LayoutWrapper title="Cashflow" subtitle="Detail pemasukan dan pengeluaran kegiatan">
      <PageSection>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Kegiatan aktif</p>
            <p className="text-lg font-bold text-gray-900 truncate">{detailKg?.nama_kegiatan ?? "Tidak ada kegiatan"}</p>
            <p className="text-sm text-gray-500">Detail pemasukan dan pengeluaran kegiatan</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={14} className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}/>
              {refreshing ? "Memuat..." : "Perbarui"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setEditingCat(null); setCatForm({ nama_kategori: "", jenis: "expense", warna: "#10b981", icon: "tag", urutan: 0 }); setCatOpen(true); }}>
              <Settings size={14} className="mr-1.5"/> Kategori
            </Button>
            <Button variant="outline" size="sm" onClick={() => detailKegId && exportKegiatan(detailKegId)} disabled={!detailKegId}>
              <Download size={14} className="mr-1.5"/> Export
            </Button>
            <Button size="sm" onClick={() => detailKegId && openAddTx(detailKegId)} disabled={!detailKegId}>
              <Plus size={14} className="mr-1.5"/> Catat Transaksi
            </Button>
          </div>
        </div>
      </PageSection>

      <PageSection>
        {!detailKg || !detailSumm ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-400">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30"/>
              <p className="font-medium">Tidak ada kegiatan administrasi</p>
              <p className="text-sm mt-1">Buat kegiatan terlebih dahulu di menu Kegiatan Administrasi</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pemasukan Siswa</p>
                <p className="text-lg font-bold text-emerald-600">{rp(detailSumm.pembayaranList.reduce((s, p) => s + (p.jumlah ?? 0), 0))}</p>
                <p className="text-xs text-gray-400 mt-0.5">{detailSumm.pembayaranList.length} transaksi otomatis</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pemasukan Manual</p>
                <p className="text-lg font-bold text-emerald-600">{rp(detailSumm.pengeluaranList.filter(p => p.keterangan === "income").reduce((s, p) => s + (p.jumlah ?? 0), 0))}</p>
                <p className="text-xs text-gray-400 mt-0.5">{detailSumm.pengeluaranList.filter(p => p.keterangan === "income").length} catatan manual</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pengeluaran</p>
                <p className="text-lg font-bold text-red-500">{rp(detailSumm.totalPengeluaran)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{detailSumm.pengeluaranList.filter(p => p.keterangan !== "income").length} catatan</p>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"/>
                  Catatan Transaksi Manual
                  <span className="text-xs font-normal text-gray-400">({detailSumm.pengeluaranList.length})</span>
                </h3>
                <Button size="sm" variant="outline" onClick={() => detailKegId && openAddTx(detailKegId)} className="h-7 text-xs gap-1">
                  <Plus size={11}/> Catat
                </Button>
              </div>
              {detailSumm.pengeluaranList.length === 0 ? (
                <div className="border border-dashed rounded-xl py-10 text-center text-sm text-gray-400 bg-white">
                  Belum ada catatan transaksi manual
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => detailKegId && openAddTx(detailKegId)}>
                      <Plus size={12} className="mr-1.5"/> Catat Transaksi
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: 500 }}>
                      <thead className="bg-gray-50 border-b">
                        <tr className="text-xs text-gray-500 uppercase tracking-wide">
                          <th className="px-4 py-2.5 text-left font-medium">Tanggal</th>
                          <th className="px-4 py-2.5 text-left font-medium">Keterangan</th>
                          <th className="px-4 py-2.5 text-left font-medium">Kategori</th>
                          <th className="px-4 py-2.5 text-center font-medium">Jenis</th>
                          <th className="px-4 py-2.5 text-right font-medium">Jumlah</th>
                          <th className="px-4 py-2.5 text-center font-medium w-16">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedManualTransactions.map((tx) => {
                            const cat = categories.find((c) => c.id === tx.kategori);
                            const isIncome = tx.keterangan === "income";
                            return (
                              <tr key={tx.id} className={`hover:bg-gray-50 transition-colors ${isIncome ? "bg-emerald-50/30" : ""}`}>
                                <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(tx.tanggal)}</td>
                                <td className="px-4 py-2.5 text-gray-800">{tx.deskripsi || "-"}</td>
                                <td className="px-4 py-2.5">
                                  {cat
                                    ? <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: cat.warna }}>{cat.nama_kategori}</span>
                                    : <span className="text-xs text-gray-400">-</span>}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isIncome ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                                    {isIncome ? "Pemasukan" : "Pengeluaran"}
                                  </span>
                                </td>
                                <td className={`px-4 py-2.5 text-right font-bold ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
                                  {isIncome ? "+" : "-"}{rp(tx.jumlah)}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditTx(tx, detailKegId)}>
                                      <Edit2 size={12}/>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteTx(tx.id, detailKegId)}>
                                      <Trash2 size={12}/>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {manualTxTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-2 text-xs text-gray-500">
                      <span>
                        Menampilkan {manualTxStart}-{manualTxEnd} dari {sortedManualTransactions.length} transaksi
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setManualTxPage((p) => Math.max(1, p - 1))}
                          disabled={currentManualTxPage === 1}
                        >
                          <ChevronLeft size={14} />
                        </Button>
                        <span className="min-w-[88px] text-center text-xs text-gray-600">
                          Hal {currentManualTxPage} / {manualTxTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setManualTxPage((p) => Math.min(manualTxTotalPages, p + 1))}
                          disabled={currentManualTxPage === manualTxTotalPages}
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className={`rounded-xl p-5 border ${detailSumm.saldo >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Saldo Bersih</p>
                  <p className={`text-3xl font-bold ${detailSumm.saldo >= 0 ? "text-blue-600" : "text-orange-600"}`}>{rp(detailSumm.saldo)}</p>
                </div>
                <div className="text-xs text-gray-500 text-right space-y-1.5 shrink-0">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-gray-500">Pemasukan</span>
                    <span className="font-bold text-emerald-600 tabular-nums">{rp(detailSumm.totalPemasukan)}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-gray-500">Pengeluaran</span>
                    <span className="font-bold text-red-500 tabular-nums">{rp(detailSumm.totalPengeluaran)}</span>
                  </div>
                  <div className="pt-1 border-t flex items-center gap-2 justify-end">
                    <span className="text-gray-600 font-medium">Saldo</span>
                    <span className={`font-bold tabular-nums ${detailSumm.saldo >= 0 ? "text-blue-600" : "text-orange-600"}`}>{rp(detailSumm.saldo)}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </PageSection>

      <Dialog open={txOpen} onOpenChange={(open) => { if (!open) { setTxOpen(false); setEditingTx(null); } else setTxOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTx ? "Edit Catatan" : "Catat Transaksi"}</DialogTitle>
            <DialogDescription>{kegiatan.find((k) => k.id === selKegId)?.nama_kegiatan ?? ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Jenis Transaksi</Label>
              <div className="flex mt-1.5 rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTxForm((p) => ({ ...p, jenis: "income", kategori_id: "" }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${txForm.jenis === "income" ? "bg-emerald-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  ↑ Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setTxForm((p) => ({ ...p, jenis: "expense", kategori_id: "" }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${txForm.jenis === "expense" ? "bg-red-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  ↓ Pengeluaran
                </button>
              </div>
            </div>
            <div><Label>Tanggal</Label><Input type="date" value={txForm.tanggal} onChange={(e) => setTxForm((p) => ({ ...p, tanggal: e.target.value }))}/></div>
            <div>
              <Label>Kategori <span className="text-gray-400 text-xs">(opsional)</span></Label>
              <Select value={txForm.kategori_id} onValueChange={(v) => setTxForm((p) => ({ ...p, kategori_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori"/></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.jenis === txForm.jenis).map((c) => <SelectItem key={c.id} value={c.id}>{c.nama_kategori}</SelectItem>)}
                  {categories.filter((c) => c.jenis === txForm.jenis).length === 0 && (
                    <SelectItem value="_none" disabled>Belum ada kategori - tambah di Kelola Kategori</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nominal (Rp)</Label><Input type="number" min="0" placeholder="0" value={txForm.jumlah} onChange={(e) => setTxForm((p) => ({ ...p, jumlah: e.target.value }))}/></div>
            <div><Label>Keterangan</Label><Input placeholder={txForm.jenis === "income" ? "Contoh: Dana bantuan, Donasi..." : "Contoh: Pembelian alat tulis..."} value={txForm.deskripsi} onChange={(e) => setTxForm((p) => ({ ...p, deskripsi: e.target.value }))}/></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTxOpen(false)}>Batal</Button>
            <Button onClick={handleSaveTx} className={txForm.jenis === "income" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
              {editingTx ? "Perbarui" : txForm.jenis === "income" ? "Simpan Pemasukan" : "Simpan Pengeluaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent
          className="!max-w-2xl w-[90vw] !max-h-[85vh] h-[85vh] !p-0 gap-0 overflow-hidden grid"
          style={{ gridTemplateRows: "auto 1fr auto" }}
        >
          <div className="px-6 pt-5 pb-4 border-b bg-white">
            <DialogTitle>Kelola Kategori</DialogTitle>
            <DialogDescription>Atur kategori pengeluaran untuk cashflow</DialogDescription>
          </div>
          <div className="overflow-y-auto overscroll-contain px-6 py-4 space-y-6">
            <div className="border rounded-xl p-4 bg-gray-50">
              <p className="text-sm font-semibold mb-3">{editingCat ? "Edit Kategori" : "Tambah Kategori Baru"}</p>
              <div className="space-y-3">
                <div><Label>Nama Kategori</Label><Input value={catForm.nama_kategori} onChange={(e) => setCatForm((p) => ({ ...p, nama_kategori: e.target.value }))} placeholder="Contoh: Pembelian Alat, Honorarium..."/></div>
                <div>
                  <Label>Jenis</Label>
                  <Select value={catForm.jenis} onValueChange={(v) => setCatForm((p) => ({ ...p, jenis: v as any }))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="expense">Pengeluaran</SelectItem><SelectItem value="income">Pemasukan (manual)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Warna</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        className={`w-7 h-7 rounded-md border-2 transition-transform hover:scale-110 ${catForm.warna === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                        style={{ background: c }}
                        onClick={() => setCatForm((p) => ({ ...p, warna: c }))}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={handleSaveCat} className="flex-1">{editingCat ? "Perbarui" : "Tambah"}</Button>
                  {editingCat && <Button variant="outline" onClick={() => { setEditingCat(null); setCatForm({ nama_kategori: "", jenis: "expense", warna: "#10b981", icon: "tag", urutan: 0 }); }}>Batal</Button>}
                </div>
              </div>
            </div>
            {["expense", "income"].map((jenis) => {
              const list = categories.filter((c) => c.jenis === jenis);
              return (
                <div key={jenis}>
                  <p className={`text-sm font-semibold mb-2 ${jenis === "income" ? "text-emerald-700" : "text-red-600"}`}>
                    Kategori {jenis === "income" ? "Pemasukan" : "Pengeluaran"} ({list.length})
                  </p>
                  {list.length === 0
                    ? <p className="text-xs text-gray-400 italic">Belum ada kategori</p>
                    : <div className="space-y-1.5">{list.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-white hover:bg-gray-50">
                          <div className="w-4 h-4 rounded shrink-0" style={{ background: cat.warna }}/>
                          <p className="text-sm font-medium flex-1">{cat.nama_kategori}</p>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingCat(cat); setCatForm({ nama_kategori: cat.nama_kategori, jenis: cat.jenis, warna: cat.warna, icon: cat.icon, urutan: cat.urutan ?? 0 }); }}><Edit2 size={12}/></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteCat(cat.id)}><Trash2 size={12}/></Button>
                          </div>
                        </div>
                      ))}</div>
                  }
                </div>
              );
            })}
          </div>
          <div className="px-6 py-3.5 border-t bg-white flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setCatOpen(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  );
}
