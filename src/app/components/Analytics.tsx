import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Download, RefreshCw, TrendingUp, TrendingDown,
  Users, AlertTriangle, CheckCircle, Clock, Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import { db, supabase } from "../../../utils/supabase/client";
import { toast } from "sonner";
import { LayoutWrapper, PageSection } from "./LayoutWrapper";

// ─── Types sesuai schema DB ───────────────────────────────────────────────────
interface PembayaranRow {
  id: string;
  siswa_id: string;
  tagihan_id: string;
  jumlah: number;                    // ✅ field DB: jumlah
  metode_pembayaran: string;
  tanggal_pembayaran: string;        // ✅ field DB: tanggal_pembayaran
  bukti_pembayaran?: string;
  // alias dari getPembayaran() di client.ts
  jumlah_bayar?: number;
  tanggal_bayar?: string;
  siswa_nama?: string;
  siswa_nis?: string;
  kelas_id?: string;
  kegiatan_id?: string;
  nama_kegiatan?: string;
  siswa?: { id: string; nama: string; nis: string; kelas_id: string } | null;
  tagihan?: { kegiatan_id: string; kegiatan?: { nama_kegiatan: string; nominal: number } } | null;
}

interface TagihanRow {
  id: string;
  siswa_id: string;
  kegiatan_id: string;
  jumlah: number;
  status: "pending" | "paid" | "overdue";
  tanggal_jatuh_tempo: string;
  bulan?: number;
  tahun: number;
  siswa?: { id: string; nama: string; nis: string; kelas_id: string; kelas?: { id: string; nama_kelas: string; tingkat: string } } | null;
}

