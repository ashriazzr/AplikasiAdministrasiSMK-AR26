import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Users, GraduationCap, School, TrendingUp, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { db, isSupabaseConfigured, isSupabaseConfigError, supabaseConfigErrorMessage } from "../../../utils/supabase/client";
import { toast } from "sonner";
import { LayoutWrapper } from "./LayoutWrapper";

interface Stats {
  totalAdministrasi: number;
  totalSiswa: number;
  totalKelas: number;
  siswaByKelas: Record<string, number>;
  siswaByGender: {
    laki: number;
    perempuan: number;
  };
}

interface CashflowSummary {
  totalKegiatan: number;
  totalPenerimaan: number;
  sisaPenerimaan: number;
  rataRataPengumpulan: number;
}

interface RecentTransaction {
  id: string;
  siswa_nama: string;
  kegiatan_nama: string;
  jumlah_bayar: number;
  tanggal_bayar: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>({
    totalAdministrasi: 0,
    totalSiswa: 0,
    totalKelas: 0,
    siswaByKelas: {},
    siswaByGender: {
      laki: 0,
      perempuan: 0,
    },
  });
  const [cashflow, setCashflow] = useState<CashflowSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [kelasData, setKelasData] = useState<any[]>([]);
  const [configWarning, setConfigWarning] = useState<string>("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConfigWarning(supabaseConfigErrorMessage);
      setLoading(false);
      return;
    }

