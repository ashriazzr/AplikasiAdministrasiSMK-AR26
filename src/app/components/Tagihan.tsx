import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Edit, Trash2, AlertCircle, CheckCircle, Clock, DollarSign, FileText, Calendar, User, GraduationCap, Search } from "lucide-react";
import { db } from "../../../utils/supabase/client";
import { toast } from "sonner";

interface Kelas {
  id: string;
  nama_kelas: string;
}

interface Siswa {
  id: string;
  nama: string;
  nis: string;
  kelas_id: string;
}

// ✅ FIX #1: Field names sesuai schema DB + view v_tagihan_siswa
interface Tagihan {
  id: string;
  kegiatan_id: string;
  nama_kegiatan: string;
  nominal: number;
  batas_pembayaran: string;
  total_dibayar: number;
  sisa_bayar: number;
  status: string;
}

// ✅ FIX #2: Field names sesuai schema DB (jumlah, tanggal_pembayaran, bukti_pembayaran)
interface Pembayaran {
  id: string;
  tagihan_id: string;
  kegiatan_id: string;
  siswa_id: string;
  jumlah: number;                    // DB field (bukan jumlah_bayar)
  tanggal_pembayaran: string;        // DB field (bukan tanggal_bayar)
  bukti_pembayaran?: string;         // DB field (bukan keterangan)
  metode_pembayaran?: string;
  dicatat_oleh?: string;
  siswa?: { id: string; nama: string; nis: string; kelas_id: string };
  kegiatan?: { id: string; nama_kegiatan: string; nominal: number };
}