interface KelasRow { id: string; nama_kelas: string; tingkat: string; }
interface KegiatanRow { id: string; nama_kegiatan: string; nominal: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rp = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

// Normalize semua variasi nama field agar konsisten
const getJumlah   = (p: PembayaranRow) => p.jumlah_bayar ?? p.jumlah ?? 0;
const getTanggal  = (p: PembayaranRow) => p.tanggal_bayar ?? p.tanggal_pembayaran ?? "";
const getSiswaName = (p: PembayaranRow) => p.siswa_nama ?? p.siswa?.nama ?? "-";
const getKegiatanName = (p: PembayaranRow) => p.nama_kegiatan ?? p.tagihan?.kegiatan?.nama_kegiatan ?? "Lainnya";

// DB status: paid=lunas, pending=belum bayar, overdue=jatuh tempo
const statusLabel: Record<string, string> = {
  paid:    "Lunas",
  pending: "Belum Bayar",
  overdue: "Jatuh Tempo",
};
const statusColor: Record<string, string> = {
  paid:    "#10b981",
  pending: "#3b82f6",
  overdue: "#ef4444",
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
interface SummaryCardProps {
  title: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; trend?: number;
}
const SummaryCard = ({ title, value, sub, icon, color, trend }: SummaryCardProps) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
              {Math.abs(trend)}% dari total
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl`} style={{ background: color + "20" }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const RpTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {rp(p.value)}</p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Analytics: React.FC = () => {
  const [pembayaran, setPembayaran]   = useState<PembayaranRow[]>([]);
  const [tagihan, setTagihan]         = useState<TagihanRow[]>([]);
  const [kelas, setKelas]             = useState<KelasRow[]>([]);
  const [kegiatan, setKegiatan]       = useState<KegiatanRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // Filter state
  const [filterKelas, setFilterKelas]         = useState("all");
  const [filterKegiatan, setFilterKegiatan]   = useState("all");
  const [filterTahun, setFilterTahun]         = useState("all");

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel("analytics-pembayaran")
      .on("postgres_changes", { event: "*", schema: "public", table: "pembayaran" }, fetchAll)
      .subscribe();
    const ch2 = supabase.channel("analytics-tagihan")
      .on("postgres_changes", { event: "*", schema: "public", table: "tagihan" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, t, k, kg] = await Promise.all([
        db.getPembayaran(),
        db.getTagihanWithSiswa(),
        db.getKelas(),
        db.getKegiatanAdministrasi(),
      ]);
      if (!p.error && p.data)   setPembayaran(p.data as PembayaranRow[]);
      if (!t.error && t.data)   setTagihan(t.data as unknown as TagihanRow[]);
      if (!k.error && k.data)   setKelas(k.data as KelasRow[]);
      if (!kg.error && kg.data) setKegiatan((kg.data as any[]).map(d => ({ id: d.id, nama_kegiatan: d.nama_kegiatan, nominal: d.nominal })));
    } catch (e) {
      toast.error("Gagal memuat data analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
    toast.success("Data diperbarui");
  };

  // ── Filter tagihan berdasarkan pilihan ──────────────────────────────────────
  const filteredTagihan = useMemo(() => tagihan.filter(t => {
    if (filterKelas !== "all" && t.siswa?.kelas_id !== filterKelas) return false;
    if (filterKegiatan !== "all" && t.kegiatan_id !== filterKegiatan) return false;
    if (filterTahun !== "all" && String(t.tahun) !== filterTahun) return false;
    return true;
  }), [tagihan, filterKelas, filterKegiatan, filterTahun]);

  const filteredPembayaran = useMemo(() => pembayaran.filter(p => {
    if (filterKelas !== "all" && (p.kelas_id ?? p.siswa?.kelas_id) !== filterKelas) return false;
    if (filterKegiatan !== "all" && p.kegiatan_id !== filterKegiatan) return false;
    if (filterTahun !== "all") {
      const tgl = getTanggal(p);
      if (!tgl || new Date(tgl).getFullYear() !== Number(filterTahun)) return false;
    }
    return true;
  }), [pembayaran, filterKelas, filterKegiatan, filterTahun]);

  // ── Summary ─────────────────────────────────────────────────────────────────
  const totalTertagih  = filteredTagihan.reduce((s, t) => s + (t.jumlah ?? 0), 0);
  const totalTerbayar  = filteredPembayaran.reduce((s, p) => s + getJumlah(p), 0);
  const totalTunggakan = totalTertagih - totalTerbayar;
  const kolektibilitas = pct(totalTerbayar, totalTertagih);

  const jmlLunas    = filteredTagihan.filter(t => t.status === "paid").length;
  const jmlBelum    = filteredTagihan.filter(t => t.status === "pending").length;
  const jmlOverdue  = filteredTagihan.filter(t => t.status === "overdue").length;
  const totalTagihanCount = filteredTagihan.length;

  // ── Status Pie ───────────────────────────────────────────────────────────────
  const statusPieData = [
    { name: "Lunas",       value: jmlLunas,   fill: "#10b981", amount: filteredTagihan.filter(t => t.status === "paid").reduce((s,t) => s + t.jumlah, 0) },
    { name: "Belum Bayar", value: jmlBelum,   fill: "#3b82f6", amount: filteredTagihan.filter(t => t.status === "pending").reduce((s,t) => s + t.jumlah, 0) },
    { name: "Jatuh Tempo", value: jmlOverdue, fill: "#ef4444", amount: filteredTagihan.filter(t => t.status === "overdue").reduce((s,t) => s + t.jumlah, 0) },
  ].filter(d => d.value > 0);

  // ── Tren Bulanan ─────────────────────────────────────────────────────────────
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { label: string; terbayar: number; tertagih: number }> = {};
    filteredPembayaran.forEach(p => {
      const tgl = getTanggal(p);
      if (!tgl) return;
      const d = new Date(tgl);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { label, terbayar: 0, tertagih: 0 };
      map[key].terbayar += getJumlah(p);
    });
    filteredTagihan.forEach(t => {
      const d = new Date(t.tanggal_jatuh_tempo || `${t.tahun}-${t.bulan ?? 1}-01`);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { label, terbayar: 0, tertagih: 0 };
      map[key].tertagih += t.jumlah ?? 0;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [filteredPembayaran, filteredTagihan]);

  // ── Per Kegiatan ──────────────────────────────────────────────────────────────
  const perKegiatan = useMemo(() => {
    const map: Record<string, { nama: string; terbayar: number; tertagih: number; count: number }> = {};
    filteredTagihan.forEach(t => {
      const kgId = t.kegiatan_id;
      const kgNama = kegiatan.find(k => k.id === kgId)?.nama_kegiatan ?? "Lainnya";
      if (!map[kgId]) map[kgId] = { nama: kgNama, terbayar: 0, tertagih: 0, count: 0 };
      map[kgId].tertagih += t.jumlah ?? 0;
      map[kgId].count++;
    });
    filteredPembayaran.forEach(p => {
      const kgId = p.kegiatan_id ?? "";
      if (map[kgId]) map[kgId].terbayar += getJumlah(p);
    });
    return Object.values(map).sort((a, b) => b.tertagih - a.tertagih).slice(0, 8);
  }, [filteredTagihan, filteredPembayaran, kegiatan]);

  // ── Kolektibilitas per Kelas ──────────────────────────────────────────────────
  const perKelas = useMemo(() => {
    const map: Record<string, { nama: string; lunas: number; total: number; nominal_lunas: number; nominal_total: number }> = {};
    filteredTagihan.forEach(t => {
      const kId = t.siswa?.kelas_id ?? "";
      const kNama = kelas.find(k => k.id === kId)?.nama_kelas ?? "Tanpa Kelas";
      if (!map[kId]) map[kId] = { nama: kNama, lunas: 0, total: 0, nominal_lunas: 0, nominal_total: 0 };
      map[kId].total++;
      map[kId].nominal_total += t.jumlah ?? 0;
      if (t.status === "paid") { map[kId].lunas++; map[kId].nominal_lunas += t.jumlah ?? 0; }
    });
    return Object.values(map)
      .filter(k => k.total > 0)
      .map(k => ({ ...k, pct: pct(k.lunas, k.total) }))
      .sort((a, b) => b.pct - a.pct);
  }, [filteredTagihan, kelas]);

  // ── Top Tunggakan ──────────────────────────────────────────────────────────────
  const topTunggakan = useMemo(() => {
    const map: Record<string, { nama: string; total: number; count: number }> = {};
    filteredTagihan.filter(t => t.status !== "paid").forEach(t => {
      const sid = t.siswa_id;
      const nama = t.siswa?.nama ?? "Unknown";
      if (!map[sid]) map[sid] = { nama, total: 0, count: 0 };
      map[sid].total += t.jumlah ?? 0;
      map[sid].count++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [filteredTagihan]);

  // ── Tahun tersedia ─────────────────────────────────────────────────────────────
  const availableTahun = useMemo(() => {
    const years = new Set(tagihan.map(t => t.tahun).filter(Boolean));
    return Array.from(years).sort((a, b) => b - a);
  }, [tagihan]);

  // ── Export ─────────────────────────────────────────────────────────────────────
  const exportLaporan = () => {
    if (filteredPembayaran.length === 0) { toast.error("Tidak ada data untuk diekspor"); return; }
    const rows = filteredPembayaran.map((p, i) => ({
      "No": i + 1,
      "Tanggal": getTanggal(p) ? new Date(getTanggal(p)).toLocaleDateString("id-ID") : "-",
      "Nama Siswa": getSiswaName(p),
      "Kegiatan": getKegiatanName(p),
      "Jumlah Bayar": getJumlah(p),
      "Metode": p.metode_pembayaran ?? "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pembayaran");
    // Sheet tunggakan
    const tRows = topTunggakan.map((s, i) => ({
      "No": i + 1, "Nama Siswa": s.nama,
      "Jumlah Tagihan": s.count, "Total Tunggakan": s.total,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tRows), "Tunggakan");
    XLSX.writeFile(wb, `Analytics-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Laporan berhasil diekspor");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"/>
        <p className="text-sm text-gray-500">Memuat data analytics...</p>
      </div>
    </div>
  );