    fetchStats();
    fetchKelas();
    fetchCashflowData();
    fetchRecentTransactions();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: siswaData, error: siswaError } = await db.getSiswa();
      const { data: kelasData, error: kelasError } = await db.getKelas();

      if (siswaError || kelasError) {
        if (isSupabaseConfigError(siswaError || kelasError)) {
          setConfigWarning(supabaseConfigErrorMessage);
          return;
        }
        toast.error("Gagal memuat statistik: " + (siswaError?.message || kelasError?.message));
        return;
      }

      // Calculate stats from actual data
      const totalSiswa = siswaData?.length || 0;
      const totalKelas = kelasData?.length || 0;

      // Group siswa by kelas
      const siswaByKelas: Record<string, number> = {};
      siswaData?.forEach((siswa) => {
        siswaByKelas[siswa.kelas_id] = (siswaByKelas[siswa.kelas_id] || 0) + 1;
      });

      // Count by gender
      const siswaByGender = {
        laki: siswaData?.filter((s) => s.jenis_kelamin === "Laki-laki").length || 0,
        perempuan: siswaData?.filter((s) => s.jenis_kelamin === "Perempuan").length || 0,
      };

      setStats({
        totalAdministrasi: 0, // We'd need to query administrasi table separately if needed
        totalSiswa,
        totalKelas,
        siswaByKelas,
        siswaByGender,
      });
    } catch (error) {
      if (isSupabaseConfigError(error)) {
        setConfigWarning(supabaseConfigErrorMessage);
        return;
      }
      toast.error("Error fetching stats: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const fetchKelas = async () => {
    try {
      const { data, error } = await db.getKelas();

      if (error) {
        if (isSupabaseConfigError(error)) {
          setConfigWarning(supabaseConfigErrorMessage);
          return;
        }
        toast.error("Gagal memuat data kelas: " + error.message);
        return;
      }

      setKelasData(data || []);
    } catch (error) {
      if (isSupabaseConfigError(error)) {
        setConfigWarning(supabaseConfigErrorMessage);
        return;
      }
      toast.error("Error fetching kelas: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const fetchCashflowData = async () => {
    try {
      const { data: kegiatanData, error: kegiatanError } = await db.getKegiatanAdministrasi();
      const { data: pembayaranData, error: pembayaranError } = await db.getPembayaran();
      const { data: siswaData, error: siswaError } = await db.getSiswa();

      if (kegiatanError || pembayaranError || siswaError) {
        throw new Error(
          "Gagal memuat data cashflow: " +
            (kegiatanError?.message || pembayaranError?.message || siswaError?.message)
        );
      }

      let totalPenerimaan = 0;
      let totalSisaPenerimaan = 0;
      let totalRataRata = 0;

      const cashflowSummary = kegiatanData?.map((kegiatan) => {
        const pembayaranForKegiatan =
          pembayaranData?.filter((p) => p.kegiatan_id === kegiatan.id) || [];

        const totalPembayaran = pembayaranForKegiatan.reduce(
          (sum, p) => sum + (p.jumlah || 0),
          0
        );

        const siswaInKelas =
          siswaData?.filter((s) => kegiatan.kelas_ids?.includes?.(s.kelas_id)) || [];

        const siswaYangBayar = new Set(
          pembayaranForKegiatan.map((p) => p.siswa_id)
        ).size;

        const persentaseTerbayar =
          siswaInKelas.length > 0
            ? (siswaYangBayar / siswaInKelas.length) * 100
            : 0;

        totalPenerimaan += totalPembayaran;
        totalSisaPenerimaan +=
          kegiatan.nominal * siswaInKelas.length - totalPembayaran;
        totalRataRata += persentaseTerbayar;

        return {
          kegiatan_id: kegiatan.id,
          nama_kegiatan: kegiatan.nama_kegiatan,
          nominal: kegiatan.nominal,
          total_pembayaran: totalPembayaran,
          total_siswa: siswaInKelas.length,
          siswa_terbayar: siswaYangBayar,
          persentase_terbayar: persentaseTerbayar,
        };
      }) || [];

      setCashflow({
        totalKegiatan: kegiatanData?.length || 0,
        totalPenerimaan,
        sisaPenerimaan: totalSisaPenerimaan,
        rataRataPengumpulan:
          cashflowSummary.length > 0
            ? totalRataRata / cashflowSummary.length
            : 0,
      });
    } catch (error) {
      if (isSupabaseConfigError(error)) {
        setConfigWarning(supabaseConfigErrorMessage);
        return;
      }
      toast.error(error instanceof Error ? error.message : "Error fetching cashflow data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const { data: pembayaranData, error } = await db.getPembayaran();
      const { data: siswaData } = await db.getSiswa();

      if (error) {
        if (isSupabaseConfigError(error)) {
          setConfigWarning(supabaseConfigErrorMessage);
          return;
        }
        toast.error("Gagal memuat transaksi: " + error.message);
        return;
      }

      const transactions: RecentTransaction[] =
        pembayaranData
          ?.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 5)
          .map((p) => {
            const siswaInfo = siswaData?.find((s) => s.id === p.siswa_id);
            return {
              id: p.id,
              siswa_nama: siswaInfo?.nama || "Unknown",
              kegiatan_nama: "Pembayaran", // Generic name since kegiatan info requires complex join
              jumlah_bayar: p.jumlah || 0,
              tanggal_bayar: p.tanggal_pembayaran,
            };
          }) || [];

      setRecentTransactions(transactions);
    } catch (error) {
      if (isSupabaseConfigError(error)) {
        setConfigWarning(supabaseConfigErrorMessage);
        return;
      }
      toast.error("Error fetching recent transactions: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const genderChartData = useMemo(
    () => [
      {
        id: "laki",
        name: "Laki-laki",
        value: stats?.siswaByGender?.laki || 0,
        color: "#3b82f6",
      },
      {
        id: "perempuan",
        name: "Perempuan",
        value: stats?.siswaByGender?.perempuan || 0,
        color: "#ec4899",
      },
    ],
    [stats?.siswaByGender?.laki, stats?.siswaByGender?.perempuan]
  );

  const kelasChartData = useMemo(
    () =>
      kelasData.map((kelas) => ({
        id: kelas.id,
        name: kelas.nama_kelas || "Unknown",
        siswa: stats?.siswaByKelas?.[kelas.id] || 0,
      })),
    [kelasData, stats?.siswaByKelas]
  );

  const maxSiswa = useMemo(() => {
    const max = Math.max(...kelasChartData.map((k) => k.siswa), 0);
    return max > 0 ? max : 1;
  }, [kelasChartData]);

  const totalGender =
    (stats?.siswaByGender?.laki || 0) + (stats?.siswaByGender?.perempuan || 0);
  const lakiPercentage =
    totalGender > 0
      ? ((stats?.siswaByGender?.laki || 0) / totalGender) * 100
      : 0;
  const perempuanPercentage =
    totalGender > 0
      ? ((stats?.siswaByGender?.perempuan || 0) / totalGender) * 100
      : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-gray-500">Memuat data...</div>
      </div>
    );
  }


  return (
    <LayoutWrapper title="Dashboard" subtitle="Laporan dan Statistik Administrasi Sekolah">

      {configWarning && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">Konfigurasi Supabase belum lengkap</p>
          <p className="text-sm mt-1">{configWarning}</p>
        </div>
      )}

      {/* Core Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Siswa</CardTitle>
            <GraduationCap className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">{stats?.totalSiswa || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Siswa terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Kelas</CardTitle>
            <School className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">{stats?.totalKelas || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Kelas aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Staff Administrasi</CardTitle>
            <Users className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">{stats?.totalAdministrasi || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Staff aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Siswa per Kelas</CardTitle>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-800">
              {stats?.totalKelas ? Math.round((stats?.totalSiswa || 0) / stats.totalKelas) : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Rata-rata</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary Cards */}
      {cashflow && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Penerimaan</CardTitle>
              <DollarSign className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(cashflow.totalPenerimaan)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Semua kegiatan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Sisa Penerimaan</CardTitle>
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {formatCurrency(cashflow.sisaPenerimaan)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Belum terkumpul</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Kegiatan</CardTitle>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800">{cashflow.totalKegiatan}</div>
              <p className="text-xs text-gray-500 mt-1">Kegiatan aktif</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pengumpulan Rata-rata</CardTitle>
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-800">
                {cashflow.rataRataPengumpulan.toFixed(0)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Dari semua kegiatan</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Detailed Views */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Distribusi Siswa per Kelas</CardTitle>
          </CardHeader>
          <CardContent>
            {kelasChartData.length > 0 ? (
              <div className="space-y-4 py-4">
                {kelasChartData.map((kelas) => (
                  <div key={`bar-${kelas.id}`} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{kelas.name}</span>
                      <span className="text-sm font-bold text-blue-600">{kelas.siswa} siswa</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${(kelas.siswa / maxSiswa) * 100}%` }}
                      >
                        {kelas.siswa > 0 && (
                          <span className="text-xs text-white font-medium">{kelas.siswa}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Belum ada data kelas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Siswa Berdasarkan Jenis Kelamin</CardTitle>
          </CardHeader>
          <CardContent>
            {totalGender > 0 ? (
              <div className="space-y-6 py-4">
                <div className="flex w-full h-12 rounded-lg overflow-hidden">
                  <div
                    className="bg-blue-500 flex items-center justify-center text-white font-medium text-sm transition-all duration-500"
                    style={{ width: `${lakiPercentage}%` }}
                  >
                    {lakiPercentage > 15 && `${lakiPercentage.toFixed(0)}%`}
                  </div>
                  <div
                    className="bg-pink-500 flex items-center justify-center text-white font-medium text-sm transition-all duration-500"
                    style={{ width: `${perempuanPercentage}%` }}
                  >
                    {perempuanPercentage > 15 && `${perempuanPercentage.toFixed(0)}%`}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {stats?.siswaByGender.laki || 0}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Laki-laki</div>
                      <div className="text-xs text-gray-500">{lakiPercentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-pink-50 rounded-lg">
                    <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {stats?.siswaByGender.perempuan || 0}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Perempuan</div>
                      <div className="text-xs text-gray-500">{perempuanPercentage.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Belum ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>5 Transaksi Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-700">Nama Siswa</th>
                    <th className="text-left p-3 font-medium text-gray-700">Kegiatan</th>
                    <th className="text-right p-3 font-medium text-gray-700">Jumlah Bayar</th>
                    <th className="text-left p-3 font-medium text-gray-700">Tanggal Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{transaction.siswa_nama}</td>
                      <td className="p-3">{transaction.kegiatan_nama}</td>
                      <td className="p-3 text-right font-medium text-green-600">
                        {formatCurrency(transaction.jumlah_bayar)}
                      </td>
                      <td className="p-3">{formatDate(transaction.tanggal_bayar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </LayoutWrapper>
  );
}