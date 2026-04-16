import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { db } from "../../../utils/supabase/client";
import { toast } from "sonner";

interface Kelas {
  id: string;
  nama_kelas: string;
  tingkat: string;
  wali_kelas: string;
  created_at?: string;
  updated_at?: string;
}

interface Siswa {
  id: string;
  nama: string;
  nis: string;
  kelas_id: string | null;
}

export default function Kelas() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [availableSiswa, setAvailableSiswa] = useState<Siswa[]>([]);
  const [selectedSiswa, setSelectedSiswa] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [formData, setFormData] = useState({
    nama_kelas: "",
    tingkat: "",
    wali_kelas: "",
  });

  useEffect(() => {
    fetchKelas();
    fetchSiswa();
  }, []);

  const fetchKelas = async () => {
    try {
      const { data, error } = await db.getKelas();

      if (error) {
        toast.error("Gagal memuat data kelas: " + error.message);
        return;
      }

      setKelasList(data || []);
    } catch (error) {
      console.error("Error fetching kelas:", error);
      toast.error("Terjadi kesalahan saat memuat data kelas");
    } finally {
      setLoading(false);
    }
  };

  const fetchSiswa = async () => {
    try {
      const { data, error } = await db.getSiswa();

      if (error) {
        console.error("Error fetching siswa:", error);
        return;
      }

      setSiswaList(data || []);
    } catch (error) {
      console.error("Error fetching siswa:", error);
    }
  };

  const handleOpenDialog = async (kelas?: Kelas) => {
    // Fetch siswa without kelas
    try {
      const { data, error } = await db.getSiswa();
      
      if (error) {
        toast.error("Gagal memuat data siswa");
        return;
      }

      // Filter siswa yang tidak memiliki kelas
      const unassigned = (data || []).filter((s: Siswa) => !s.kelas_id);
      
      // If editing, also include already assigned siswa
      let assignedToThisKelas: string[] = [];
      if (kelas) {
        assignedToThisKelas = (data || [])
          .filter((s: Siswa) => s.kelas_id === kelas.id)
          .map((s: Siswa) => s.id);
      }

      setAvailableSiswa(unassigned);
      setSelectedSiswa(assignedToThisKelas);
      
      if (kelas) {
        setEditingKelas(kelas);
        setFormData({
          nama_kelas: kelas.nama_kelas,
          tingkat: kelas.tingkat,
          wali_kelas: kelas.wali_kelas,
        });
      } else {
        resetForm();
      }
      
      setDialogOpen(true);
    } catch (error) {
      console.error("Error fetching available siswa:", error);
      toast.error("Gagal memuat data siswa");
    }
  };

  const handleToggleSiswa = (siswaId: string) => {
    setSelectedSiswa((prev) =>
      prev.includes(siswaId)
        ? prev.filter((id) => id !== siswaId)
        : [...prev, siswaId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 1. Create or update kelas
      let kelasId: string;
      
      if (editingKelas) {
        const { error } = await db.updateKelas(editingKelas.id, formData);
        if (error) {
          toast.error("Gagal mengupdate kelas: " + error.message);
          return;
        }
        kelasId = editingKelas.id;
      } else {
        const { data, error } = await db.createKelas(formData);
        if (error) {
          toast.error("Gagal membuat kelas: " + error.message);
          return;
        }
        kelasId = data?.id;
      }

      // 2. Update selected siswa to this kelas
      if (selectedSiswa.length > 0) {
        for (const siswaId of selectedSiswa) {
          const { error } = await db.updateSiswa(siswaId, { kelas_id: kelasId });
          if (error) {
            console.error(`Error updating siswa ${siswaId}:`, error);
          }
        }
      }

      toast.success(editingKelas ? "✅ Data kelas diperbarui" : "✅ Kelas berhasil dibuat");
      
      setDialogOpen(false);
      resetForm();
      fetchKelas();
      fetchSiswa();
    } catch (error) {
      console.error("Error saving kelas:", error);
      toast.error("Terjadi kesalahan saat menyimpan data");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kelas ini? Siswa tidak akan terhapus.")) return;
    
    try {
      const { error } = await db.deleteKelas(id);
      
      if (error) {
        toast.error("Gagal menghapus data: " + error.message);
        return;
      }
      
      toast.success("✅ Data kelas berhasil dihapus (siswa tetap tersimpan)");
      fetchKelas();
      fetchSiswa();
    } catch (error) {
      console.error("Error deleting kelas:", error);
      toast.error("Terjadi kesalahan saat menghapus data");
    }
  };

  const resetForm = () => {
    setEditingKelas(null);
    setSelectedSiswa([]);
    setAvailableSiswa([]);
    setFormData({
      nama_kelas: "",
      tingkat: "",
      wali_kelas: "",
    });
  };

  const filteredKelas = kelasList.filter((kelas) =>
    kelas.nama_kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kelas.tingkat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kelas.wali_kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Data Kelas</h1>
        <p className="text-gray-500 mt-1">Kelola data kelas, wali kelas, dan siswa</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Daftar Kelas</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Kelas
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingKelas ? "Edit Data Kelas" : "Tambah Data Kelas"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingKelas ? "Perbarui informasi kelas dan siswa" : "Masukkan informasi kelas baru dan pilih siswa"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    {/* Kelas Info */}
                    <div className="space-y-2">
                      <Label htmlFor="nama_kelas">Nama Kelas</Label>
                      <Input
                        id="nama_kelas"
                        placeholder="contoh: XII IPA 1"
                        value={formData.nama_kelas}
                        onChange={(e) => setFormData({ ...formData, nama_kelas: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tingkat">Tingkat</Label>
                      <Input
                        id="tingkat"
                        placeholder="contoh: 10, 11, 12"
                        value={formData.tingkat}
                        onChange={(e) => setFormData({ ...formData, tingkat: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wali_kelas">Wali Kelas</Label>
                      <Input
                        id="wali_kelas"
                        placeholder="Nama wali kelas"
                        value={formData.wali_kelas}
                        onChange={(e) => setFormData({ ...formData, wali_kelas: e.target.value })}
                        required
                      />
                    </div>

                    {/* Student Selection */}
                    <div className="space-y-2 pt-4 border-t">
                      <Label>Pilih Siswa untuk Kelas Ini</Label>
                      <p className="text-sm text-gray-500 mb-2">
                        {availableSiswa.length === 0 
                          ? "Semua siswa sudah memiliki kelas" 
                          : `${availableSiswa.length} siswa tersedia`}
                      </p>
                      
                      {availableSiswa.length > 0 && (
                        <ScrollArea className="border rounded-lg p-3 h-48">
                          <div className="space-y-2">
                            {availableSiswa.map((siswa) => (
                              <div key={siswa.id} className="flex items-center space-x-2 pb-2">
                                <Checkbox
                                  id={`siswa_${siswa.id}`}
                                  checked={selectedSiswa.includes(siswa.id)}
                                  onCheckedChange={() => handleToggleSiswa(siswa.id)}
                                />
                                <label
                                  htmlFor={`siswa_${siswa.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {siswa.nama} ({siswa.nis})
                                </label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                      
                      {selectedSiswa.length > 0 && (
                        <div className="bg-blue-50 p-2 rounded text-sm text-blue-700">
                          ✓ {selectedSiswa.length} siswa dipilih
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingKelas ? "Perbarui" : "Simpan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Cari berdasarkan nama kelas, tingkat, atau wali kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Memuat data...</div>
          ) : filteredKelas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "Tidak ada data yang sesuai pencarian" : "Belum ada data kelas"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead>Wali Kelas</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKelas.map((kelas) => (
                  <TableRow key={kelas.id}>
                    <TableCell className="font-medium">{kelas.nama_kelas}</TableCell>
                    <TableCell>{kelas.tingkat}</TableCell>
                    <TableCell>{kelas.wali_kelas}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(kelas)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(kelas.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}