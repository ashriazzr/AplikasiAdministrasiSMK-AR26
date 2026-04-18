import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Checkbox } from "./ui/checkbox";
import { Plus, Edit, Trash2, Search, Users, BookOpen, AlertCircle, CreditCard, Gift, Award, ShieldCheck, Upload } from "lucide-react";
import { db, type Siswa as SiswaType, type Kelas as KelasType, type KegiatanAdministrasi as KegiatanType, type BeasiswaAdministrasi as BeasiswaType } from "../../../utils/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Siswa extends SiswaType {
  kelas?: {
    id: string;
    nama_kelas?: string;
  };
}

interface Kelas extends KelasType {
  siswaCount?: number;
  kelas?: string;
  jurusan?: string;
  tahun_ajaran?: string;
}

interface Beasiswa extends BeasiswaType {
  siswa_ids?: string[];
  kegiatan_ids?: string[];
  siswa_list?: Siswa[];
  kegiatan_list?: KegiatanType[];
}

export default function Rombel() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [kegiatanList, setKegiatanList] = useState<KegiatanType[]>([]);
  const [administrasiList, setAdministrasiList] = useState<any[]>([]);
  const [beasiswaList, setBeasiswaList] = useState<Beasiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKelas, setSelectedKelas] = useState<Kelas | null>(null);
  const [hasUserSelectedKelas, setHasUserSelectedKelas] = useState(false);
  const [beasiswaSearchSiswa, setBeasiswaSearchSiswa] = useState("");
  const [beasiswaSearchKegiatan, setBeasiswaSearchKegiatan] = useState("");
  const [isImportingSiswa, setIsImportingSiswa] = useState(false);
  const siswaImportRef = useRef<HTMLInputElement | null>(null);

  // Dialog states
  const [siswaDialogOpen, setSiswaDialogOpen] = useState(false);
  const [kelasDialogOpen, setKelasDialogOpen] = useState(false);
  const [beasiswaDialogOpen, setBeasiswaDialogOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [editingBeasiswa, setEditingBeasiswa] = useState<Beasiswa | null>(null);

  // Form states
  const [siswaForm, setSiswaForm] = useState({
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

  const [kelasForm, setKelasForm] = useState({
    kelas: "",
    jurusan: "",
    tahun_ajaran: "",
    wali_kelas: "",
    tingkat: "",
  });

  const [beasiswaForm, setBeasiswaForm] = useState({
    nama_program: "",
    deskripsi: "",
    aktif: true,
    siswa_ids: [] as string[],
    kegiatan_ids: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedKelas) return;

    const isStillExists = kelasList.some((kelas) => kelas.id === selectedKelas.id);
    if (!isStillExists) {
      setSelectedKelas(null);
      setHasUserSelectedKelas(false);
    }
  }, [kelasList, selectedKelas]);

  const fetchData = async () => {
    try {
      const [siswaRes, kelasRes, adminRes, kegiatanRes, beasiswaRes] = await Promise.all([
        db.getSiswaWithKelas(),
        db.getKelas(),
        db.getAdministrasi(),
        db.getKegiatanAdministrasi(),
        db.getBeasiswaAdministrasi(),
      ]);

      if (siswaRes.data) setSiswaList(siswaRes.data);
      if (kelasRes.data) setKelasList(kelasRes.data);
      if (adminRes.data) setAdministrasiList(adminRes.data);
      if (kegiatanRes.data) setKegiatanList(kegiatanRes.data);
      if (beasiswaRes.data) setBeasiswaList(beasiswaRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  // ─── SISWA CRUD ────────────────────────────────────────────────────────
  const handleSiswaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSiswa) {
        const { error } = await db.updateSiswa(editingSiswa.id, siswaForm);
        if (error) {
          toast.error("Gagal menyimpan: " + error.message);
          return;
        }
        toast.success("Data siswa diperbarui");
      } else {
        const { error } = await db.createSiswa(siswaForm);
        if (error) {
          toast.error("Gagal menyimpan: " + error.message);
          return;
        }
        toast.success("Data siswa ditambahkan");
      }

      setSiswaDialogOpen(false);
      resetSiswaForm();
      fetchData();
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleDeleteSiswa = async (id: string) => {
    if (!confirm("Hapus siswa ini?")) return;
    const { error } = await db.deleteSiswa(id);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
      return;
    }
    toast.success("Data siswa dihapus");
    fetchData();
  };

  const normalizeImportKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

  const pickImportValue = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  };

  const handleImportSiswaExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (kelasList.length === 0) {
      toast.error("Data kelas belum tersedia. Tambahkan kelas terlebih dahulu.");
      e.target.value = "";
      return;
    }

    setIsImportingSiswa(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (rows.length === 0) {
        toast.error("File Excel kosong atau tidak memiliki data.");
        return;
      }

      const kelasById = new Set(kelasList.map((kelas) => kelas.id));
      const kelasByName = new Map(
        kelasList.map((kelas) => {
          const nama = `${kelas.kelas || kelas.tingkat || ""} ${kelas.jurusan || ""}`.trim().toLowerCase();
          return [String(kelas.nama_kelas || nama).toLowerCase(), kelas.id] as const;
        })
      );

      const generatedNisSet = new Set<string>();
      const generateUniqueNis = () => {
        let candidate = `IMP-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
        while (generatedNisSet.has(candidate)) {
          candidate = `IMP-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
        }
        generatedNisSet.add(candidate);
        return candidate;
      };

      let successCount = 0;
      const failures: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const normalizedRow: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rows[i])) {
          normalizedRow[normalizeImportKey(key)] = value;
        }

        const nama = pickImportValue(normalizedRow, ["nama", "namalengkap"]);
        const kelasRaw = pickImportValue(normalizedRow, ["kelas", "kelasnama", "namakelas", "kelasid"]);
        const jenisKelaminRaw = pickImportValue(normalizedRow, ["jeniskelamin", "gender", "jk"]);

        let kelasId = "";
        if (kelasRaw) {
          if (kelasById.has(kelasRaw)) {
            kelasId = kelasRaw;
          } else {
            kelasId = kelasByName.get(kelasRaw.toLowerCase()) || "";
          }
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
          nis: pickImportValue(normalizedRow, ["nis"]) || generateUniqueNis(),
          nisn: pickImportValue(normalizedRow, ["nisn"]),
          jenis_kelamin: jenisKelamin,
          tanggal_lahir: pickImportValue(normalizedRow, ["tanggallahir", "tglahir"]),
          alamat: pickImportValue(normalizedRow, ["alamat"]),
          asal_sekolah: pickImportValue(normalizedRow, ["asalsekolah", "asal"]),
          rfid_card: pickImportValue(normalizedRow, ["rfid", "rfidcard", "uidrfid"]),
        });

        if (error) {
          failures.push(`Baris ${i + 2}: ${error.message}`);
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`Impor selesai. ${successCount} data siswa berhasil ditambahkan.`);
        await fetchData();
      }

      if (failures.length > 0) {
        toast.error(`Ada ${failures.length} data gagal diimpor.`);
        console.error("Detail gagal impor siswa:", failures);
      }
    } catch (error) {
      console.error("Error importing siswa excel:", error);
      toast.error("Gagal membaca file Excel.");
    } finally {
      setIsImportingSiswa(false);
      e.target.value = "";
    }
  };

  const openSiswaForm = (siswa?: Siswa, kelasId?: string) => {
    if (siswa) {
      setEditingSiswa(siswa);
      setSiswaForm({
        nama: siswa.nama,
        kelas_id: siswa.kelas_id || "",
        nis: siswa.nis,
        nisn: siswa.nisn || "",
        jenis_kelamin: siswa.jenis_kelamin || "",
        tanggal_lahir: siswa.tanggal_lahir || "",
        alamat: siswa.alamat || "",
        asal_sekolah: siswa.asal_sekolah || "",
        rfid_card: siswa.rfid_card || "",
      });
    } else {
      resetSiswaForm();
      if (kelasId) {
        setSiswaForm((prev) => ({ ...prev, kelas_id: kelasId }));
      }
    }
    setSiswaDialogOpen(true);
  };

  const resetSiswaForm = () => {
    setEditingSiswa(null);
    setSiswaForm({
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

  // ─── KELAS CRUD ────────────────────────────────────────────────────────
  const handleKelasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...kelasForm,
      nama_kelas: `${kelasForm.kelas || kelasForm.tingkat} ${kelasForm.jurusan}`.trim(),
      tingkat: kelasForm.tingkat || kelasForm.kelas,
    };

    try {
      if (editingKelas) {
        const { error } = await db.updateKelas(editingKelas.id, payload);
        if (error) {
          toast.error("Gagal menyimpan: " + error.message);
          return;
        }
        toast.success("Data kelas diperbarui");
      } else {
        const { error } = await db.createKelas(payload);
        if (error) {
          toast.error("Gagal menyimpan: " + error.message);
          return;
        }
        toast.success("Data kelas ditambahkan");
      }

      setKelasDialogOpen(false);
      resetKelasForm();
      fetchData();
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleDeleteKelas = async (id: string) => {
    if (!confirm("Hapus kelas ini? Siswa tidak akan terhapus.")) return;
    const { error } = await db.deleteKelas(id);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
      return;
    }
    toast.success("Data kelas dihapus");
    setSelectedKelas(null);
    setHasUserSelectedKelas(false);
    fetchData();
  };

  const openKelasForm = (kelas?: Kelas) => {
    if (kelas) {
      setEditingKelas(kelas);
      setKelasForm({
        kelas: kelas.kelas || kelas.tingkat || "",
        jurusan: kelas.jurusan || "",
        tahun_ajaran: kelas.tahun_ajaran || "",
        wali_kelas: kelas.wali_kelas,
        tingkat: kelas.tingkat || kelas.kelas || "",
      });
    } else {
      resetKelasForm();
    }
    setKelasDialogOpen(true);
  };

  const resetKelasForm = () => {
    setEditingKelas(null);
    setKelasForm({
      kelas: "",
      jurusan: "",
      tahun_ajaran: "",
      wali_kelas: "",
      tingkat: "",
    });
  };

  // ─── Helpers ────────────────────────────────────────────────────────────
  const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

  const siswaByKelasMap = useMemo(() => {
    const map = new Map<string, Siswa[]>();

    for (const siswa of siswaList) {
      const keySet = new Set<string>([
        normalize(siswa.kelas_id),
        normalize(siswa.kelas?.id),
      ]);

      keySet.forEach((key) => {
        if (!key) return;
        const current = map.get(key) || [];
        if (!current.some((item) => item.id === siswa.id)) {
          current.push(siswa);
          map.set(key, current);
        }
      });
    }

    map.forEach((items, key) => {
      map.set(
        key,
        [...items].sort((a, b) =>
          a.nama.localeCompare(b.nama, "id", { sensitivity: "base" })
        )
      );
    });

    return map;
  }, [siswaList]);

  const getSiswaByKelas = (kelasId: string) =>
    siswaByKelasMap.get(normalize(kelasId)) || [];

  const getKelasInfo = (kelas: Kelas) => {
    const count = getSiswaByKelas(kelas.id).length;
    return { ...kelas, siswaCount: count };
  };

  const filteredKelas = kelasList.filter((k) => {
    const normalizedSearch = normalize(searchTerm);
    if (!normalizedSearch) return true;

    const matchKelas =
      normalize(k.kelas).includes(normalizedSearch) ||
      normalize(k.jurusan).includes(normalizedSearch) ||
      normalize(k.tahun_ajaran).includes(normalizedSearch) ||
      normalize(k.wali_kelas).includes(normalizedSearch) ||
      normalize(k.tingkat).includes(normalizedSearch);

    if (matchKelas) return true;

    const siswaDiKelas = getSiswaByKelas(k.id);
    return siswaDiKelas.some(
      (s) =>
        normalize(s.nama).includes(normalizedSearch) ||
        normalize(s.nis).includes(normalizedSearch) ||
        normalize(s.nisn).includes(normalizedSearch)
    );
  });

  const filteredSiswa = siswaList.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBeasiswaForSiswa = (siswaId: string) =>
    beasiswaList.filter((beasiswa) => beasiswa.aktif && (beasiswa.siswa_ids || []).includes(siswaId));

  const getBeasiswaForKegiatan = (kegiatanId: string) =>
    beasiswaList.filter((beasiswa) => beasiswa.aktif && (beasiswa.kegiatan_ids || []).includes(kegiatanId));

  const resetBeasiswaForm = () => {
    setEditingBeasiswa(null);
    setBeasiswaSearchSiswa("");
    setBeasiswaSearchKegiatan("");
    setBeasiswaForm({
      nama_program: "",
      deskripsi: "",
      aktif: true,
      siswa_ids: [],
      kegiatan_ids: [],
    });
  };

  const openBeasiswaForm = (beasiswa?: Beasiswa) => {
    if (beasiswa) {
      setEditingBeasiswa(beasiswa);
      setBeasiswaForm({
        nama_program: beasiswa.nama_program,
        deskripsi: beasiswa.deskripsi || "",
        aktif: beasiswa.aktif,
        siswa_ids: beasiswa.siswa_ids || [],
        kegiatan_ids: beasiswa.kegiatan_ids || [],
      });
    } else {
      resetBeasiswaForm();
    }
    setBeasiswaDialogOpen(true);
  };

  const handleBeasiswaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (beasiswaForm.siswa_ids.length === 0) {
      toast.error("Pilih minimal 1 siswa penerima beasiswa");
      return;
    }

    if (beasiswaForm.kegiatan_ids.length === 0) {
      toast.error("Pilih minimal 1 kegiatan administrasi yang digratiskan");
      return;
    }

    try {
      const payload = {
        nama_program: beasiswaForm.nama_program,
        deskripsi: beasiswaForm.deskripsi,
        aktif: beasiswaForm.aktif,
        siswa_ids: beasiswaForm.siswa_ids,
        kegiatan_ids: beasiswaForm.kegiatan_ids,
      };

      const { error } = editingBeasiswa
        ? await db.updateBeasiswaAdministrasi(editingBeasiswa.id, payload)
        : await db.createBeasiswaAdministrasi(payload);

      if (error) {
        toast.error("Gagal menyimpan: " + error.message);
        return;
      }

      toast.success(editingBeasiswa ? "Program beasiswa diperbarui" : "Program beasiswa ditambahkan");
      setBeasiswaDialogOpen(false);
      resetBeasiswaForm();
      fetchData();
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleDeleteBeasiswa = async (id: string) => {
    if (!confirm("Hapus program beasiswa ini? Semua relasi siswa dan kegiatan ikut terhapus.")) return;

    const { error } = await db.deleteBeasiswaAdministrasi(id);
    if (error) {
      toast.error("Gagal menghapus: " + error.message);
      return;
    }

    toast.success("Program beasiswa dihapus");
    fetchData();
  };

  const selectedKelasSiswa = selectedKelas
    ? getSiswaByKelas(selectedKelas.id)
    : [];

  const displayedSelectedKelasSiswa = selectedKelasSiswa.filter(
    (s) =>
      normalize(s.nama).includes(normalize(searchTerm)) ||
      normalize(s.nis).includes(normalize(searchTerm)) ||
      normalize(s.nisn).includes(normalize(searchTerm))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full max-w-[1440px] mx-auto p-3 md:p-4 flex flex-col gap-2.5 overflow-auto">
      <div className="shrink-0">
        <h1 className="text-2xl md:text-[2rem] font-bold leading-tight text-gray-800">Rombel (Kelas & Siswa)</h1>
        <p className="text-sm text-gray-500 mt-0">Manajemen terintegrasi data kelas dan siswa</p>
      </div>

      {/* Search Bar */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Cari kelas, jurusan, wali kelas, atau nama siswa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0 w-fit h-10 p-1">
          <TabsTrigger value="overview" className="text-sm">Tampilan Terintegrasi</TabsTrigger>
          <TabsTrigger value="kelas" className="text-sm">Kelola Kelas</TabsTrigger>
          <TabsTrigger value="beasiswa" className="text-sm">Beasiswa</TabsTrigger>
          <TabsTrigger value="siswa" className="text-sm">Kelola Siswa</TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════════════════════════════════
            TAB: OVERVIEW - Tampilan Terintegrasi
        ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="flex-1 min-h-0 mt-2 data-[state=inactive]:hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Panel Kelas Berbentuk Kartu */}
            <div className="lg:col-span-5 min-h-0">
              <Card className="h-full flex flex-col shadow-sm border-gray-200">
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Kelas Terdaftar</CardTitle>
                      <p className="text-xs text-gray-500 mt-0.5">Pilih kartu kelas untuk membuka detail lengkap</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openKelasForm()}
                      className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Kelas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-3">
                  <ScrollArea className="h-full pr-2">
                    {filteredKelas.length === 0 ? (
                      <div className="h-full min-h-[220px] flex items-center justify-center rounded-lg border border-dashed text-sm text-gray-500">
                        Tidak ada kelas yang cocok dengan pencarian
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredKelas.map((kelas) => {
                          const count = getSiswaByKelas(kelas.id).length;
                          const isSelected = selectedKelas?.id === kelas.id;
                          return (
                            <button
                              key={kelas.id}
                              type="button"
                              onClick={() => {
                                setSelectedKelas(kelas);
                                setHasUserSelectedKelas(true);
                              }}
                              className={`text-left rounded-xl border p-3 transition-all ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50 shadow-sm"
                                  : "border-gray-200 bg-white hover:border-blue-300"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-gray-800 truncate">
                                    {`${kelas.kelas || kelas.tingkat} ${kelas.jurusan || ""}`.trim()}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">Tahun {kelas.tahun_ajaran || "-"}</p>
                                </div>
                                <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-700">
                                  {count} siswa
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-2 truncate">Wali: {kelas.wali_kelas || "-"}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Panel Detail Kelas + CRUD */}
            <div className="lg:col-span-7 min-h-0 flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 shrink-0">
                <Card className="shadow-sm border-gray-200 rounded-xl h-[88px]">
                  <CardContent className="h-full py-1.5 px-3 [&:last-child]:pb-1.5">
                    <div className="flex items-center justify-between h-full">
                      <div>
                        <p className="text-[10px] text-gray-500">Total Kelas</p>
                        <p className="text-[28px] font-bold leading-none text-blue-600 mt-0.5">{kelasList.length}</p>
                      </div>
                      <BookOpen className="w-6 h-6 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-200 rounded-xl h-[88px]">
                  <CardContent className="h-full py-1.5 px-3 [&:last-child]:pb-1.5">
                    <div className="flex items-center justify-between h-full">
                      <div>
                        <p className="text-[10px] text-gray-500">Total Siswa</p>
                        <p className="text-[28px] font-bold leading-none text-green-600 mt-0.5">{siswaList.length}</p>
                      </div>
                      <Users className="w-6 h-6 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-200 rounded-xl h-[88px]">
                  <CardContent className="h-full py-1.5 px-3 [&:last-child]:pb-1.5">
                    <div className="flex items-center justify-between h-full">
                      <div>
                        <p className="text-[10px] text-gray-500">Rata-rata Siswa/Kelas</p>
                        <p className="text-[28px] font-bold leading-none text-purple-600 mt-0.5">
                          {kelasList.length > 0
                            ? Math.round(siswaList.length / kelasList.length)
                            : 0}
                        </p>
                      </div>
                      <AlertCircle className="w-6 h-6 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-200 rounded-xl h-[88px]">
                  <CardContent className="h-full py-1.5 px-3 [&:last-child]:pb-1.5">
                    <div className="flex items-center justify-between h-full">
                      <div>
                        <p className="text-[10px] text-gray-500">Program Beasiswa</p>
                        <p className="text-[28px] font-bold leading-none text-amber-600 mt-0.5">{beasiswaList.filter((item) => item.aktif).length}</p>
                      </div>
                      <Gift className="w-6 h-6 text-amber-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex-1 min-h-0">
                {selectedKelas && hasUserSelectedKelas ? (
                  <Card className="h-full flex flex-col shadow-sm border-gray-200">
                    <CardHeader className="py-3 px-4 border-b">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl leading-tight">
                            {`${selectedKelas.kelas || selectedKelas.tingkat} ${selectedKelas.jurusan || ""}`.trim()}
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-1">Detail kelas, data siswa, dan aksi CRUD</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => openSiswaForm(undefined, selectedKelas.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Siswa
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openKelasForm(selectedKelas)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteKelas(selectedKelas.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 min-h-0 p-4 overflow-auto">
                      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 h-full">
                        <div className="xl:col-span-2 grid grid-cols-2 gap-2 self-start">
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Kelas</p>
                            <p className="text-xl font-semibold mt-1">{selectedKelas.kelas || selectedKelas.tingkat || "-"}</p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Jurusan</p>
                            <p className="text-xl font-semibold mt-1">{selectedKelas.jurusan || "-"}</p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Tahun Ajaran</p>
                            <p className="text-xl font-semibold mt-1">{selectedKelas.tahun_ajaran || "-"}</p>
                          </div>
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Jumlah Siswa</p>
                            <p className="text-xl font-semibold mt-1">{selectedKelasSiswa.length}</p>
                          </div>
                          <div className="col-span-2 rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Wali Kelas</p>
                            <p className="text-base font-semibold mt-1">{selectedKelas.wali_kelas || "-"}</p>
                          </div>
                        </div>

                        <div className="xl:col-span-3 rounded-xl border min-w-0 flex flex-col">
                          <div className="px-3 py-2 border-b bg-gray-50 rounded-t-xl flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700">Daftar Siswa Kelas</p>
                            <span className="text-xs text-gray-500">{displayedSelectedKelasSiswa.length}/{selectedKelasSiswa.length} siswa</span>
                          </div>
                          <div className="flex-1 min-h-0 overflow-auto">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-white z-10">
                                <tr className="border-b">
                                  <th className="text-left py-2 px-3 w-14">No</th>
                                  <th className="text-left py-2 px-3">Nama Siswa</th>
                                  <th className="text-left py-2 px-3 w-28">NIS</th>
                                  <th className="text-center py-2 px-3 w-28">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayedSelectedKelasSiswa.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500 text-sm">
                                      Tidak ada siswa yang cocok dengan pencarian
                                    </td>
                                  </tr>
                                ) : (
                                  displayedSelectedKelasSiswa.map((siswa, i) => (
                                    <tr key={siswa.id} className="border-b hover:bg-gray-50">
                                      <td className="py-2 px-3">{i + 1}</td>
                                      <td className="py-2 px-3 font-medium">
                                        <div className="flex items-center gap-2">
                                          <span>{siswa.nama}</span>
                                          {getBeasiswaForSiswa(siswa.id).length > 0 && (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                              Beasiswa
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-gray-600">{siswa.nis || "-"}</td>
                                      <td className="py-2 px-3">
                                        <div className="flex gap-1 justify-center">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openSiswaForm(siswa)}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500"
                                            onClick={() => handleDeleteSiswa(siswa.id)}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full shadow-sm border-gray-200">
                    <CardContent className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-6">
                      <BookOpen className="w-10 h-10 text-gray-300 mb-2" />
                      <p className="font-medium text-gray-700">Detail kelas belum ditampilkan</p>
                      <p className="text-sm mt-1">Klik salah satu box nama kelas terlebih dulu untuk menampilkan detail kelas dan daftar siswa</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════
            TAB: KELAS - Kelola Kelas
        ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="kelas" className="flex-1 min-h-0 mt-2.5 data-[state=inactive]:hidden">
          <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4">
              <CardTitle className="text-base">Manajemen Kelas</CardTitle>
              <Button
                onClick={() => openKelasForm()}
                className="h-8 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Kelas
              </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-4 pb-3 pt-0">
              <ScrollArea className="h-full">
                <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">No</th>
                      <th className="text-left py-2 px-3">Kelas</th>
                      <th className="text-left py-2 px-3">Jurusan</th>
                      <th className="text-left py-2 px-3">Jurusan</th>
                      <th className="text-left py-2 px-3">Tahun Ajaran</th>
                      <th className="text-left py-2 px-3">Wali Kelas</th>
                      <th className="text-center py-2 px-3">Jumlah Siswa</th>
                      <th className="text-center py-2 px-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKelas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-8 text-gray-500"
                        >
                          Belum ada kelas
                        </td>
                      </tr>
                    ) : (
                      filteredKelas.map((kelas, i) => (
                        <tr
                          key={kelas.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-2 px-3">{i + 1}</td>
                          <td className="py-2 px-3">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                              {`${kelas.kelas || kelas.tingkat} ${kelas.jurusan || ""}`.trim()}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                              {kelas.jurusan}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                              {kelas.jurusan}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs">
                            {kelas.tahun_ajaran}
                          </td>
                          <td className="py-2 px-3">{kelas.wali_kelas}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                              {getSiswaByKelas(kelas.id).length} siswa
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openKelasForm(kelas)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteKelas(kelas.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════
            TAB: BEASISWA - Keringanan Administrasi
        ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="beasiswa" className="flex-1 min-h-0 mt-2.5 data-[state=inactive]:hidden">
          <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4">
              <CardTitle className="text-base">Program Beasiswa Administrasi</CardTitle>
              <Button onClick={() => openBeasiswaForm()} className="h-8 bg-amber-600 hover:bg-amber-700">
                <Gift className="w-4 h-4 mr-2" />
                Tambah Program
              </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-4 pb-3 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <Card className="shadow-sm border-amber-100 bg-amber-50/60">
                  <CardContent className="py-3 px-4 [&:last-child]:pb-3">
                    <p className="text-[10px] text-amber-700/70 uppercase tracking-wide">Program Aktif</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{beasiswaList.filter((item) => item.aktif).length}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-sky-100 bg-sky-50/60">
                  <CardContent className="py-3 px-4 [&:last-child]:pb-3">
                    <p className="text-[10px] text-sky-700/70 uppercase tracking-wide">Siswa Tercover</p>
                    <p className="text-2xl font-bold text-sky-700 mt-1">
                      {new Set(beasiswaList.filter((item) => item.aktif).flatMap((item) => item.siswa_ids || [])).size}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-emerald-100 bg-emerald-50/60">
                  <CardContent className="py-3 px-4 [&:last-child]:pb-3">
                    <p className="text-[10px] text-emerald-700/70 uppercase tracking-wide">Kegiatan Gratis</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {new Set(beasiswaList.filter((item) => item.aktif).flatMap((item) => item.kegiatan_ids || [])).size}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <ScrollArea className="h-[calc(100%-120px)] pr-2">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {beasiswaList.length === 0 ? (
                    <div className="xl:col-span-2 rounded-xl border border-dashed bg-gray-50 py-16 text-center text-gray-500">
                      <Gift className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Belum ada program beasiswa administrasi</p>
                      <p className="text-sm mt-1">Tambahkan program untuk siswa terpilih seperti ketua osis, juara lomba, dan lainnya</p>
                    </div>
                  ) : (
                    beasiswaList.map((beasiswa) => (
                      <Card key={beasiswa.id} className="shadow-sm border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-base leading-tight flex items-center gap-2">
                                {beasiswa.nama_program}
                                {beasiswa.aktif ? (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Aktif</span>
                                ) : (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Nonaktif</span>
                                )}
                              </CardTitle>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{beasiswa.deskripsi || "Tidak ada deskripsi"}</p>
                            </div>
                            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5">
                              <p className="text-amber-700/70">Siswa</p>
                              <p className="font-semibold text-amber-700 mt-0.5">{beasiswa.siswa_ids?.length || 0} terpilih</p>
                            </div>
                            <div className="rounded-lg bg-sky-50 border border-sky-100 p-2.5">
                              <p className="text-sky-700/70">Kegiatan</p>
                              <p className="font-semibold text-sky-700 mt-0.5">{beasiswa.kegiatan_ids?.length || 0} gratis</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Siswa Penerima</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(beasiswa.siswa_list || []).slice(0, 4).map((siswa) => (
                                <span key={siswa.id} className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                  {siswa.nama}
                                </span>
                              ))}
                              {(beasiswa.siswa_list || []).length === 0 && (
                                <span className="text-[11px] text-gray-400">Belum ada siswa</span>
                              )}
                              {(beasiswa.siswa_list || []).length > 4 && (
                                <span className="text-[11px] text-gray-400">+{(beasiswa.siswa_list || []).length - 4} lainnya</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Kegiatan Gratis</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(beasiswa.kegiatan_list || []).slice(0, 4).map((kegiatan) => (
                                <span key={kegiatan.id} className="text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                  {kegiatan.nama_kegiatan}
                                </span>
                              ))}
                              {(beasiswa.kegiatan_list || []).length === 0 && (
                                <span className="text-[11px] text-gray-400">Belum ada kegiatan</span>
                              )}
                              {(beasiswa.kegiatan_list || []).length > 4 && (
                                <span className="text-[11px] text-gray-400">+{(beasiswa.kegiatan_list || []).length - 4} lainnya</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" onClick={() => openBeasiswaForm(beasiswa)} className="flex-1 h-8">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteBeasiswa(beasiswa.id)} className="h-8 w-8 p-0">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════
            TAB: SISWA - Kelola Siswa
        ═════════════════════════════════════════════════════════════════ */}
        <TabsContent value="siswa" className="flex-1 min-h-0 mt-2.5 data-[state=inactive]:hidden">
          <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4">
              <CardTitle className="text-base">Manajemen Siswa</CardTitle>
              <div className="flex items-center gap-2">
                <input
                  ref={siswaImportRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportSiswaExcel}
                />
                <Button
                  variant="outline"
                  onClick={() => siswaImportRef.current?.click()}
                  disabled={isImportingSiswa}
                  className="h-8"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isImportingSiswa ? "Mengimpor..." : "Impor Excel"}
                </Button>
                <Button
                  onClick={() => openSiswaForm()}
                  className="h-8 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Siswa
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-4 pb-3 pt-0">
              <ScrollArea className="h-full">
                <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">No</th>
                      <th className="text-left py-2 px-3">Nama</th>
                      <th className="text-left py-2 px-3">NIS</th>
                      <th className="text-left py-2 px-3">Kelas</th>
                      <th className="text-left py-2 px-3">Jenis Kelamin</th>
                      <th className="text-left py-2 px-3">RFID Card</th>
                      <th className="text-center py-2 px-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSiswa.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-gray-500"
                        >
                          Belum ada siswa
                        </td>
                      </tr>
                    ) : (
                      filteredSiswa.map((siswa, i) => {
                        const kelas = kelasList.find(
                          (k) => k.id === siswa.kelas_id
                        );
                        return (
                          <tr
                            key={siswa.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="py-2 px-3">{i + 1}</td>
                            <td className="py-2 px-3 font-semibold">
                              <div className="flex items-center gap-2">
                                <span>{siswa.nama}</span>
                                {getBeasiswaForSiswa(siswa.id).length > 0 && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                    Beasiswa
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-gray-600">
                              {siswa.nis}
                            </td>
                            <td className="py-2 px-3">
                              {kelas ? (
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                                  {`${kelas.kelas} ${kelas.jurusan}`.trim()}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">
                                  Belum ada kelas
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {siswa.jenis_kelamin || "-"}
                            </td>
                            <td className="py-2 px-3 text-xs">
                              {siswa.rfid_card ? (
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                  {siswa.rfid_card}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openSiswaForm(siswa)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteSiswa(siswa.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═════════════════════════════════════════════════════════════════
          DIALOG: Tambah/Edit Siswa
      ═════════════════════════════════════════════════════════════════ */}
      <Dialog open={siswaDialogOpen} onOpenChange={setSiswaDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSiswa ? "Edit Data Siswa" : "Tambah Siswa"}
            </DialogTitle>
            <DialogDescription>
              Masukkan data lengkap siswa termasuk UID RFID (bisa menyalin manual).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSiswaSubmit} className="space-y-4">
            <div>
              <Label>Nama Siswa</Label>
              <Input
                value={siswaForm.nama}
                onChange={(e) =>
                  setSiswaForm((p) => ({ ...p, nama: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>NIS</Label>
              <Input
                value={siswaForm.nis}
                onChange={(e) =>
                  setSiswaForm((p) => ({ ...p, nis: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>NISN</Label>
              <Input
                value={siswaForm.nisn}
                onChange={(e) =>
                  setSiswaForm((p) => ({ ...p, nisn: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Kelas</Label>
              <select
                value={siswaForm.kelas_id}
                onChange={(e) =>
                  setSiswaForm((p) => ({ ...p, kelas_id: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {`${k.kelas || k.tingkat} ${k.jurusan || ''}`.trim()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Jenis Kelamin</Label>
              <select
                value={siswaForm.jenis_kelamin}
                onChange={(e) =>
                  setSiswaForm((p) => ({ ...p, jenis_kelamin: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <Label>Tanggal Lahir</Label>
              <Input
                type="date"
                value={siswaForm.tanggal_lahir}
                onChange={(e) =>
                  setSiswaForm((p) => ({ ...p, tanggal_lahir: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input
                value={siswaForm.alamat}
                onChange={(e) =>
                  setSiswaForm((p) => ({ ...p, alamat: e.target.value }))
                }
              />
            </div>

            {/* ── RFID Card ── */}
            <div>
              <Label className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-500" />
                RFID Card (UID)
              </Label>
              <div className="relative">
                <Input
                  value={siswaForm.rfid_card}
                  onChange={(e) =>
                    setSiswaForm((p) => ({ ...p, rfid_card: e.target.value }))
                  }
                  placeholder="Masukkan atau scan UID kartu RFID"
                  className="pr-10 font-mono tracking-wider"
                />
                {siswaForm.rfid_card && (
                  <button
                    type="button"
                    onClick={() => setSiswaForm((p) => ({ ...p, rfid_card: "" }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-xs"
                    title="Hapus UID"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Salin UID dari pembaca RFID atau isi manual. Harus unik per siswa.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSiswaDialogOpen(false);
                  resetSiswaForm();
                }}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingSiswa ? "Perbarui" : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════════════════════════════════
          DIALOG: Tambah/Edit Kelas
      ═════════════════════════════════════════════════════════════════ */}
      <Dialog open={kelasDialogOpen} onOpenChange={setKelasDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKelas ? "Edit Data Kelas" : "Tambah Kelas"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi data kelas; nama kelas otomatis dibuat dari Kelas + Jurusan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleKelasSubmit} className="space-y-4">
            <div>
              <Label>Kelas</Label>
              <select
                value={kelasForm.kelas}
                onChange={(e) =>
                  setKelasForm((p) => ({ ...p, kelas: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">Pilih Kelas</option>
                <option value="X">X</option>
                <option value="XI">XI</option>
                <option value="XII">XII</option>
              </select>
            </div>

            <div>
              <Label>Jurusan</Label>
              <select
                value={kelasForm.jurusan}
                onChange={(e) =>
                  setKelasForm((p) => ({ ...p, jurusan: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">Pilih Jurusan</option>
                <option value="TKJ">TKJ (Teknik Komputer Jaringan)</option>
                <option value="TKR">TKR (Teknik Kendaraan Ringan)</option>
              </select>
            </div>

            <div>
              <Label>Tahun Ajaran</Label>
              <Input
                type="text"
                value={kelasForm.tahun_ajaran}
                onChange={(e) =>
                  setKelasForm((p) => ({ ...p, tahun_ajaran: e.target.value }))
                }
                placeholder="Contoh: 2024/2025"
                required
              />
            </div>

            <div>
              <Label>Wali Kelas</Label>
              <select
                value={kelasForm.wali_kelas}
                onChange={(e) =>
                  setKelasForm((p) => ({ ...p, wali_kelas: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">Pilih Wali Kelas</option>
                {administrasiList.length > 0 ? (
                  administrasiList.map((admin) => (
                    <option key={admin.id} value={admin.nama}>
                      {admin.nama}
                    </option>
                  ))
                ) : (
                  <option disabled>Belum ada data administrasi</option>
                )}
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setKelasDialogOpen(false);
                  resetKelasForm();
                }}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingKelas ? "Perbarui" : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═════════════════════════════════════════════════════════════════
          DIALOG: Tambah/Edit Beasiswa
      ═════════════════════════════════════════════════════════════════ */}
      <Dialog open={beasiswaDialogOpen} onOpenChange={setBeasiswaDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBeasiswa ? "Edit Program Beasiswa" : "Tambah Program Beasiswa"}
            </DialogTitle>
            <DialogDescription>
              Pilih siswa penerima dan kegiatan administrasi yang digratiskan untuk program ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBeasiswaSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Program</Label>
                <Input
                  value={beasiswaForm.nama_program}
                  onChange={(e) => setBeasiswaForm((p) => ({ ...p, nama_program: e.target.value }))}
                  placeholder="Contoh: Beasiswa Ketua OSIS"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Kondisi Program</Label>
                <label className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <Checkbox
                    checked={beasiswaForm.aktif}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      setBeasiswaForm((p) => ({ ...p, aktif: Boolean(checked) }))
                    }
                  />
                  <div>
                    <p className="text-sm font-medium">Program aktif</p>
                    <p className="text-xs text-gray-500">Jika nonaktif, gratis administrasi akan berhenti berlaku.</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <Label>Deskripsi / Alasan</Label>
              <Input
                value={beasiswaForm.deskripsi}
                onChange={(e) => setBeasiswaForm((p) => ({ ...p, deskripsi: e.target.value }))}
                placeholder="Contoh: Ketua OSIS, wakil OSIS, juara lomba, dll"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold">Siswa Penerima</p>
                    <p className="text-xs text-gray-500">Pilih satu atau beberapa siswa yang mendapat beasiswa</p>
                  </div>
                  <span className="text-xs text-gray-500">{beasiswaForm.siswa_ids.length} dipilih</span>
                </div>

                <Input
                  value={beasiswaSearchSiswa}
                  onChange={(e) => setBeasiswaSearchSiswa(e.target.value)}
                  placeholder="Cari nama atau NIS siswa..."
                  className="mb-3"
                />

                <ScrollArea className="h-72 pr-2">
                  <div className="space-y-1.5">
                    {siswaList.filter((siswa) => {
                      const query = beasiswaSearchSiswa.toLowerCase().trim();
                      if (!query) return true;
                      return (
                        siswa.nama.toLowerCase().includes(query) ||
                        siswa.nis.toLowerCase().includes(query)
                      );
                    }).length === 0 ? (
                      <p className="text-sm text-gray-500 py-8 text-center">Tidak ada siswa yang cocok</p>
                    ) : (
                      siswaList
                        .filter((siswa) => {
                          const query = beasiswaSearchSiswa.toLowerCase().trim();
                          if (!query) return true;
                          return (
                            siswa.nama.toLowerCase().includes(query) ||
                            siswa.nis.toLowerCase().includes(query)
                          );
                        })
                        .map((siswa) => {
                          const assigned = getBeasiswaForSiswa(siswa.id);
                          return (
                            <label key={siswa.id} className="flex items-start gap-3 rounded-lg border px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <Checkbox
                                checked={beasiswaForm.siswa_ids.includes(siswa.id)}
                                onCheckedChange={(checked: boolean | "indeterminate") =>
                                  setBeasiswaForm((p) => ({
                                    ...p,
                                    siswa_ids: checked
                                      ? [...p.siswa_ids, siswa.id]
                                      : p.siswa_ids.filter((id) => id !== siswa.id),
                                  }))
                                }
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{siswa.nama}</p>
                                <p className="text-xs text-gray-500">NIS {siswa.nis} {siswa.kelas?.nama_kelas ? `• ${siswa.kelas.nama_kelas}` : ""}</p>
                                {assigned.length > 0 && (
                                  <p className="text-[11px] text-amber-600 mt-1">Sudah punya {assigned.length} program aktif</p>
                                )}
                              </div>
                            </label>
                          );
                        })
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold">Kegiatan Gratis</p>
                    <p className="text-xs text-gray-500">Pilih kegiatan administrasi yang digratiskan untuk siswa terpilih</p>
                  </div>
                  <span className="text-xs text-gray-500">{beasiswaForm.kegiatan_ids.length} dipilih</span>
                </div>

                <Input
                  value={beasiswaSearchKegiatan}
                  onChange={(e) => setBeasiswaSearchKegiatan(e.target.value)}
                  placeholder="Cari nama kegiatan..."
                  className="mb-3"
                />

                <ScrollArea className="h-72 pr-2">
                  <div className="space-y-1.5">
                    {kegiatanList.filter((kegiatan) => {
                      const query = beasiswaSearchKegiatan.toLowerCase().trim();
                      if (!query) return true;
                      return kegiatan.nama_kegiatan.toLowerCase().includes(query);
                    }).length === 0 ? (
                      <p className="text-sm text-gray-500 py-8 text-center">Tidak ada kegiatan yang cocok</p>
                    ) : (
                      kegiatanList
                        .filter((kegiatan) => {
                          const query = beasiswaSearchKegiatan.toLowerCase().trim();
                          if (!query) return true;
                          return kegiatan.nama_kegiatan.toLowerCase().includes(query);
                        })
                        .map((kegiatan) => {
                          const covered = getBeasiswaForKegiatan(kegiatan.id);
                          return (
                            <label key={kegiatan.id} className="flex items-start gap-3 rounded-lg border px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <Checkbox
                                checked={beasiswaForm.kegiatan_ids.includes(kegiatan.id)}
                                onCheckedChange={(checked: boolean | "indeterminate") =>
                                  setBeasiswaForm((p) => ({
                                    ...p,
                                    kegiatan_ids: checked
                                      ? [...p.kegiatan_ids, kegiatan.id]
                                      : p.kegiatan_ids.filter((id) => id !== kegiatan.id),
                                  }))
                                }
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{kegiatan.nama_kegiatan}</p>
                                <p className="text-xs text-gray-500">
                                  Nominal {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(kegiatan.nominal || 0))}
                                </p>
                                {covered.length > 0 && (
                                  <p className="text-[11px] text-emerald-600 mt-1">Sudah digratiskan oleh {covered.length} program aktif</p>
                                )}
                              </div>
                            </label>
                          );
                        })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBeasiswaDialogOpen(false);
                  resetBeasiswaForm();
                }}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {editingBeasiswa ? "Perbarui" : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