  return (
    <LayoutWrapper title="Analytics & Laporan" subtitle="Ringkasan pembayaran, tagihan, dan tunggakan siswa">

      {/* ── Header Actions ─────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={14} className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}/>
            {refreshing ? "Memuat..." : "Perbarui"}
          </Button>
          <Button size="sm" onClick={exportLaporan}>
            <Download size={14} className="mr-1.5"/> Export Excel
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
              <Filter size={14}/> Filter:
            </div>
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
            >
              <option value="all">Semua Kelas</option>
              {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterKegiatan} onChange={e => setFilterKegiatan(e.target.value)}
            >
              <option value="all">Semua Kegiatan</option>
              {kegiatan.map(k => <option key={k.id} value={k.id}>{k.nama_kegiatan}</option>)}
            </select>
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterTahun} onChange={e => setFilterTahun(e.target.value)}
            >
              <option value="all">Semua Tahun</option>
              {availableTahun.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {(filterKelas !== "all" || filterKegiatan !== "all" || filterTahun !== "all") && (
              <button
                className="text-xs text-red-500 hover:text-red-700 underline"
                onClick={() => { setFilterKelas("all"); setFilterKegiatan("all"); setFilterTahun("all"); }}
              >Reset filter</button>
            )}
            <span className="ml-auto text-xs text-gray-400">
              {filteredTagihan.length} tagihan · {filteredPembayaran.length} pembayaran
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          title="Total Terbayar"
          value={rp(totalTerbayar)}
          sub={`${filteredPembayaran.length} transaksi`}
          icon={<CheckCircle size={20}/>}
          color="#10b981"
          trend={kolektibilitas}
        />
        <SummaryCard
          title="Total Tertagih"
          value={rp(totalTertagih)}
          sub={`${totalTagihanCount} tagihan`}
          icon={<Users size={20}/>}
          color="#3b82f6"
        />
        <SummaryCard
          title="Total Tunggakan"
          value={rp(totalTunggakan < 0 ? 0 : totalTunggakan)}
          sub={`${jmlOverdue} jatuh tempo · ${jmlBelum} pending`}
          icon={<AlertTriangle size={20}/>}
          color="#ef4444"
        />
        <SummaryCard
          title="Kolektibilitas"
          value={`${kolektibilitas}%`}
          sub={`${jmlLunas} lunas dari ${totalTagihanCount}`}
          icon={<TrendingUp size={20}/>}
          color="#8b5cf6"
        />
      </div>

      {/* ── Kolektibilitas per Kelas ────────────────────────────────────────── */}
      {perKelas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kolektibilitas per Kelas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {perKelas.map(k => (
                <div key={k.nama} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{k.nama}</span>
                    <span className="text-gray-500">
                      {k.lunas}/{k.total} lunas &nbsp;·&nbsp;
                      <span className={k.pct >= 80 ? "text-emerald-600 font-semibold" : k.pct >= 50 ? "text-amber-600 font-semibold" : "text-red-500 font-semibold"}>
                        {k.pct}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${k.pct}%`,
                        background: k.pct >= 80 ? "#10b981" : k.pct >= 50 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Row: Pie Status + Bar per Kegiatan ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Tagihan</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-gray-400">Tidak ada data tagihan</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusPieData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                    </Pie>
                    <Tooltip formatter={(v: any, name) => [`${v} tagihan`, name]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-around text-xs mt-1">
                  {statusPieData.map(s => (
                    <div key={s.name} className="text-center">
                      <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ background: s.fill }}/>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-gray-500">{rp(s.amount)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bar per Kegiatan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tagihan vs Terbayar per Kegiatan</CardTitle>
          </CardHeader>
          <CardContent>
            {perKegiatan.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-gray-400">Tidak ada data kegiatan</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={perKegiatan} margin={{ left: 0, right: 10, top: 5, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis
                    dataKey="nama" tick={{ fontSize: 10 }}
                    angle={-30} textAnchor="end" interval={0}
                  />
                  <YAxis tickFormatter={v => `${(v/1e6).toFixed(0)}jt`} tick={{ fontSize: 10 }}/>
                  <Tooltip content={<RpTooltip/>}/>
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }}/>
                  <Bar dataKey="tertagih" name="Tertagih" fill="#93c5fd" radius={[3,3,0,0]}/>
                  <Bar dataKey="terbayar" name="Terbayar" fill="#3b82f6" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tren Bulanan ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tren Pembayaran Bulanan</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrend.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">Belum ada data pembayaran</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradTerbayar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradTertagih" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#93c5fd" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="label" tick={{ fontSize: 11 }}/>
                <YAxis tickFormatter={v => `${(v/1e6).toFixed(0)}jt`} tick={{ fontSize: 11 }}/>
                <Tooltip content={<RpTooltip/>}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Area type="monotone" dataKey="tertagih" name="Tertagih" stroke="#93c5fd" strokeWidth={1.5} fill="url(#gradTertagih)"/>
                <Area type="monotone" dataKey="terbayar" name="Terbayar" stroke="#3b82f6" strokeWidth={2} fill="url(#gradTerbayar)" dot={{ r: 4 }}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Top Tunggakan ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500"/> Daftar Tunggakan Terbesar (Top 15)
          </CardTitle>
          <span className="text-xs text-gray-400">{topTunggakan.length} siswa</span>
        </CardHeader>
        <CardContent>
          {topTunggakan.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <CheckCircle size={36} className="text-emerald-400"/>
              <p className="text-sm font-medium text-emerald-600">Semua tagihan sudah lunas!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b">
                    <th className="pb-2 pr-4">No</th>
                    <th className="pb-2 pr-4">Nama Siswa</th>
                    <th className="pb-2 pr-4">Jml Tagihan Belum Lunas</th>
                    <th className="pb-2 pr-4 text-right">Total Tunggakan</th>
                    <th className="pb-2 text-center">Proporsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topTunggakan.map((s, i) => {
                    const prop = pct(s.total, totalTunggakan);
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 pr-4 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-medium text-gray-800">{s.nama}</td>
                        <td className="py-2.5 pr-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
                            <Clock size={10}/> {s.count} tagihan
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-bold text-red-600">{rp(s.total)}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-red-400 rounded-full" style={{ width: `${prop}%` }}/>
                            </div>
                            <span className="text-xs text-gray-400 w-8 text-right">{prop}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </LayoutWrapper>
  );
};

export default Analytics;
