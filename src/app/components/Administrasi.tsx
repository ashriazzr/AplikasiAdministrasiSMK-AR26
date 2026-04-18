import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Plus, Edit, Trash2, Search, Eye, Mail, Phone, Calendar, Briefcase, FileSpreadsheet, User } from "lucide-react";
import { db } from "../../../utils/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Admin {
  id: string;
  nama: string;
  email: string;
  jabatan: string;
  telepon: string;
  tanggal_bergabung: string;
  created_at?: string;
  updated_at?: string;
}

const JABATAN_OPTIONS = ["Guru", "Pembina OSIS", "Pembina Pramuka"];

const parseJabatanList = (value: string) =>
  value
    .split(/[,;|\n]/g)
    .map((item) => item.trim())
    .filter(Boolean);

const serializeJabatanList = (items: string[]) => items.join(", ");

const uniqueList = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

export default function Administrasi() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [viewingAdmin, setViewingAdmin] = useState<Admin | null>(null);
  const [filterJabatan, setFilterJabatan] = useState("");
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    jabatan: [] as string[],
    telepon: "",
    tanggal_bergabung: "",
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await db.getAdministrasi();

      if (error) {
        toast.error("Gagal memuat data administrasi: " + error.message);
        setAdmins([]);
        return;
      }

      setAdmins(data || []);
    } catch (error) {
      console.error("Error fetching administrasi:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Gagal memuat data administrasi: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi nomor telepon
    if (!/^[0-9+\-\s()]+$/.test(formData.telepon)) {
      toast.error("Nomor telepon tidak valid");
      return;
    }

    try {
      const payload = {
        ...formData,
        jabatan: serializeJabatanList(formData.jabatan),
      };

      if (editingAdmin) {
        const { error } = await db.updateAdministrasi(editingAdmin.id, payload);
        if (error) {
          toast.error("Gagal mengupdate administrasi: " + error.message);
          return;
        }
        toast.success("✅ Data berhasil diperbarui");
      } else {
        const { error } = await db.createAdministrasi(payload);
        if (error) {
          toast.error("Gagal membuat administrasi: " + error.message);
          return;
        }
        toast.success("✅ Data berhasil ditambahkan");
      }
      
      setDialogOpen(false);
      resetForm();
      fetchAdmins();
    } catch (error) {
      console.error("Error saving administrasi:", error);
      toast.error(`❌ Terjadi kesalahan: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data "${nama}"?\n\nData yang dihapus tidak dapat dikembalikan.`)) return;
    
    try {
      const { error } = await db.deleteAdministrasi(id);
      
      if (error) {
        toast.error("Gagal menghapus data: " + error.message);
        return;
      }
      
      toast.success("✅ Data berhasil dihapus");
      fetchAdmins();
    } catch (error) {
      console.error("Error deleting administrasi:", error);
      toast.error("❌ Terjadi kesalahan");
    }
  };

  const openEditDialog = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      nama: admin.nama,
      email: admin.email,
      jabatan: parseJabatanList(admin.jabatan),
      telepon: admin.telepon,
      tanggal_bergabung: admin.tanggal_bergabung.split('T')[0],
    });
    setDialogOpen(true);
  };

  const openDetailDialog = (admin: Admin) => {
    setViewingAdmin(admin);
    setDetailDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAdmin(null);
    setFormData({
      nama: "",
      email: "",
      jabatan: [],
      telepon: "",
      tanggal_bergabung: "",
    });
  };

  const exportToExcel = () => {
    if (filteredAdmins.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const excelData = filteredAdmins.map((admin, index) => ({
      No: index + 1,
      "Nama Lengkap": admin.nama,
      Email: admin.email,
      Jabatan: admin.jabatan,
      Telepon: admin.telepon,
      "Tanggal Bergabung": new Date(admin.tanggal_bergabung).toLocaleDateString('id-ID'),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 25 },  // Nama
      { wch: 30 },  // Email
      { wch: 20 },  // Jabatan
      { wch: 15 },  // Telepon
      { wch: 18 },  // Tanggal
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Data Administrasi");
    const filename = `Data_Administrasi_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    toast.success("✅ Data berhasil diekspor ke Excel");
  };

  const filteredAdmins = admins.filter((admin) => {
    const jabatanText = parseJabatanList(admin.jabatan).join(" ");
    const matchesSearch = 
      admin.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jabatanText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.telepon.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesJabatan = filterJabatan === "" || parseJabatanList(admin.jabatan).includes(filterJabatan);
    
    return matchesSearch && matchesJabatan;
  });

  const uniqueJabatan = [...new Set(admins.flatMap((admin) => parseJabatanList(admin.jabatan)))].sort();

  const formatJabatanDisplay = (jabatan: string) => parseJabatanList(jabatan).join(", ") || "-";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getJabatanColor = (jabatan: string) => {
    const colors: Record<string, string> = {
      "Guru": "bg-blue-100 text-blue-800",
      "Pembina OSIS": "bg-rose-100 text-rose-800",
      "Pembina Pramuka": "bg-emerald-100 text-emerald-800",
    };
    return colors[jabatan] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Data Administrasi</h1>
        <p className="text-gray-500 mt-1">Kelola data staff administrasi sekolah</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Staff</p>
                <p className="text-2xl font-bold">{admins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Jumlah Jabatan</p>
                <p className="text-2xl font-bold">{uniqueJabatan.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Search className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Hasil Filter</p>
                <p className="text-2xl font-bold">{filteredAdmins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={exportToExcel}
              disabled={filteredAdmins.length === 0}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Export Excel
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Daftar Administrasi</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Data
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[92vh] overflow-hidden p-0">
                <DialogHeader>
                  <DialogTitle>
                    {editingAdmin ? "Edit Data Administrasi" : "Tambah Data Administrasi"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAdmin ? "Perbarui informasi administrasi" : "Masukkan informasi administrasi baru"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[92vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-6 py-4 overflow-y-auto">
                    <div className="space-y-1.5">
                      <Label htmlFor="nama">Nama Lengkap</Label>
                      <Input
                        id="nama"
                        placeholder="Masukkan nama lengkap"
                        value={formData.nama}
                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contoh@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="jabatan">Jabatan</Label>
                      <div className="rounded-lg border p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {JABATAN_OPTIONS.map((option) => (
                          <label key={option} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1 hover:bg-gray-50">
                            <Checkbox
                              checked={formData.jabatan.includes(option)}
                              onCheckedChange={(checked: boolean | "indeterminate") => {
                                setFormData((prev) => ({
                                  ...prev,
                                  jabatan: checked
                                    ? uniqueList([...prev.jabatan, option])
                                    : prev.jabatan.filter((item) => item !== option),
                                }));
                              }}
                            />
                            <span className="text-sm leading-none">{option}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">1 data administrasi bisa punya lebih dari 1 jabatan.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="telepon">Telepon</Label>
                      <Input
                        id="telepon"
                        placeholder="08123456789"
                        value={formData.telepon}
                        onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                        required
                      />
                      <p className="text-xs text-gray-500">Format: angka, +, -, spasi, atau ()</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tanggal_bergabung">Tanggal Bergabung</Label>
                      <Input
                        id="tanggal_bergabung"
                        type="date"
                        value={formData.tanggal_bergabung}
                        onChange={(e) => setFormData({ ...formData, tanggal_bergabung: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter className="px-6 py-4 border-t bg-white mt-auto">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingAdmin ? "Perbarui" : "Simpan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Cari berdasarkan nama, email, jabatan, atau telepon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <select
                value={filterJabatan}
                onChange={(e) => setFilterJabatan(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Jabatan</option>
                {uniqueJabatan.map((jabatan) => (
                  <option key={jabatan} value={jabatan}>
                    {jabatan}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(searchTerm || filterJabatan) && (
            <div className="mb-4 flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterJabatan("");
                }}
              >
                Reset Filter
              </Button>
              <span className="text-sm text-gray-500">
                Menampilkan {filteredAdmins.length} dari {admins.length} data
              </span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Memuat data...</div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || filterJabatan ? "Tidak ada data yang sesuai dengan filter" : "Belum ada data administrasi"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Tanggal Bergabung</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin, index) => (
                    <TableRow key={admin.id} className="hover:bg-gray-50">
                      <TableCell className="text-gray-500">{index + 1}</TableCell>
                      <TableCell className="font-medium">{admin.nama}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {parseJabatanList(admin.jabatan).map((jabatan) => (
                            <span key={jabatan} className={`px-3 py-1 rounded-full text-xs font-medium ${getJabatanColor(jabatan)}`}>
                              {jabatan}
                            </span>
                          ))}
                          {parseJabatanList(admin.jabatan).length === 0 && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {admin.telepon}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(admin.tanggal_bergabung)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailDialog(admin)}
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(admin)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(admin.id, admin.nama)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Administrasi</DialogTitle>
            <DialogDescription>
              Informasi lengkap staff administrasi
            </DialogDescription>
          </DialogHeader>
          {viewingAdmin && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{viewingAdmin.nama}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {parseJabatanList(viewingAdmin.jabatan).map((jabatan) => (
                      <span key={jabatan} className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getJabatanColor(jabatan)}`}>
                        {jabatan}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{viewingAdmin.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Telepon</p>
                    <p className="font-medium">{viewingAdmin.telepon}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Jabatan</p>
                    <p className="font-medium">{formatJabatanDisplay(viewingAdmin.jabatan)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Tanggal Bergabung</p>
                    <p className="font-medium">{formatDate(viewingAdmin.tanggal_bergabung)}</p>
                  </div>
                </div>

                {viewingAdmin.created_at && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Data Dibuat</p>
                      <p className="font-medium text-sm">{formatDate(viewingAdmin.created_at)}</p>
                    </div>
                  </div>
                )}

                {viewingAdmin.updated_at && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Terakhir Diupdate</p>
                      <p className="font-medium text-sm">{formatDate(viewingAdmin.updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDetailDialogOpen(false)}
                  className="flex-1"
                >
                  Tutup
                </Button>
                <Button
                  onClick={() => {
                    setDetailDialogOpen(false);
                    openEditDialog(viewingAdmin);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Data
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}