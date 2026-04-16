import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Download, Search, Calendar, FileSpreadsheet, Edit2, Trash2, AlertCircle } from "lucide-react";
import { db } from "../../../utils/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ✅ FIX: Interface pakai field DB yang benar
interface Pembayaran {
  id: string;
  siswa_id: string;
  tagihan_id: string;
  kegiatan_id: string;          // dari view v_pembayaran_lengkap
  jumlah: number;               // DB: jumlah (bukan jumlah_bayar)
  tanggal_pembayaran: string;   // DB: tanggal_pembayaran (bukan tanggal_bayar)
  bukti_pembayaran?: string;    // DB: bukti_pembayaran (bukan keterangan)
  metode_pembayaran?: string;
  // dari view join
  siswa_nama?: string;
  siswa_nis?: string;
  kelas_id?: string;
  nama_kegiatan?: string;
  created_at: string;
}

interface Kelas { id: string; nama_kelas: string; }

interface RiwayatRow {
  id: string;
  tanggal: string;
  nama_siswa: string;
  nis: string;
  kelas: string;
  nama_kegiatan: string;
  jumlah_bayar: number;
  keterangan: string;
}

export default function RiwayatPembayaran() {
  const [pembayaran, setPembayaran] = useState<Pembayaran[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [riwayat, setRiwayat] = useState<RiwayatRow[]>([]);
  const [filteredRiwayat, setFilteredRiwayat] = useState<RiwayatRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterTanggalMulai, setFilterTanggalMulai] = useState("");
  const [filterTanggalAkhir, setFilterTanggalAkhir] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPembayaran, setSelectedPembayaran] = useState<Pembayaran | null>(null);
  const [editJumlah, setEditJumlah] = useState("");
  const [editTanggal, setEditTanggal] = useState("");
  const [editKeterangan, setEditKeterangan] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPembayaran, setDeletingPembayaran] = useState<Pembayaran | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchAllData(); }, []);

  useEffect(() => {
    // ✅ FIX: buildRiwayat sekarang langsung dari data view yang sudah join
    if (pembayaran.length > 0 || kelas.length > 0) buildRiwayat();
  }, [pembayaran, kelas]);

  useEffect(() => { applyFilters(); }, [riwayat, searchQuery, filterKelas, filterTanggalMulai, filterTanggalAkhir]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [pembayaranResult, kelasResult] = await Promise.all([
        db.getPembayaran(),  // Pastikan ini mengquery v_pembayaran_lengkap
        db.getKelas(),
      ]);

      if (pembayaranResult.error) { toast.error("❌ Gagal memuat pembayaran: " + pembayaranResult.error.message); return; }
      if (kelasResult.error) { toast.error("❌ Gagal memuat kelas: " + kelasResult.error.message); return; }

      setPembayaran(pembayaranResult.data || []);
      setKelas(kelasResult.data || []);
    } catch (error) {
      toast.error("Error: " + (error instanceof Error ? error.message : "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  const buildRiwayat = () => {
    // ✅ FIX: Sekarang data sudah di-join di view, langsung baca field-nya
    const riwayatData: RiwayatRow[] = pembayaran.map((p) => {
      // Cari nama kelas
      const kelasData = kelas.find((k) => k.id === p.kelas_id);

      return {
        id: p.id,
        tanggal: p.tanggal_pembayaran,              // ✅ field DB yang benar
        nama_siswa: p.siswa_nama || "-",            // ✅ dari view join
        nis: p.siswa_nis || "-",                    // ✅ dari view join
        kelas: kelasData?.nama_kelas || "-",
        nama_kegiatan: p.nama_kegiatan || "Pembayaran", // ✅ dari view join
        jumlah_bayar: p.jumlah,                     // ✅ field DB yang benar
        keterangan: p.bukti_pembayaran || "",       // ✅ field DB yang benar
      };
    });

    riwayatData.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    setRiwayat(riwayatData);
  };

  const applyFilters = () => {
    let filtered = [...riwayat];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        r.nama_siswa.toLowerCase().includes(q) ||
        r.nis.toLowerCase().includes(q) ||
        r.nama_kegiatan.toLowerCase().includes(q) ||
        r.kelas.toLowerCase().includes(q)
      );
    }
    if (filterKelas) filtered = filtered.filter((r) => r.kelas === filterKelas);
    if (filterTanggalMulai) filtered = filtered.filter((r) => new Date(r.tanggal) >= new Date(filterTanggalMulai));
    if (filterTanggalAkhir) filtered = filtered.filter((r) => new Date(r.tanggal) <= new Date(filterTanggalAkhir));
    setFilteredRiwayat(filtered);
  };

  const openEditDialog = (p: Pembayaran) => {
    setSelectedPembayaran(p);
    // ✅ FIX: baca field DB yang benar (jumlah, tanggal_pembayaran, bukti_pembayaran)
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
      // ✅ FIX: payload menggunakan field DB yang benar
      const { error } = await db.updatePembayaran(selectedPembayaran.id, {
        jumlah: jumlahNum,
        tanggal_pembayaran: new Date(editTanggal).toISOString(),
        bukti_pembayaran: editKeterangan || null,
      });

      if (error) { toast.error(`❌ Gagal update: ${error.message}`); return; }

      await fetchAllData();
      toast.success("✅ Pembayaran diperbarui");
      setEditDialogOpen(false);
      setSelectedPembayaran(null);
    } catch (error) {
      toast.error(`❌ ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteDialog = (p: Pembayaran) => {
    setDeletingPembayaran(p);
    setDeleteDialogOpen(true);
  };

  const handleDeletePembayaran = async () => {
    if (!deletingPembayaran) return;
    setIsDeleting(true);
    try {
      const { error } = await db.deletePembayaran(deletingPembayaran.id);
      if (error) { toast.error(`❌ Gagal hapus: ${error.message}`); return; }
      await fetchAllData();
      toast.success("✅ Pembayaran dihapus");
      setDeleteDialogOpen(false);
      setDeletingPembayaran(null);
    } catch (error) {
      toast.error(`❌ ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

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

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const formatDate = (ds: string) =>
    new Date(ds).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });

  const formatDateLong = (ds: string) =>
    new Date(ds).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const getTotalPembayaran = () => filteredRiwayat.reduce((s, r) => s + r.jumlah_bayar, 0);
  const uniqueKelas = [...new Set(riwayat.map((r) => r.kelas))].sort();

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-xl text-gray-500">Memuat data...</div></div>;

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Riwayat Pembayaran</h1>
          <p className="text-gray-500 mt-1">Data pembayaran siswa secara realtime</p>
        </div>
        <Button onClick={exportToExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700" disabled={filteredRiwayat.length === 0}>
          <FileSpreadsheet className="w-4 h-4" /> Export ke Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg"><FileSpreadsheet className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Transaksi</p><p className="text-2xl font-bold">{filteredRiwayat.length}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg"><Download className="w-6 h-6 text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Total Pembayaran</p><p className="text-2xl font-bold text-green-600">{formatRupiah(getTotalPembayaran())}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg"><Calendar className="w-6 h-6 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Data Terakhir</p><p className="text-sm font-bold">{riwayat.length > 0 ? formatDateLong(riwayat[0].tanggal) : "-"}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Filter Pencarian</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Cari Nama/NIS/Kegiatan</Label>
              <Input placeholder="Ketik untuk mencari..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div>
              <Label>Filter Kelas</Label>
              <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Semua Kelas</option>
                {uniqueKelas.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <Label>Tanggal Mulai</Label>
              <Input type="date" value={filterTanggalMulai} onChange={(e) => setFilterTanggalMulai(e.target.value)} />
            </div>
            <div>
              <Label>Tanggal Akhir</Label>
              <Input type="date" value={filterTanggalAkhir} onChange={(e) => setFilterTanggalAkhir(e.target.value)} />
            </div>
          </div>
          {(searchQuery || filterKelas || filterTanggalMulai || filterTanggalAkhir) && (
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setFilterKelas(""); setFilterTanggalMulai(""); setFilterTanggalAkhir(""); }}>Reset Filter</Button>
              <span className="text-sm text-gray-500">Menampilkan {filteredRiwayat.length} dari {riwayat.length} transaksi</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Daftar Riwayat Pembayaran</CardTitle></CardHeader>
        <CardContent>
          {filteredRiwayat.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">NIS</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Siswa</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kelas</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kegiatan</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Jumlah Bayar</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Keterangan</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRiwayat.map((r, i) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(r.tanggal)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.nis}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.nama_siswa}</td>
                      <td className="px-4 py-3 text-sm text-gray-700"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{r.kelas}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.nama_kegiatan}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-green-600">{formatRupiah(r.jumlah_bayar)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{r.keterangan}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="outline"
                            onClick={() => openEditDialog(pembayaran.find((p) => p.id === r.id) as Pembayaran)}
                            className="text-blue-600 hover:text-blue-700">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => openDeleteDialog(pembayaran.find((p) => p.id === r.id) as Pembayaran)}
                            className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={6} className="px-4 py-3 text-right text-sm text-gray-700">Total:</td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">{formatRupiah(getTotalPembayaran())}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {riwayat.length === 0 ? (
                <><FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-300" /><p className="text-lg">Belum ada riwayat pembayaran</p></>
              ) : (
                <><Search className="w-16 h-16 mx-auto mb-4 text-gray-300" /><p className="text-lg">Tidak ada data sesuai filter</p>
                  <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(""); setFilterKelas(""); setFilterTanggalMulai(""); setFilterTanggalAkhir(""); }}>Reset Filter</Button></>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pembayaran</DialogTitle>
            <DialogDescription>
              {selectedPembayaran && `Edit pembayaran ${selectedPembayaran.siswa_nama || ""}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePembayaran}>
            <div className="space-y-4 py-4">
              <div><Label>Tanggal Pembayaran</Label>
                <Input type="date" value={editTanggal} onChange={(e) => setEditTanggal(e.target.value)} required />
              </div>
              <div><Label>Jumlah Bayar (Rp)</Label>
                <Input type="number" value={editJumlah} onChange={(e) => setEditJumlah(e.target.value)} required min="0" />
              </div>
              <div><Label>Keterangan</Label>
                <Input value={editKeterangan} onChange={(e) => setEditKeterangan(e.target.value)} placeholder="Catatan (opsional)" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isUpdating}>
                {isUpdating ? "Mengupdate..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" /> Hapus Pembayaran</DialogTitle>
            <DialogDescription>Tindakan ini tidak dapat dibatalkan.</DialogDescription>
          </DialogHeader>
          {deletingPembayaran && (
            <div className="bg-red-50 p-4 rounded-lg space-y-2">
              <p className="text-sm"><strong>Tanggal:</strong> {formatDateLong(deletingPembayaran.tanggal_pembayaran)}</p>
              <p className="text-sm"><strong>Jumlah:</strong> {formatRupiah(deletingPembayaran.jumlah)}</p>
              <p className="text-sm"><strong>Keterangan:</strong> {deletingPembayaran.bukti_pembayaran || "-"}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={handleDeletePembayaran} disabled={isDeleting}>
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
