import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { CreditCard, User, Wallet, CheckCircle, XCircle, Radio, AlertCircle, Pencil, Trash2, ReceiptText } from "lucide-react";
import { db } from "../../../utils/supabase/client";
import { toast } from "sonner";
import { useRFID } from "../contexts/RFIDContext";

interface Siswa {
  id: string;
  nama: string;
  nis: string;
  kelas_id: string;
  kelas_nama: string;
  jenis_kelamin: string;
  tanggal_lahir: string;
  alamat: string;
  rfid_card: string;
}

interface Tagihan {
  kegiatan_id: string;
  nama_kegiatan: string;
  nominal: number;
  batas_pembayaran: string;
  total_dibayar: number;
  sisa_bayar: number;
  status: string;
}

interface Transaksi {
  id: string;
  tagihan_id: string;
  nama_kegiatan: string;
  jumlah_bayar: number;
  tanggal_bayar: string;
  keterangan: string;
  metode_pembayaran: string;
}

export default function RFIDScanner() {
  const { portStatus, connectToSerialPort, disconnectSerialPort } = useRFID();
  const [siswaData, setSiswaData] = useState<Siswa | null>(null);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [manualCardId, setManualCardId] = useState("");
  const [allSiswa, setAllSiswa] = useState<Siswa[]>([]);
  
  // Register card dialog states
  const [registerCardDialogOpen, setRegisterCardDialogOpen] = useState(false);
  const [unregisteredCardId, setUnregisteredCardId] = useState("");
  const [selectedSiswaForCard, setSelectedSiswaForCard] = useState<string>("");
  const [isRegisteringCard, setIsRegisteringCard] = useState(false);
  
  // Payment dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedKegiatan, setSelectedKegiatan] = useState<Tagihan | null>(null);
  const [jumlahBayar, setJumlahBayar] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggalBayar, setTanggalBayar] = useState(new Date().toISOString().split('T')[0]);

  // Edit transaction dialog states
  const [editTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaksi | null>(null);
  const [editJumlahBayar, setEditJumlahBayar] = useState("");
  const [editKeterangan, setEditKeterangan] = useState("");
  const [editTanggalBayar, setEditTanggalBayar] = useState("");

  const refreshSiswaKeuangan = async (siswaId: string) => {
    const [tagihanResult, pembayaranResult] = await Promise.all([
      db.getTagihanBySiswaId(siswaId),
      db.getPembayaranBySiswaId(siswaId),
    ]);

    const tagihanData = tagihanResult.data || [];
    const pembayaranData = pembayaranResult.data || [];

    const mappedTagihan = tagihanData.map((t: any) => ({
      kegiatan_id: t.id,
      nama_kegiatan: t.nama_kegiatan || `Tagihan Bulan ${t.bulan || '-'}/${t.tahun || '-'}`,
      nominal: t.nominal ?? t.jumlah ?? 0,
      batas_pembayaran: t.batas_pembayaran || t.tanggal_jatuh_tempo,
      total_dibayar: t.total_dibayar ?? 0,
      sisa_bayar: t.sisa_bayar ?? (t.nominal ?? t.jumlah ?? 0),
      status: t.status,
    }));

    const mappedTransaksi = pembayaranData.map((p: any) => ({
      id: p.id,
      tagihan_id: p.tagihan_id,
      nama_kegiatan: p.nama_kegiatan || "Pembayaran",
      jumlah_bayar: p.jumlah_bayar ?? p.jumlah ?? 0,
      tanggal_bayar: p.tanggal_bayar ?? p.tanggal_pembayaran,
      keterangan: p.keterangan ?? p.bukti_pembayaran ?? "RFID Scanner",
      metode_pembayaran: p.metode_pembayaran ?? "RFID",
    }));

    setTagihanList(mappedTagihan);
    setTransaksiList(mappedTransaksi);
  };

  // Listen for card detection events from context
  useEffect(() => {
    const handleCardDetected = (event: Event) => {
      const customEvent = event as CustomEvent<{ cardId: string }>;
      const cardId = customEvent.detail.cardId;
      loadSiswaByRFID(cardId);
    };

    window.addEventListener("rfidCardDetected", handleCardDetected);
    return () => window.removeEventListener("rfidCardDetected", handleCardDetected);
  }, []);

  const loadSiswaByRFID = async (cardId: string) => {
    try {
      const normalizedCardId = cardId.toUpperCase().trim();
      console.log("Loading siswa for RFID:", cardId, "-> normalized:", normalizedCardId);

      // Get siswa by RFID card using db helper
      const { data: siswaResult, error: siswaError } = await db.getSiswaByRFID(normalizedCardId);

      if (siswaError) {
        console.error("Error fetching siswa:", siswaError);
        toast.error(`❌ Kartu RFID "${normalizedCardId}" tidak terdaftar`);
        setUnregisteredCardId(normalizedCardId);
        setRegisterCardDialogOpen(true);
        
        // Fetch only siswa without RFID for registration
        const { data: allSiswaData } = await db.getSiswa();
        const siswaWithoutRFID = (allSiswaData || []).filter(s => !s.rfid_card || s.rfid_card.trim() === "");
        setAllSiswa(siswaWithoutRFID);
        return;
      }

      if (!siswaResult) {
        toast.error(`❌ Kartu RFID "${normalizedCardId}" tidak terdaftar`);
        setUnregisteredCardId(normalizedCardId);
        setRegisterCardDialogOpen(true);
        
        // Fetch only siswa without RFID for registration
        const { data: allSiswaData } = await db.getSiswa();
        const siswaWithoutRFID = (allSiswaData || []).filter(s => !s.rfid_card || s.rfid_card.trim() === "");
        setAllSiswa(siswaWithoutRFID);
        return;
      }

      // Get kelas data for siswa
      const { data: kelasResult } = await db.getKelasById(siswaResult.kelas_id);
      const kelasNama = kelasResult?.nama_kelas || "Unknown";

      // Set siswa data with kelas name
      setSiswaData({
        ...siswaResult,
        kelas_nama: kelasNama,
      });

      // Get tagihan and transaksi for this siswa
      try {
        await refreshSiswaKeuangan(siswaResult.id);
        
        // Log RFID scan to database
        try {
          await db.createRFIDLogWithHandle({
            rfid_card: normalizedCardId,
            siswa_id: siswaResult.id,
            tipe_scan: "lihat_tagihan",
            tanggal: new Date().toISOString().split("T")[0],
          });
          console.log("✅ RFID scan logged successfully");
        } catch (logErr) {
          console.warn("Warning: Could not log RFID scan:", logErr);
        }
        
        toast.success(`✅ Selamat datang, ${siswaResult.nama}!`);
      } catch (err) {
        console.warn("Error loading tagihan:", err);
        setTagihanList([]);
        setTransaksiList([]);
        
        // Still log the scan even if tagihan fails
        try {
          const { data: siswaData } = await db.getSiswaById(siswaResult.id);
          if (siswaData) {
            await db.createRFIDLogWithHandle({
              rfid_card: normalizedCardId,
              siswa_id: siswaResult.id,
              tipe_scan: "masuk",
              tanggal: new Date().toISOString().split("T")[0],
            });
          }
        } catch (logErr2) {
          console.warn("Warning: Could not log RFID scan:", logErr2);
        }
      }
    } catch (error) {
      console.error("Error in loadSiswaByRFID:", error);
      toast.error(`❌ Gagal memuat data siswa: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleRegisterCard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSiswaForCard) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }
    
    setIsRegisteringCard(true);
    
    try {
      const { error } = await db.updateSiswa(selectedSiswaForCard, {
        rfid_card: unregisteredCardId,
      });

      if (error) {
        toast.error(`❌ Gagal mendaftarkan kartu: ${error.message}`);
        return;
      }

      toast.success(`✅ Kartu ${unregisteredCardId} berhasil didaftarkan ke siswa ini`);
      setRegisterCardDialogOpen(false);
      // Automatic scan with registered card
      loadSiswaByRFID(unregisteredCardId);
    } catch (error) {
      console.error("Error registering card:", error);
      toast.error("❌ Terjadi kesalahan saat mendaftarkan kartu");
    } finally {
      setIsRegisteringCard(false);
    }
  };

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCardId.trim()) {
      toast.error("Masukkan nomor kartu RFID");
      return;
    }
    
    setManualCardId("");
    loadSiswaByRFID(manualCardId);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!siswaData || !selectedKegiatan) {
      toast.error("Data tidak lengkap");
      return;
    }
    
    const jumlahBayarNum = parseFloat(jumlahBayar);
    if (isNaN(jumlahBayarNum) || jumlahBayarNum <= 0) {
      toast.error("Jumlah bayar tidak valid");
      return;
    }
    
    if (jumlahBayarNum > selectedKegiatan.sisa_bayar) {
      toast.error(`Pembayaran melebihi sisa tagihan! Max: Rp ${formatRupiah(selectedKegiatan.sisa_bayar)}`);
      return;
    }
    
    try {
      const { error } = await db.createPembayaran({
        tagihan_id: selectedKegiatan.kegiatan_id,
        siswa_id: siswaData.id,
        jumlah: jumlahBayarNum,
        metode_pembayaran: "RFID",
        tanggal_pembayaran: new Date(tanggalBayar).toISOString(),
        bukti_pembayaran: keterangan.trim() || "RFID Scanner",
      });

      if (error) {
        toast.error(`❌ Gagal menyimpan pembayaran: ${error.message}`);
        return;
      }

      // Log payment transaction
      try {
        await db.createRFIDLogWithHandle({
          rfid_card: siswaData.rfid_card,
          siswa_id: siswaData.id,
          tipe_scan: "lihat_tagihan",
          tanggal: new Date(tanggalBayar).toISOString().split("T")[0],
        });
      } catch (logErr) {
        console.warn("Warning: Could not log payment transaction:", logErr);
      }

      toast.success("✅ Pembayaran berhasil dicatat!");
      setPaymentDialogOpen(false);
      
      // Refresh tagihan and transaksi with updated data
      await refreshSiswaKeuangan(siswaData.id);
      
      // Reset form
      setJumlahBayar("");
      setKeterangan("");
      setTanggalBayar(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error(`❌ Terjadi kesalahan saat menyimpan pembayaran: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const resetScanner = () => {
    setSiswaData(null);
    setTagihanList([]);
    setTransaksiList([]);
    setPaymentDialogOpen(false);
    setEditTransactionDialogOpen(false);
    setSelectedTransaction(null);
  };

  const openEditTransactionDialog = (transaksi: Transaksi) => {
    setSelectedTransaction(transaksi);
    setEditJumlahBayar(transaksi.jumlah_bayar.toString());
    setEditKeterangan(transaksi.keterangan || "");
    setEditTanggalBayar(new Date(transaksi.tanggal_bayar).toISOString().split("T")[0]);
    setEditTransactionDialogOpen(true);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTransaction || !siswaData) {
      toast.error("Data transaksi tidak lengkap");
      return;
    }

    const jumlahNum = Number(editJumlahBayar);
    if (!Number.isFinite(jumlahNum) || jumlahNum <= 0) {
      toast.error("Jumlah pembayaran tidak valid");
      return;
    }

    const { error } = await db.updatePembayaran(selectedTransaction.id, {
      jumlah: jumlahNum,
      tanggal_pembayaran: new Date(editTanggalBayar).toISOString(),
      bukti_pembayaran: editKeterangan.trim() || "RFID Scanner",
      metode_pembayaran: "RFID",
    });

    if (error) {
      toast.error(`❌ Gagal memperbarui transaksi: ${error.message}`);
      return;
    }

    toast.success("✅ Transaksi berhasil diperbarui");
    setEditTransactionDialogOpen(false);
    setSelectedTransaction(null);
    await refreshSiswaKeuangan(siswaData.id);
  };

  const handleDeleteTransaction = async (transaksi: Transaksi) => {
    if (!siswaData) return;

    const confirmed = confirm(`Hapus transaksi ${transaksi.nama_kegiatan} sebesar ${formatRupiah(transaksi.jumlah_bayar)}?`);
    if (!confirmed) return;

    const { error } = await db.deletePembayaran(transaksi.id);
    if (error) {
      toast.error(`❌ Gagal menghapus transaksi: ${error.message}`);
      return;
    }

    toast.success("✅ Transaksi berhasil dihapus");
    await refreshSiswaKeuangan(siswaData.id);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Radio className="w-8 h-8 text-blue-600" />
          RFID Scanner
        </h1>
        <p className="text-gray-500 mt-1">Sistem pemindaian kartu siswa untuk pembayaran</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Connection Status */}
        <Card className={`border-2 ${portStatus === "connected" ? "border-green-500 bg-green-50" : portStatus === "connecting" ? "border-yellow-500 bg-yellow-50" : "border-red-500 bg-red-50"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Status Koneksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold flex items-center gap-2">
              {portStatus === "connected" ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600">Terhubung</span>
                </>
              ) : portStatus === "connecting" ? (
                <>
                  <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-yellow-600">Menghubungkan...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-600">Terputus</span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">COM7 @ 9600 baudrate</p>
          </CardContent>
        </Card>

        {/* Control Buttons */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kontrol Koneksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={connectToSerialPort}
              disabled={portStatus === "connected" || portStatus === "connecting"}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Hubungkan Arduino
            </Button>
            <Button
              onClick={disconnectSerialPort}
              disabled={portStatus === "disconnected"}
              variant="destructive"
              className="w-full"
            >
              Putus Koneksi
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Informasi</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-600 space-y-2">
            <p>✓ Koneksi tetap aktif meski berganti halaman</p>
            <p>✓ Klik "Putus Koneksi" untuk memutus</p>
            <p>✓ Pastikan Arduino di COM7</p>
          </CardContent>
        </Card>
      </div>

      {/* Manual Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Input Manual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualScan} className="space-y-4">
            <div>
              <Label htmlFor="manualCard">Nomor Kartu RFID</Label>
              <Input
                id="manualCard"
                placeholder="Masukkan nomor kartu RFID"
                value={manualCardId}
                onChange={(e) => setManualCardId(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
              Cari Siswa
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Student Data Section */}
      {siswaData && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Data Siswa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs text-gray-500">Nama Lengkap</Label>
                  <p className="text-lg font-bold">{siswaData.nama}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">NIS</Label>
                  <p className="text-lg font-bold">{siswaData.nis}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Kelas</Label>
                  <p className="text-lg font-bold">{siswaData.kelas_nama}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Jenis Kelamin</Label>
                  <p className="text-lg font-bold">{siswaData.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Tanggal Lahir</Label>
                  <p className="text-lg font-bold">{formatDate(siswaData.tanggal_lahir)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Alamat</Label>
                  <p className="text-lg font-bold">{siswaData.alamat}</p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={resetScanner}
                className="w-full mt-6"
              >
                Reset Scanner
              </Button>
            </CardContent>
          </Card>

          {/* Tagihan List */}
          {tagihanList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Daftar Tagihan ({tagihanList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tagihanList.map((tagihan) => (
                    <div
                      key={tagihan.kegiatan_id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg">{tagihan.nama_kegiatan}</h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          tagihan.sisa_bayar <= 0
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {tagihan.sisa_bayar <= 0 ? "LUNAS" : "BELUM LUNAS"}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Nominal</p>
                          <p className="font-bold">{formatRupiah(tagihan.nominal)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Sudah Dibayar</p>
                          <p className="font-bold text-green-600">{formatRupiah(tagihan.total_dibayar)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Sisa Tagihan</p>
                          <p className="font-bold text-red-600">{formatRupiah(tagihan.sisa_bayar)}</p>
                        </div>
                      </div>

                      {tagihan.sisa_bayar > 0 && (
                        <Button
                          onClick={() => {
                            setSelectedKegiatan(tagihan);
                            setJumlahBayar(tagihan.sisa_bayar.toString());
                            setPaymentDialogOpen(true);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          Bayar Sekarang
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5" />
                Riwayat Transaksi ({transaksiList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transaksiList.length === 0 ? (
                <div className="text-sm text-gray-500">Belum ada transaksi pembayaran untuk siswa ini.</div>
              ) : (
                <div className="space-y-3">
                  {transaksiList.map((transaksi) => (
                    <div key={transaksi.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900">{transaksi.nama_kegiatan}</p>
                          <p className="text-sm text-gray-500">Tanggal: {formatDate(transaksi.tanggal_bayar)}</p>
                          <p className="text-sm text-gray-500">Metode: {transaksi.metode_pembayaran}</p>
                          <p className="text-sm text-gray-500">Keterangan: {transaksi.keterangan || "-"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-green-700 min-w-[140px] text-left md:text-right">{formatRupiah(transaksi.jumlah_bayar)}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditTransactionDialog(transaksi)}
                            title="Edit transaksi"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteTransaction(transaksi)}
                            title="Hapus transaksi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Register Card Dialog */}
      <Dialog open={registerCardDialogOpen} onOpenChange={setRegisterCardDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[92vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Daftarkan Kartu RFID</DialogTitle>
            <DialogDescription>
              Kartu <strong>{unregisteredCardId}</strong> belum terdaftar ke siswa manapun. Pilih siswa untuk ditugaskan ke kartu ini.
            </DialogDescription>
          </DialogHeader>

            <div className="flex flex-col max-h-[92vh] min-h-0">
            {allSiswa.length === 0 ? (
              <div className="space-y-4 px-6 py-4">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Semua siswa sudah memiliki RFID</p>
                  <p className="text-xs text-yellow-700 mt-1">Jika ingin mengganti RFID siswa, silakan gunakan menu Edit di Siswa Management.</p>
                </div>
              </div>
                <DialogFooter className="px-6 py-4 border-t bg-white mt-auto">
                  <Button onClick={() => setRegisterCardDialogOpen(false)} variant="outline" className="w-full">
                    Tutup
                  </Button>
                </DialogFooter>
            </div>
          ) : (
              <form onSubmit={handleRegisterCard} className="flex flex-col min-h-0">
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
                <div>
                <Label>Pilih Siswa*</Label>
                <select
                  value={selectedSiswaForCard}
                  onChange={(e) => setSelectedSiswaForCard(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Pilih siswa --</option>
                  {allSiswa.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} (NIS: {s.nis})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{allSiswa.length} siswa tersedia tanpa RFID</p>
              </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t bg-white mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRegisterCardDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isRegisteringCard || !selectedSiswaForCard}>
                  {isRegisteringCard ? "Mendaftarkan..." : "Daftarkan Kartu"}
                </Button>
              </DialogFooter>
            </form>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[92vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Proses Pembayaran</DialogTitle>
            <DialogDescription>
              {siswaData?.nama} - {selectedKegiatan?.nama_kegiatan}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePaymentSubmit} className="flex max-h-[92vh] flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <Label>Tanggal Pembayaran</Label>
              <Input
                type="date"
                value={tanggalBayar}
                onChange={(e) => setTanggalBayar(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Jumlah Bayar (Rp)</Label>
              <Input
                type="number"
                value={jumlahBayar}
                onChange={(e) => setJumlahBayar(e.target.value)}
                placeholder="0"
                required
              />
              {selectedKegiatan && (
                <p className="text-xs text-gray-500 mt-1">
                  Maksimal: {formatRupiah(selectedKegiatan.sisa_bayar)}
                </p>
              )}
            </div>

            <div>
              <Label>Keterangan (Opsional)</Label>
              <Input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Catatan pembayaran"
              />
            </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-white mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">Simpan Pembayaran</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editTransactionDialogOpen} onOpenChange={setEditTransactionDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[92vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Edit Transaksi Pembayaran</DialogTitle>
            <DialogDescription>
              {siswaData?.nama} - {selectedTransaction?.nama_kegiatan}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateTransaction} className="flex max-h-[92vh] flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <Label>Tanggal Pembayaran</Label>
              <Input
                type="date"
                value={editTanggalBayar}
                onChange={(e) => setEditTanggalBayar(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Jumlah Bayar (Rp)</Label>
              <Input
                type="number"
                value={editJumlahBayar}
                onChange={(e) => setEditJumlahBayar(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label>Keterangan (Opsional)</Label>
              <Input
                type="text"
                value={editKeterangan}
                onChange={(e) => setEditKeterangan(e.target.value)}
                placeholder="Catatan pembayaran"
              />
            </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-white mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTransactionDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
