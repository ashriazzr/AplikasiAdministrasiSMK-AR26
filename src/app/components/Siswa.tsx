import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Plus, Edit, Trash2, Search, Users, School, CreditCard, Upload } from "lucide-react";
import { db, type Siswa as SiswaType, type Kelas as KelasType } from "../../../utils/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Siswa extends SiswaType {}

interface Kelas extends KelasType {}

export default function Siswa() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>("all");
  const [rfidEditDialogOpen, setRfidEditDialogOpen] = useState(false);
  const [editingRFIDSiswa, setEditingRFIDSiswa] = useState<Siswa | null>(null);
  const [newRFIDValue, setNewRFIDValue] = useState("");
  const [isUpdatingRFID, setIsUpdatingRFID] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    nama: "",
    kelas_id: "",
    nis: "",
    nisn: "",
    jenis_kelamin: "",
    tanggal_lahir: "",
    alamat: "",
    asal_sekolah: "",
    rfid_card: "",
  });

  useEffect(() => {
    fetchSiswa();
    fetchKelas();
  }, []);

  const fetchSiswa = async () => {
    try {
      const { data, error } = await db.getSiswa();
      if (error) {
        toast.error("Gagal memuat data siswa: " + error.message);
        return;
      }
      setSiswaList(data || []);
    } catch (error) {
      console.error("Error fetching siswa:", error);
      toast.error("Gagal memuat data siswa");
    } finally {
      setLoading(false);
    }
  };

  const fetchKelas = async () => {
    try {
      const { data, error } = await db.getKelas();
      if (error) {
        console.error("Error fetching kelas:", error);
        return;
      }
      setKelasList(data || []);
    } catch (error) {
      console.error("Error fetching kelas:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSiswa) {
        const { error } = await db.updateSiswa(editingSiswa.id, formData);
        if (error) {
          toast.error("Gagal menyimpan data: " + error.message);
          return;
        }
        toast.success("Data berhasil diperbarui");
      } else {
        const { error } = await db.createSiswa(formData);
        if (error) {
          toast.error("Gagal menyimpan data: " + error.message);
          return;
        }
        toast.success("Data berhasil ditambahkan");
      }
      
      setDialogOpen(false);
      resetForm();
      fetchSiswa();
    } catch (error) {
      console.error("Error saving siswa:", error);
      toast.error("Terjadi kesalahan saat menyimpan data");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data siswa ini?")) return;
    
    try {
      const { error } = await db.deleteSiswa(id);
      if (error) {
        toast.error("Gagal menghapus data: " + error.message);
        return;
      }

      toast.success("Data berhasil dihapus");
      fetchSiswa();
    } catch (error) {
      console.error("Error deleting siswa:", error);
      toast.error("Terjadi kesalahan saat menghapus data");
    }
  };

  const openEditDialog = (siswa: Siswa) => {
    setEditingSiswa(siswa);
    setFormData({
      nama: siswa.nama,
      kelas_id: siswa.kelas_id,
      nis: siswa.nis,
      nisn: siswa.nisn,
      jenis_kelamin: siswa.jenis_kelamin,
      tanggal_lahir: siswa.tanggal_lahir,
      alamat: siswa.alamat,
      asal_sekolah: siswa.asal_sekolah,
      rfid_card: siswa.rfid_card || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSiswa(null);
    setFormData({
      nama: "",
      kelas_id: "",
      nis: "",
      nisn: "",
      jenis_kelamin: "",
      tanggal_lahir: "",
      alamat: "",
      asal_sekolah: "",
      rfid_card: "",
    });
  };

  const openRFIDEditDialog = (siswa: Siswa) => {
    setEditingRFIDSiswa(siswa);
    setNewRFIDValue(siswa.rfid_card || "");
    setRfidEditDialogOpen(true);
  };

  const handleRFIDUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingRFIDSiswa) {
      toast.error("Data siswa tidak lengkap");
      return;
    }

    setIsUpdatingRFID(true);
    
    try {
      // Check if new RFID is already used by another student
      if (newRFIDValue.trim() !== "") {
        const { data: existingSiswa } = await db.getSiswaByRFID(newRFIDValue.toUpperCase().trim());
        if (existingSiswa && existingSiswa.id !== editingRFIDSiswa.id) {
          toast.error(`❌ Nomor RFID sudah terdaftar ke siswa: ${existingSiswa.nama}`);
          setIsUpdatingRFID(false);
          return;
        }
      }

      const { error } = await db.updateSiswa(editingRFIDSiswa.id, {
        rfid_card: newRFIDValue.toUpperCase().trim() || "",
      });

      if (error) {
        toast.error("Gagal menyimpan RFID: " + error.message);
        setIsUpdatingRFID(false);
        return;
      }

      toast.success(`✅ RFID berhasil ${newRFIDValue ? "diperbarui" : "dihapus"}`);
      setRfidEditDialogOpen(false);
      setEditingRFIDSiswa(null);
      setNewRFIDValue("");
      fetchSiswa();
    } catch (error) {
      console.error("Error updating RFID:", error);
      toast.error("Terjadi kesalahan saat memperbarui RFID");
    } finally {
      setIsUpdatingRFID(false);
    }
  };

  const getKelasName = (kelasId: string) => {
    const kelas = kelasList.find(k => k.id === kelasId);
    return kelas?.nama_kelas || "-";
  };

  const normalizeKey = (key: string) =>
    key.toLowerCase().replace(/[^a-z0-9]/g, "");

  const pickValue = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const val = row[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
    }
    return "";
  };

  const toDateYmd = (value: unknown) => {
    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return "";
      const mm = String(parsed.m).padStart(2, "0");
      const dd = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${mm}-${dd}`;
    }

    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    const raw = String(value || "").trim();
    if (!raw) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const dd = ddmmyyyy[1].padStart(2, "0");
      const mm = ddmmyyyy[2].padStart(2, "0");
      const yyyy = ddmmyyyy[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
    return "";
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (kelasList.length === 0) {
      toast.error("Data kelas belum tersedia. Tambahkan kelas terlebih dahulu.");
      e.target.value = "";
      return;
    }

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (rawRows.length === 0) {
        toast.error("File Excel kosong atau tidak memiliki data.");
        return;
      }

      const kelasById = new Set(kelasList.map((k) => k.id));
      const kelasByName = new Map(kelasList.map((k) => [String(k.nama_kelas || "").toLowerCase(), k.id]));

      let successCount = 0;
      const failures: string[] = [];
      const generatedNisSet = new Set<string>();

      const generateUniqueNis = () => {
        let candidate = `IMP-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
        while (generatedNisSet.has(candidate)) {
          candidate = `IMP-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
        }
        generatedNisSet.add(candidate);
        return candidate;
      };

      for (let i = 0; i < rawRows.length; i++) {
        const normalizedRow: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(rawRows[i])) {
          normalizedRow[normalizeKey(key)] = val;
        }

        const nama = pickValue(normalizedRow, ["nama", "namalengkap"]);
        const nis = pickValue(normalizedRow, ["nis"]) || generateUniqueNis();
        const nisn = pickValue(normalizedRow, ["nisn"]);
        const jenisKelaminRaw = pickValue(normalizedRow, ["jeniskelamin", "gender"]);
        const tanggalLahir = toDateYmd(normalizedRow["tanggallahir"] ?? normalizedRow["tglahir"]);
        const alamat = pickValue(normalizedRow, ["alamat"]);
        const asalSekolah = pickValue(normalizedRow, ["asalsekolah", "asalsekolahasal"]);
        const rfidCard = pickValue(normalizedRow, ["rfid", "rfidcard", "uidrfid"]);

        const kelasIdInput = pickValue(normalizedRow, ["kelasid"]);
        const kelasNameInput = pickValue(normalizedRow, ["kelas", "namakelas"]);

        let kelasId = "";
        if (kelasIdInput && kelasById.has(kelasIdInput)) {
          kelasId = kelasIdInput;
        } else if (kelasNameInput) {
          kelasId = kelasByName.get(kelasNameInput.toLowerCase()) || "";
        }

        const jenisKelamin = /^l(aki)?/i.test(jenisKelaminRaw)
          ? "Laki-laki"
          : /^p(erempuan)?/i.test(jenisKelaminRaw)
            ? "Perempuan"
            : "";

        if (!nama || !kelasId || !jenisKelamin) {
          failures.push(`Baris ${i + 2}: nama, kelas, dan jenis kelamin wajib diisi`);
          continue;
        }

        const { error } = await db.createSiswa({
          nama,
          kelas_id: kelasId,
          nis,
          nisn,
          jenis_kelamin: jenisKelamin,
          tanggal_lahir: tanggalLahir,
          alamat,
          asal_sekolah: asalSekolah,
          rfid_card: rfidCard,
        });

        if (error) {
          failures.push(`Baris ${i + 2}: ${error.message}`);
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`Impor selesai. ${successCount} data siswa berhasil ditambahkan.`);
        await fetchSiswa();
      }

      if (failures.length > 0) {
        toast.error(`Ada ${failures.length} data gagal diimpor. Cek format kolom dan data kelas.`);
        console.error("Detail gagal impor siswa:", failures);
      }
    } catch (error) {
      console.error("Error importing siswa excel:", error);
      toast.error("Gagal membaca file Excel.");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

    toast.info("Format impor: wajib Nama, Kelas, dan Jenis Kelamin. Kolom lain opsional.");

  const filteredSiswa = siswaList.filter((siswa) => {
    const matchSearch = 
      siswa.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      siswa.nis.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchKelas = selectedKelasFilter === "all" || siswa.kelas_id === selectedKelasFilter;
    
    return matchSearch && matchKelas;
  });

  const groupedSiswa: Record<string, Siswa[]> = {};
  kelasList.forEach(kelas => {
    groupedSiswa[kelas.id] = siswaList.filter(siswa => siswa.kelas_id === kelas.id);
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Data Siswa</h1>
        <p className="text-gray-500 mt-1">Kelola data siswa berdasarkan kelas</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Semua Siswa</TabsTrigger>
          <TabsTrigger value="by-class">Berdasarkan Kelas</TabsTrigger>
        </TabsList>

        {/* Tab: Semua Siswa */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Daftar Siswa</CardTitle>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportExcel}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isImporting ? "Mengimpor..." : "Impor Excel"}
                  </Button>
                  <span className="text-xs text-gray-500 hidden md:inline">
                    Wajib: nama, kelas, jenis kelamin
                  </span>

                  <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Siswa
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-2xl max-h-[92vh] overflow-hidden p-0">
                    <DialogHeader className="px-6 pt-6">
                      <DialogTitle>
                        {editingSiswa ? "Edit Data Siswa" : "Tambah Data Siswa"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingSiswa ? "Perbarui informasi siswa" : "Masukkan data siswa baru"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="flex max-h-[92vh] flex-col min-h-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-4 overflow-y-auto min-h-0">
                        <div className="space-y-2">
                          <Label htmlFor="nama">Nama Lengkap</Label>
                          <Input
                            id="nama"
                            value={formData.nama}
                            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nis">NIS</Label>
                          <Input
                            id="nis"
                            value={formData.nis}
                            onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nisn">NISN</Label>
                          <Input
                            id="nisn"
                            value={formData.nisn}
                            onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="kelas">Kelas</Label>
                          <Select
                            value={formData.kelas_id}
                            onValueChange={(value) => setFormData({ ...formData, kelas_id: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih Kelas" />
                            </SelectTrigger>
                            <SelectContent>
                              {kelasList.map((kelas) => (
                                <SelectItem key={kelas.id} value={kelas.id}>
                                  {kelas.nama_kelas}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                          <Select
                            value={formData.jenis_kelamin}
                            onValueChange={(value) => setFormData({ ...formData, jenis_kelamin: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih Jenis Kelamin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                              <SelectItem value="Perempuan">Perempuan</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                          <Input
                            id="tanggal_lahir"
                            type="date"
                            value={formData.tanggal_lahir}
                            onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="alamat">Alamat</Label>
                          <Input
                            id="alamat"
                            value={formData.alamat}
                            onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="asal_sekolah">Asal Sekolah</Label>
                          <Input
                            id="asal_sekolah"
                            value={formData.asal_sekolah}
                            onChange={(e) => setFormData({ ...formData, asal_sekolah: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="rfid_card">UID RFID</Label>
                          <Input
                            id="rfid_card"
                            placeholder="Masukkan nomor UID RFID"
                            value={formData.rfid_card}
                            onChange={(e) => setFormData({ ...formData, rfid_card: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter className="px-6 py-4 border-t bg-white mt-auto">
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                          {editingSiswa ? "Perbarui" : "Simpan"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Cari berdasarkan nama atau NIS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedKelasFilter} onValueChange={setSelectedKelasFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {kelasList.map((kelas) => (
                      <SelectItem key={kelas.id} value={kelas.id}>
                        {kelas.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Memuat data...</div>
              ) : filteredSiswa.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm || selectedKelasFilter !== "all" ? "Tidak ada data yang sesuai pencarian" : "Belum ada data siswa"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-gray-700">NIS</th>
                        <th className="text-left p-3 font-medium text-gray-700">NISN</th>
                        <th className="text-left p-3 font-medium text-gray-700">Nama</th>
                        <th className="text-left p-3 font-medium text-gray-700">Kelas</th>
                        <th className="text-left p-3 font-medium text-gray-700">Asal Sekolah</th>
                        <th className="text-left p-3 font-medium text-gray-700">Jenis Kelamin</th>
                        <th className="text-right p-3 font-medium text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSiswa.map((siswa) => (
                        <tr key={siswa.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{siswa.nis}</td>
                          <td className="p-3">{siswa.nisn}</td>
                          <td className="p-3 font-medium">{siswa.nama}</td>
                          <td className="p-3">
                            <Badge variant="outline">{getKelasName(siswa.kelas_id)}</Badge>
                          </td>
                          <td className="p-3">{siswa.asal_sekolah}</td>
                          <td className="p-3">{siswa.jenis_kelamin}</td>
                          <td className="p-3">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRFIDEditDialog(siswa)}
                                title="Edit RFID Card"
                              >
                                <CreditCard className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(siswa)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(siswa.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Berdasarkan Kelas */}
        <TabsContent value="by-class">
          <div className="space-y-6">
            {kelasList.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-gray-500">
                    Belum ada data kelas. Silakan tambahkan kelas terlebih dahulu.
                  </div>
                </CardContent>
              </Card>
            ) : (
              kelasList.map((kelas) => (
                <Card key={kelas.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <School className="w-5 h-5 text-blue-600" />
                          Kelas {kelas.nama_kelas}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Wali Kelas: {kelas.wali_kelas} • Tahun Ajaran: {kelas.tingkat}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {groupedSiswa[kelas.id]?.length || 0} Siswa
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!groupedSiswa[kelas.id] || groupedSiswa[kelas.id].length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        Belum ada siswa di kelas ini
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedSiswa[kelas.id].map((siswa) => (
                          <div
                            key={siswa.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-medium text-gray-800">{siswa.nama}</h3>
                                <p className="text-sm text-gray-500">NIS: {siswa.nis}</p>
                              </div>
                              <Badge variant={siswa.jenis_kelamin === "Laki-laki" ? "default" : "secondary"}>
                                {siswa.jenis_kelamin === "Laki-laki" ? "L" : "P"}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>🎂 {new Date(siswa.tanggal_lahir).toLocaleDateString('id-ID')}</p>
                              <p className="truncate">📍 {siswa.alamat}</p>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRFIDEditDialog(siswa)}
                                className="flex-1"
                                title="Edit RFID Card"
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                RFID
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(siswa)}
                                className="flex-1"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(siswa.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* RFID Edit Dialog */}
      <Dialog open={rfidEditDialogOpen} onOpenChange={(open) => {
        setRfidEditDialogOpen(open);
        if (!open) {
          setEditingRFIDSiswa(null);
          setNewRFIDValue("");
        }
      }}>
        <DialogContent className="w-[95vw] max-w-md max-h-[92vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Edit Kartu RFID</DialogTitle>
            <DialogDescription>
              Ubah atau hapus nomor RFID untuk {editingRFIDSiswa?.nama}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRFIDUpdate} className="flex max-h-[92vh] flex-col min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <Label className="text-xs text-gray-500 block mb-2">Siswa</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg border">
                <p className="font-medium">{editingRFIDSiswa?.nama}</p>
                <p className="text-sm text-gray-600">NIS: {editingRFIDSiswa?.nis}</p>
              </div>
            </div>

            <div>
              <Label htmlFor="new_rfid">Nomor RFID (UID)*</Label>
              <Input
                id="new_rfid"
                placeholder="Masukkan nomor RFID baru atau kosongkan untuk menghapus"
                value={newRFIDValue}
                onChange={(e) => setNewRFIDValue(e.target.value.toUpperCase())}
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                {newRFIDValue ? `RFID saat ini: ${newRFIDValue}` : "Kosong - tidak memiliki RFID"}
              </p>
            </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-white mt-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRfidEditDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isUpdatingRFID}>
                {isUpdatingRFID ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}