export default function Tagihan() {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPembayaran, setEditingPembayaran] = useState<Pembayaran | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedSiswa, setSelectedSiswa] = useState("");
  const [selectedKegiatan, setSelectedKegiatan] = useState("");
  const [searchSiswa, setSearchSiswa] = useState("");

  // ✅ FIX: State form menggunakan nama yang jelas
  const [jumlahBayar, setJumlahBayar] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggalBayar, setTanggalBayar] = useState(new Date().toISOString().split("T")[0]);
  const [metodePembayaran, setMetodePembayaran] = useState("transfer");

  useEffect(() => { fetchKelas(); }, []);

  useEffect(() => {
    if (selectedKelas) {
      fetchSiswaByKelas(selectedKelas);
      setSelectedSiswa("");
    } else {
      setSiswaList([]);
      setTagihanList([]);
      setPembayaranList([]);
    }
  }, [selectedKelas]);

  useEffect(() => {
    if (selectedSiswa && selectedKelas) {
      fetchTagihan(selectedSiswa);
      fetchPembayaran(selectedSiswa);
    }
  }, [selectedSiswa]);

  const fetchKelas = async () => {
    try {
      const { data, error } = await db.getKelas();
      if (error) { toast.error("Gagal memuat kelas: " + error.message); return; }
      setKelas(data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiswaByKelas = async (kelasId: string) => {
    const { data } = await db.getSiswaWithKelas();
    setSiswaList((data || []).filter((s: any) => s.kelas_id === kelasId));
  };

  const fetchTagihan = async (siswaId: string) => {
    // ✅ Pakai view v_tagihan_siswa yang sudah ada sisa_bayar & total_dibayar
    const { data, error } = await db.getTagihanBySiswaId(siswaId);
    if (error) { console.error("Error tagihan:", error); return; }
    setTagihanList(data || []);
  };

  const fetchPembayaran = async (siswaId: string) => {
    // ✅ Pakai view v_pembayaran_lengkap yang punya kegiatan_id
    const { data, error } = await db.getPembayaranBySiswaId(siswaId);
    if (error) { console.error("Error pembayaran:", error); return; }
    setPembayaranList(data || []);
  };

  const handleOpenDialog = (kegiatanId: string, sisaBayar: number, pembayaran?: Pembayaran) => {
    if (pembayaran) {
      setEditingPembayaran(pembayaran);
      // ✅ FIX: baca field DB yang benar
      setJumlahBayar(String(pembayaran.jumlah ?? ""));
      setKeterangan(pembayaran.bukti_pembayaran ?? "");
      setTanggalBayar(pembayaran.tanggal_pembayaran
        ? pembayaran.tanggal_pembayaran.split("T")[0]
        : new Date().toISOString().split("T")[0]);
      setMetodePembayaran(pembayaran.metode_pembayaran ?? "transfer");
    } else {
      setEditingPembayaran(null);
      setJumlahBayar(sisaBayar > 0 ? String(sisaBayar) : "");
      setKeterangan("");
      setTanggalBayar(new Date().toISOString().split("T")[0]);
      setMetodePembayaran("transfer");
    }
    setSelectedKegiatan(kegiatanId);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSiswa || !selectedKegiatan) {
      toast.error("Pilih siswa dan kegiatan terlebih dahulu");
      return;
    }

    const tagihanForKegiatan = tagihanList.find((t) => t.kegiatan_id === selectedKegiatan);
    if (!tagihanForKegiatan) {
      toast.error("Tagihan tidak ditemukan untuk kegiatan ini");
      return;
    }

    const jumlahNum = parseFloat(jumlahBayar);
    if (isNaN(jumlahNum) || jumlahNum <= 0) {
      toast.error("Jumlah bayar harus lebih dari 0");
      return;
    }

    if (!editingPembayaran && jumlahNum > tagihanForKegiatan.sisa_bayar) {
      toast.error(`Melebihi sisa tagihan! Maks: ${formatRupiah(tagihanForKegiatan.sisa_bayar)}`);
      return;
    }

    // ✅ FIX: payload menggunakan field name DB yang benar
    const payload = {
      tagihan_id: tagihanForKegiatan.id,
      siswa_id: selectedSiswa,
      jumlah: jumlahNum,                                          // DB: jumlah (bukan jumlah_bayar)
      metode_pembayaran: metodePembayaran,
      tanggal_pembayaran: new Date(tanggalBayar).toISOString(),  // DB: tanggal_pembayaran
      bukti_pembayaran: keterangan || null,                       // DB: bukti_pembayaran (bukan keterangan)
      // dicatat_oleh akan jadi NULL di database (tidak dikirim, karena expect UUID)
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
      toast.success(editingPembayaran ? "✅ Pembayaran diperbarui" : "✅ Pembayaran dicatat");
    } catch (error) {
      toast.error(`❌ ${error instanceof Error ? error.message : "Terjadi kesalahan"}`);
    }
  };

  const handleDeletePembayaran = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await db.deletePembayaran(deleteTargetId);
      if (error) throw new Error(error.message);
      await Promise.all([fetchTagihan(selectedSiswa), fetchPembayaran(selectedSiswa)]);
      toast.success("✅ Pembayaran dihapus");
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(`❌ ${error instanceof Error ? error.message : "Gagal menghapus"}`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Memuat data...</p>
      </div>
    </div>
  );

  // ✅ Helper functions HARUS di-define SEBELUM digunakan
  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("id-ID", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric",
        weekday: "short"
      });
    } catch {
      return "—";
    }
  };

  // ✅ Filter students berdasarkan search input
  const filteredSiswa = siswaList.filter((s) => {
    const searchLower = searchSiswa.toLowerCase().trim();
    if (!searchLower) return true;
    return (
      s.nama.toLowerCase().includes(searchLower) ||
      s.nis.toLowerCase().includes(searchLower)
    );
  });

  const selectedSiswaData = siswaList.find((s) => s.id === selectedSiswa);
  const totalTagihan = tagihanList.reduce((sum, t) => sum + t.nominal, 0);
  const totalTerbayar = tagihanList.reduce((sum, t) => sum + t.total_dibayar, 0);
  const totalSisa = tagihanList.reduce((sum, t) => sum + t.sisa_bayar, 0);

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-2.5">
      <div className="max-w-7xl mx-auto h-full flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-1.5 shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <FileText className="w-5 h-5 text-blue-600" />
            <h1 className="text-[28px] md:text-[32px] leading-tight font-bold text-gray-900">Daftar Tagihan & Pembayaran</h1>
          </div>
          <p className="text-xs md:text-sm text-gray-600">Kelola pembayaran siswa dengan mudah dan transparan</p>
        </div>

        {/* Filter Section */}
        <Card className="mb-1 shadow-sm border-0 shrink-0 gap-0">
          <CardHeader className="pt-1 pb-0 px-3">
            <CardTitle className="text-sm text-gray-800">Pilih Siswa</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-1 [&:last-child]:pb-1">
            <div className="flex flex-col md:flex-row md:items-end md:space-x-1.5 gap-1">
              <div className="flex-1">
                <Label htmlFor="kelas-select" className="text-[11px] font-semibold text-gray-700 mb-0.5 block">
                  <GraduationCap className="w-4 h-4 inline mr-2" />
                  Kelas
                </Label>
                <select
                  id="kelas-select"
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="w-full px-2.5 py-1 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white h-[30px]"
                >
                  <option value="">Pilih Kelas... </option>
                  {kelas.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kelas}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <Label htmlFor="nama-siswa" className="text-[11px] font-semibold text-gray-700 mb-0.5 block">
                  <User className="w-4 h-4 inline mr-2" />
                  Nama Siswa
                </Label>
                <select
                  id="nama-siswa"
                  value={selectedSiswa}
                  onChange={(e) => setSelectedSiswa(e.target.value)}
                  disabled={!selectedKelas || filteredSiswa.length === 0}
                  className="w-full px-2.5 py-1 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed mt-0.5 h-[30px]"
                >
                  <option value="">Pilih siswa...</option>
                  {filteredSiswa.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.nis})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <Label htmlFor="cari-siswa" className="text-[11px] font-semibold text-gray-700 mb-0.5 block">
                  <Search className="w-4 h-4 inline mr-2" />
                  Cari Siswa (Nama / NIS)
                </Label>
                <Input
                  id="cari-siswa"
                  type="text"
                  value={searchSiswa}
                  onChange={(e) => setSearchSiswa(e.target.value)}
                  placeholder="Ketik nama atau NIS siswa..."
                  disabled={!selectedKelas}
                  className="w-full px-2.5 py-1 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed h-[30px]"
                />
              </div>
            </div>

            {/* Hasil pencarian - ditampilkan sebagai list ketika ada search */}
            {selectedKelas && searchSiswa && filteredSiswa.length > 0 && (
              <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700 font-semibold mb-2">
                  Ditemukan {filteredSiswa.length} siswa:
                </p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {filteredSiswa.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSiswa(s.id);
                        setSearchSiswa("");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-blue-100 border border-blue-100 hover:border-blue-300 transition-colors text-sm"
                    >
                      <div className="font-medium text-gray-900">{s.nama}</div>
                      <div className="text-xs text-gray-500">{s.nis}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedKelas && searchSiswa && filteredSiswa.length === 0 && (
              <div className="mt-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                ⚠️ Tidak ada siswa yang cocok dengan: <span className="font-semibold">"{searchSiswa}"</span>
              </div>
            )}

            {/* Info siswa dipadatkan ke summary cards agar area daftar lebih tinggi */}
          </CardContent>
        </Card>

        {/* Summary Strip */}
        {selectedSiswa && (
          <div className="mb-0.5 shrink-0 rounded-lg border border-gray-200 bg-white/90 px-2.5 py-1.5 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1 text-xs">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500">Siswa</p>
                <p className="font-semibold text-slate-800 truncate">{selectedSiswaData?.nama}</p>
              </div>
              <div>
                <p className="text-[10px] text-violet-500">Total Tagihan</p>
                <p className="font-semibold text-violet-800">{formatRupiah(totalTagihan)}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-600">Terbayar</p>
                <p className="font-semibold text-emerald-800">{formatRupiah(totalTerbayar)}</p>
              </div>
              <div>
                <p className={`text-[10px] ${totalSisa === 0 ? "text-emerald-600" : "text-orange-600"}`}>Sisa Bayar</p>
                <p className={`font-semibold ${totalSisa === 0 ? "text-emerald-800" : "text-orange-800"}`}>{formatRupiah(totalSisa)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-0">
        {selectedSiswa ? (
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-1.5 min-h-0">
            {/* Tagihan Column */}
            <div className="lg:col-span-2 min-h-0">
              <Card className="h-full shadow-md border-0 flex flex-col gap-1.5">
                <CardHeader className="border-b border-gray-100 pb-1.5 pt-2 px-3.5 shrink-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Daftar Tagihan ({tagihanList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1.5 px-3.5 pb-2 [&:last-child]:pb-2 flex-1 min-h-0">
                  {tagihanList.length > 0 ? (
                    <div className="space-y-2 h-full overflow-y-auto pr-1">
                      {tagihanList.map((tagihan) => {
                        const paymentPercentage = tagihan.nominal > 0 ? (tagihan.total_dibayar / tagihan.nominal) * 100 : 0;
                        const isFullyPaid = tagihan.sisa_bayar === 0;

                        return (
                          <div
                            key={tagihan.kegiatan_id}
                            className={`p-3 border-2 rounded-lg transition-all hover:shadow-sm ${
                              isFullyPaid
                                ? "border-green-200 bg-green-50/30"
                                : "border-gray-200 bg-white hover:border-blue-300"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 text-base">
                                  {tagihan.nama_kegiatan}
                                </h3>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  Nominal: {formatRupiah(tagihan.nominal)}
                                </p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-4 ${
                                isFullyPaid
                                  ? "bg-green-200 text-green-800"
                                  : "bg-yellow-200 text-yellow-800"
                              }`}>
                                {isFullyPaid ? "✓ LUNAS" : `Sisa ${formatRupiah(tagihan.sisa_bayar)}`}
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-600">Progres Pembayaran</span>
                                <span className="text-xs font-semibold text-gray-900">{Math.round(paymentPercentage)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Payment Details */}
                            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                              <div className="bg-gray-50 p-2 rounded">
                                <div className="text-gray-600 font-medium">Total</div>
                                <div className="font-bold text-gray-900">{formatRupiah(tagihan.nominal)}</div>
                              </div>
                              <div className="bg-green-50 p-2 rounded">
                                <div className="text-green-700 font-medium">Terbayar</div>
                                <div className="font-bold text-green-900">{formatRupiah(tagihan.total_dibayar)}</div>
                              </div>
                              <div className="bg-orange-50 p-2 rounded">
                                <div className="text-orange-700 font-medium">Sisa</div>
                                <div className="font-bold text-orange-900">{formatRupiah(tagihan.sisa_bayar)}</div>
                              </div>
                            </div>

                            {/* Action Button */}
                            {tagihan.sisa_bayar > 0 && (
                              <Button
                                onClick={() => handleOpenDialog(tagihan.kegiatan_id, tagihan.sisa_bayar)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5"
                              >
                                Bayar Tagihan
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Tidak ada tagihan untuk siswa ini</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment History Column */}
            <div className="min-h-0">
              <Card className="h-full shadow-md border-0 flex flex-col gap-1.5">
                <CardHeader className="border-b border-gray-100 pb-1.5 pt-2 px-3.5 shrink-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5 text-green-600" />
                    Riwayat Pembayaran ({pembayaranList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1.5 px-3.5 pb-2 [&:last-child]:pb-2 flex-1 min-h-0">
                  {pembayaranList.length > 0 ? (
                    <div className="space-y-2 h-full overflow-y-auto pr-1">
                      {pembayaranList.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {(p as any).nama_kegiatan || p.kegiatan?.nama_kegiatan || "Kegiatan"}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {formatDate(p.tanggal_pembayaran)}
                              </p>
                            </div>
                            <div className="hidden group-hover:flex gap-1 ml-2 flex-shrink-0">
                              <button
                                onClick={() => handleOpenDialog(p.kegiatan_id, 0, p)}
                                className="p-1 text-blue-600 hover:bg-blue-200 rounded"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteTargetId(p.id);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="p-1 text-red-600 hover:bg-red-200 rounded"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-green-700 mb-1">
                            {formatRupiah(p.jumlah)}
                          </div>
                          {p.bukti_pembayaran && (
                            <p className="text-xs text-gray-500 italic">"{p.bukti_pembayaran}"</p>
                          )}
                          <div className="text-xs text-gray-500 mt-1.5">
                            Metode: {p.metode_pembayaran || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm font-medium">Belum ada pembayaran</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="h-full shadow-md border-0">
            <CardContent className="flex flex-col items-center justify-center h-full py-8">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Pilih Siswa untuk Melihat Tagihan</h3>
              <p className="text-gray-500 text-center max-w-sm">
                Gunakan filter di atas untuk memilih kelas dan siswa guna melihat detil tagihan serta riwayat pembayaran
              </p>
            </CardContent>
          </Card>
        )}
        </div>

        {/* Dialog: Pembayaran Baru/Edit */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingPembayaran ? "Edit Pembayaran" : "Input Pembayaran Baru"}
              </DialogTitle>
              {selectedSiswaData && (
                <DialogDescription className="text-base text-gray-900 font-semibold mt-2">
                  {selectedSiswaData.nama}
                </DialogDescription>
              )}
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tanggal" className="text-sm font-semibold text-gray-700">
                  Tanggal Pembayaran
                </Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={tanggalBayar}
                  onChange={(e) => setTanggalBayar(e.target.value)}
                  required
                  className="mt-1 border-2 border-gray-200 focus:border-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="jumlah" className="text-sm font-semibold text-gray-700">
                  Jumlah Bayar (Rp)
                </Label>
                <Input
                  id="jumlah"
                  type="number"
                  value={jumlahBayar}
                  onChange={(e) => setJumlahBayar(e.target.value)}
                  placeholder="0"
                  required
                  min="1"
                  className="mt-1 border-2 border-gray-200 focus:border-blue-500"
                />
              </div>
              <div>
                <Label htmlFor="metode" className="text-sm font-semibold text-gray-700">
                  Metode Pembayaran
                </Label>
                <select
                  id="metode"
                  value={metodePembayaran}
                  onChange={(e) => setMetodePembayaran(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="transfer">Transfer Bank</option>
                  <option value="tunai">Tunai</option>
                  <option value="qris">QRIS</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <Label htmlFor="keterangan" className="text-sm font-semibold text-gray-700">
                  Keterangan (Opsional)
                </Label>
                <Input
                  id="keterangan"
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Catatan, nomor referensi, atau bukti pembayaran"
                  className="mt-1 border-2 border-gray-200 focus:border-blue-500"
                />
              </div>
              <DialogFooter className="gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-gray-300"
                >
                  Batal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingPembayaran ? "Perbarui Pembayaran" : "Simpan Pembayaran"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog: Confirm Delete */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" /> Hapus Pembayaran?
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-600 text-sm">
              Anda yakin ingin menghapus data pembayaran ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <DialogFooter className="gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                className="border-gray-300"
              >
                Batal
              </Button>
              <Button variant="destructive" onClick={handleDeletePembayaran} className="bg-red-600 hover:bg-red-700">
                Hapus Pembayaran
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
