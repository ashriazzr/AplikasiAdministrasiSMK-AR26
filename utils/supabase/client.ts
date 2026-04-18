import { createClient } from "@supabase/supabase-js";

const importMetaEnv = (import.meta as ImportMeta & {
  env?: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}).env;

const supabaseUrl = importMetaEnv?.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = importMetaEnv?.VITE_SUPABASE_ANON_KEY?.trim();
const supabaseConfigError = "Supabase env tidak lengkap. Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.";

const createSupabaseErrorResult = () => ({
  data: null,
  error: new Error(supabaseConfigError),
});

const createSupabaseNoopQuery = () => {
  const queryState: any = {};

  const query = new Proxy(queryState, {
    get(_target, property) {
      if (property === "then") {
        return (resolve: (value: unknown) => void) => resolve(createSupabaseErrorResult());
      }

      if (property === "catch" || property === "finally") {
        return () => query;
      }

      return (..._args: unknown[]) => query;
    },
  });

  return query;
};

const createSupabaseNoopChannel = () => {
  const channelState: any = {};

  const channel = new Proxy(channelState, {
    get(_target, property) {
      if (property === "subscribe") {
        return (..._args: unknown[]) => channel;
      }

      if (property === "unsubscribe") {
        return (..._args: unknown[]) => Promise.resolve("ok");
      }

      return (..._args: unknown[]) => channel;
    },
  });

  return channel;
};

const createSupabaseNoopClient = () => ({
  from: () => createSupabaseNoopQuery(),
  rpc: () => Promise.resolve(createSupabaseErrorResult()),
  channel: () => createSupabaseNoopChannel(),
  removeChannel: () => Promise.resolve("ok"),
  removeAllChannels: () => Promise.resolve([]),
});

if (supabaseUrl && supabaseAnonKey && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
  console.warn("VITE_SUPABASE_URL format tidak valid:", supabaseUrl);
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (createSupabaseNoopClient() as ReturnType<typeof createClient>);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigErrorMessage = supabaseConfigError;
export const isSupabaseConfigError = (value: unknown): boolean => {
  if (typeof value === "string") return value.includes(supabaseConfigErrorMessage);
  if (value instanceof Error) return value.message.includes(supabaseConfigErrorMessage);
  if (typeof value === "object" && value !== null && "message" in value) {
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" && message.includes(supabaseConfigErrorMessage);
  }
  return false;
};

const isMissingColumnsInSchemaCache = (error: unknown, columns: string[]): boolean => {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message || "")
          : "";

  const normalized = message.toLowerCase();
  return normalized.includes("schema cache") && columns.some((column) => normalized.includes(`'${column.toLowerCase()}' column`));
};

const deriveLegacyTingkat = (namaKelas: string): string => {
  const token = namaKelas.trim().split(/\s+/)[0]?.toUpperCase() || "";
  if (token === "X" || token === "XI" || token === "XII") return token;
  return namaKelas.trim() || "X";
};

export interface Kelas { id: string; nama_kelas?: string; wali_kelas: string; jurusan?: string; tahun_ajaran?: string; created_at: string; updated_at: string; }
export interface Siswa { id: string; nama: string; kelas_id: string; nis: string; nisn: string; jenis_kelamin: string; tanggal_lahir: string; alamat: string; asal_sekolah: string; rfid_card: string; created_at: string; updated_at: string; }
export interface Administrasi { id: string; user_id?: string; nama: string; email: string; jabatan: string; telepon: string; tanggal_bergabung: string; created_at: string; updated_at: string; }
export interface Tagihan { id: string; siswa_id: string; kegiatan_id: string; jumlah: number; status: "pending" | "paid" | "overdue"; tanggal_jatuh_tempo: string; created_at: string; updated_at: string; }
export interface Pembayaran { id: string; tagihan_id: string; siswa_id: string; jumlah: number; metode_pembayaran: string; tanggal_pembayaran: string; bukti_pembayaran: string; dicatat_oleh?: string; cetak_struk?: boolean; nomor_struk?: string; created_at: string; updated_at: string; }
export interface KegiatanAdministrasi { id: string; nama_kegiatan: string; nominal: number; deskripsi: string; tanggal_mulai: string; tanggal_selesai: string; status: string; created_by?: string; created_at: string; updated_at: string; }
export interface BeasiswaAdministrasi { id: string; nama_program: string; deskripsi: string; aktif: boolean; created_at: string; updated_at: string; }
export interface BeasiswaAdministrasiSiswa { beasiswa_id: string; siswa_id: string; siswa?: SiswaWithKelas; }
export interface BeasiswaAdministrasiKegiatan { beasiswa_id: string; kegiatan_id: string; kegiatan?: KegiatanAdministrasi; }
export interface KegiatanKelas { kegiatan_id: string; kelas_id: string; }
export interface KegiatanAdministrasiWithKelas extends KegiatanAdministrasi { kegiatan_kelas?: KegiatanKelas[]; kelas_list?: Kelas[]; kelas_ids?: string[]; }
export interface BeasiswaAdministrasiWithRelations extends BeasiswaAdministrasi {
  siswa_ids?: string[];
  kegiatan_ids?: string[];
  siswa_list?: SiswaWithKelas[];
  kegiatan_list?: KegiatanAdministrasi[];
}
export interface Pengeluaran { id: string; kegiatan_id: string; deskripsi: string; jumlah: number; tanggal: string; kategori: string; keterangan?: string; created_at: string; updated_at: string; }
export interface RFIDLog { id: string; rfid_card: string; siswa_id: string | null; tipe_scan: "masuk" | "keluar" | "lihat_tagihan"; waktu_masuk: string; waktu_keluar: string | null; tanggal: string; created_at: string; }
export interface Cashflow { id: string; tanggal: string; jenis_transaksi: "income" | "expense"; kategori: string; jumlah: number; deskripsi?: string; akun_pembayaran_id?: string; pembayaran_id?: string; created_at: string; updated_at: string; }
export interface AkunPembayaran { id: string; nama_akun: string; jenis_akun: "kas" | "bank" | "dompet_digital" | "lainnya"; saldo: number; keterangan?: string; created_at: string; updated_at: string; }
export interface Kategori { id: string; nama_kategori: string; jenis: "income" | "expense"; warna: string; icon: string; urutan: number; created_at: string; updated_at: string; }
export interface SiswaWithKelas extends Siswa { kelas?: Kelas; }
export interface TagihanWithSiswa extends Tagihan { siswa?: Siswa & { kelas?: Kelas }; }
export interface PembayaranWithDetails extends Pembayaran { siswa?: Siswa & { kelas?: Kelas }; tagihan?: Tagihan; }

export const db = {
  async getKelas() { return supabase.from("kelas").select("*").order("nama_kelas"); },
  async getKelasById(id: string) { return supabase.from("kelas").select("*").eq("id", id).single(); },
  async createKelas(kelas: Omit<Kelas, "id" | "created_at" | "updated_at">) {
    const payload = {
      nama_kelas: (kelas.nama_kelas || "").trim(),
      jurusan: (kelas.jurusan || "").trim(),
      tahun_ajaran: (kelas.tahun_ajaran || "").trim(),
      wali_kelas: kelas.wali_kelas,
    };

    const legacyPayload = {
      ...payload,
      tingkat: deriveLegacyTingkat(payload.nama_kelas),
      kelas: deriveLegacyTingkat(payload.nama_kelas),
    };

    let result = await supabase.from("kelas").insert([legacyPayload]).select().single();
    if (result.error && isMissingColumnsInSchemaCache(result.error, ["tingkat", "kelas"])) {
      result = await supabase.from("kelas").insert([payload]).select().single();
    }

    return result;
  },
  async updateKelas(id: string, kelas: Partial<Kelas>) {
    const payload = {
      ...(kelas.nama_kelas !== undefined ? { nama_kelas: kelas.nama_kelas.trim() } : {}),
      ...(kelas.jurusan !== undefined ? { jurusan: kelas.jurusan.trim() } : {}),
      ...(kelas.tahun_ajaran !== undefined ? { tahun_ajaran: kelas.tahun_ajaran.trim() } : {}),
      ...(kelas.wali_kelas !== undefined ? { wali_kelas: kelas.wali_kelas } : {}),
    };

    const legacyPatch = {
      ...payload,
      ...(payload.nama_kelas ? { tingkat: deriveLegacyTingkat(payload.nama_kelas), kelas: deriveLegacyTingkat(payload.nama_kelas) } : {}),
    };

    let result = await supabase.from("kelas").update(legacyPatch).eq("id", id).select().single();
    if (result.error && isMissingColumnsInSchemaCache(result.error, ["tingkat", "kelas"])) {
      result = await supabase.from("kelas").update(payload).eq("id", id).select().single();
    }

    return result;
  },
  async deleteKelas(id: string) { const { error } = await supabase.from("kelas").delete().eq("id", id); return { error }; },

  async getSiswa() { return supabase.from("siswa").select("*").order("nama"); },
  async getSiswaWithKelas() { const { data, error } = await supabase.from("siswa").select("*, kelas:kelas_id(id, nama_kelas, wali_kelas, jurusan, tahun_ajaran, created_at, updated_at)").order("nama"); return { data: data as SiswaWithKelas[] | null, error }; },
  async getSiswaById(id: string) { return supabase.from("siswa").select("*").eq("id", id).single(); },
  async getSiswaByRFID(rfidCard: string) { const { data, error } = await supabase.from("siswa").select("*").eq("rfid_card", rfidCard).maybeSingle(); return { data, error }; },
  async createSiswa(siswa: Omit<Siswa, "id" | "created_at" | "updated_at">) {
    const payload = {
      ...siswa,
      tanggal_lahir: siswa.tanggal_lahir ? siswa.tanggal_lahir : null,
      rfid_card: siswa.rfid_card ? siswa.rfid_card : null,
    };
    return supabase.from("siswa").insert([payload]).select().single();
  },
  async updateSiswa(id: string, siswa: Partial<Siswa>) {
    const payload = {
      ...siswa,
      ...(siswa.tanggal_lahir !== undefined
        ? { tanggal_lahir: siswa.tanggal_lahir ? siswa.tanggal_lahir : null }
        : {}),
      ...(siswa.rfid_card !== undefined
        ? { rfid_card: siswa.rfid_card ? siswa.rfid_card : null }
        : {}),
    };
    return supabase.from("siswa").update(payload).eq("id", id).select().single();
  },
  async deleteSiswa(id: string) { const { error } = await supabase.from("siswa").delete().eq("id", id); return { error }; },
  async getSiswaWithoutRFID() { return supabase.from("siswa").select("*").or("rfid_card.is.null,rfid_card.eq."); },

  async getTagihan() { return supabase.from("tagihan").select("*").order("created_at", { ascending: false }); },
  async getTagihanWithSiswa() { const { data, error } = await supabase.from("tagihan").select("*, siswa:siswa_id (id, nama, nis, kelas_id, kelas:kelas_id (id, nama_kelas, wali_kelas, jurusan, tahun_ajaran))"); return { data: data as TagihanWithSiswa[] | null, error }; },
  async getTagihanBySiswaId(siswaId: string) {
    const { data, error } = await supabase.from("tagihan").select("*, kegiatan:kegiatan_id (id, nama_kegiatan, nominal, status, tanggal_selesai), pembayaran (id, jumlah)").eq("siswa_id", siswaId);
    if (error) return { data: null, error };
    const transformed = (data || []).map((t: any) => { const nominal = t.kegiatan?.nominal ?? t.jumlah ?? 0; const totalDibayar = (t.pembayaran || []).reduce((sum: number, p: any) => sum + (p.jumlah ?? 0), 0); return { ...t, nama_kegiatan: t.kegiatan?.nama_kegiatan ?? "Kegiatan", nominal, batas_pembayaran: t.tanggal_jatuh_tempo, total_dibayar: totalDibayar, sisa_bayar: Math.max(0, nominal - totalDibayar), pembayaran: undefined }; });
    return { data: transformed, error };
  },
  async createTagihan(tagihan: Omit<Tagihan, "id" | "created_at" | "updated_at">) { return supabase.from("tagihan").insert([tagihan]).select().single(); },
  async updateTagihan(id: string, tagihan: Partial<Tagihan>) { return supabase.from("tagihan").update(tagihan).eq("id", id).select().single(); },
  async checkAndUpdateOverdueTagihan() { const today = new Date().toISOString().split("T")[0]; const { error } = await supabase.from("tagihan").update({ status: "overdue", updated_at: new Date().toISOString() }).eq("status", "pending").lt("tanggal_jatuh_tempo", today); return { error }; },
  async getOverdueTagihan() { const today = new Date().toISOString().split("T")[0]; return supabase.from("tagihan").select("*, siswa:siswa_id (id, nama, nis, kelas_id, kelas:kelas_id (id, nama_kelas))").lt("tanggal_jatuh_tempo", today).in("status", ["pending", "overdue"]); },
  async markTagihanAsPaid(tagihanIds: string[]) { const { error } = await supabase.from("tagihan").update({ status: "paid", updated_at: new Date().toISOString() }).in("id", tagihanIds); return { error }; },

  async getPembayaran() {
    const { data, error } = await supabase.from("pembayaran").select("*, siswa:siswa_id (id, nama, nis, kelas_id), tagihan:tagihan_id (id, kegiatan_id, kegiatan:kegiatan_id (id, nama_kegiatan, nominal))").order("tanggal_pembayaran", { ascending: false });
    if (error) return { data: null, error };
    const transformed = (data || []).map((p: any) => ({ ...p, jumlah_bayar: p.jumlah, tanggal_bayar: p.tanggal_pembayaran, keterangan: p.bukti_pembayaran ?? "", siswa_nama: p.siswa?.nama ?? "-", siswa_nis: p.siswa?.nis ?? "-", kelas_id: p.siswa?.kelas_id ?? null, kegiatan_id: p.tagihan?.kegiatan_id ?? null, nama_kegiatan: p.tagihan?.kegiatan?.nama_kegiatan ?? "Pembayaran", kegiatan: p.tagihan?.kegiatan ?? null }));
    return { data: transformed, error };
  },
  async getPembayaranWithDetails() { const { data, error } = await supabase.from("pembayaran").select("*, siswa:siswa_id (id, nama, nis, kelas_id, kelas:kelas_id (id, nama_kelas)), tagihan:tagihan_id (id, jumlah, status, tanggal_jatuh_tempo, kegiatan_id)").order("tanggal_pembayaran", { ascending: false }); return { data: data as PembayaranWithDetails[] | null, error }; },
  async getPembayaranBySiswaId(siswaId: string) {
    const { data, error } = await supabase.from("pembayaran").select("*, tagihan:tagihan_id (id, kegiatan_id, kegiatan:kegiatan_id (id, nama_kegiatan, nominal))").eq("siswa_id", siswaId).order("tanggal_pembayaran", { ascending: false });
    if (error) return { data: null, error };
    const transformed = (data || []).map((p: any) => ({ ...p, jumlah_bayar: p.jumlah, tanggal_bayar: p.tanggal_pembayaran, keterangan: p.bukti_pembayaran ?? "", kegiatan_id: p.tagihan?.kegiatan_id ?? null, kegiatan: p.tagihan?.kegiatan ?? null, nama_kegiatan: p.tagihan?.kegiatan?.nama_kegiatan ?? "Kegiatan" }));
    return { data: transformed, error };
  },
  async createPembayaran(pembayaran: Omit<Pembayaran, "id" | "created_at" | "updated_at">) { return supabase.from("pembayaran").insert([pembayaran]).select().single(); },
  async updatePembayaran(id: string, pembayaran: Partial<Pembayaran>) { return supabase.from("pembayaran").update(pembayaran).eq("id", id).select().single(); },
  async deletePembayaran(id: string) { const { error } = await supabase.from("pembayaran").delete().eq("id", id); return { error }; },

  async createRFIDLog(log: Omit<RFIDLog, "id" | "created_at">) { return supabase.from("rfid_logs").insert([log]).select().single(); },
  async createRFIDLogWithHandle(log: { rfid_card: string; siswa_id?: string | null; waktu_masuk?: string; waktu_keluar?: string | null; tanggal?: string; tipe_scan?: "masuk" | "keluar" | "lihat_tagihan" }) { const logData = { rfid_card: log.rfid_card, siswa_id: log.siswa_id ?? null, waktu_masuk: log.waktu_masuk ?? new Date().toISOString(), waktu_keluar: log.waktu_keluar ?? null, tanggal: log.tanggal ?? new Date().toISOString().split("T")[0], tipe_scan: log.tipe_scan ?? "masuk" }; return supabase.from("rfid_logs").insert([logData]).select().single(); },
  async getRFIDLogsByDate(tanggal: string) { return supabase.from("rfid_logs").select("*").eq("tanggal", tanggal); },
  async getRFIDLogsWithSiswa(tanggal?: string) { let query = supabase.from("rfid_logs").select("*, siswa:siswa_id (id, nama, nis, kelas_id, kelas:kelas_id (id, nama_kelas))"); if (tanggal) query = query.eq("tanggal", tanggal); return query.order("waktu_masuk", { ascending: false }); },

  async getKegiatanAdministrasi() {
    const { data, error } = await supabase.from("kegiatan_administrasi").select("*, kegiatan_kelas (kelas_id, kelas:kelas_id (id, nama_kelas))").order("created_at", { ascending: false });
    if (error) return { data: null, error };
    const transformed: KegiatanAdministrasiWithKelas[] = (data || []).map((k: any) => ({ ...k, kelas_ids: k.kegiatan_kelas?.map((jt: any) => jt.kelas_id) ?? [], kelas_list: k.kegiatan_kelas?.map((jt: any) => jt.kelas).filter(Boolean) ?? [] }));
    return { data: transformed, error };
  },

  async getKegiatanAdministrasiById(id: string) {
    const { data, error } = await supabase.from("kegiatan_administrasi").select("*, kegiatan_kelas (kelas_id, kelas:kelas_id (id, nama_kelas))").eq("id", id).single();
    if (error || !data) return { data: null, error };
    const transformed: KegiatanAdministrasiWithKelas = { ...data, kelas_ids: data.kegiatan_kelas?.map((jt: any) => jt.kelas_id) ?? [], kelas_list: data.kegiatan_kelas?.map((jt: any) => jt.kelas).filter(Boolean) ?? [] };
    return { data: transformed, error };
  },

  // ✅ FIXED: Strip created_by → pakai RPC upsert_kegiatan_kelas
  async createKegiatanAdministrasi(
    kegiatan: Omit<KegiatanAdministrasi, "id" | "created_at" | "updated_at"> & { kelas_ids?: string[] }
  ) {
    const { kelas_ids, created_by, ...kegiatanData } = kegiatan as any;

    const { data, error } = await supabase
      .from("kegiatan_administrasi")
      .insert([kegiatanData])
      .select()
      .single();

    if (error || !data) {
      console.error("❌ createKegiatanAdministrasi error:", error);
      return { data: null, error };
    }

    if (kelas_ids && kelas_ids.length > 0) {
      const { error: rpcError } = await supabase.rpc("upsert_kegiatan_kelas", {
        p_kegiatan_id: data.id,
        p_kelas_ids: kelas_ids,
      });
      if (rpcError) {
        console.error("❌ upsert_kegiatan_kelas error:", rpcError);
        await supabase.from("kegiatan_administrasi").delete().eq("id", data.id);
        return { data: null, error: rpcError };
      }
    }

    return this.getKegiatanAdministrasiById(data.id);
  },

  // ✅ FIXED: Pakai RPC sync_kegiatan_kelas → trigger hanya fire untuk kelas baru
  async updateKegiatanAdministrasi(
    id: string,
    kegiatan: Partial<KegiatanAdministrasi> & { kelas_ids?: string[] }
  ) {
    const { kelas_ids, ...kegiatanData } = kegiatan;

    const { error } = await supabase
      .from("kegiatan_administrasi")
      .update(kegiatanData)
      .eq("id", id);

    if (error) return { data: null, error };

    if (kelas_ids !== undefined) {
      const { error: rpcError } = await supabase.rpc("sync_kegiatan_kelas", {
        p_kegiatan_id: id,
        p_kelas_ids: kelas_ids,
      });
      if (rpcError) {
        console.error("❌ sync_kegiatan_kelas error:", rpcError);
        return { data: null, error: rpcError };
      }
    }

    return this.getKegiatanAdministrasiById(id);
  },

  async deleteKegiatanAdministrasi(id: string) {
    await supabase.from("kegiatan_kelas").delete().eq("kegiatan_id", id);
    const { error } = await supabase.from("kegiatan_administrasi").delete().eq("id", id);
    return { error };
  },
  async addKelasToKegiatan(kegiatanId: string, kelasId: string) { return supabase.from("kegiatan_kelas").insert([{ kegiatan_id: kegiatanId, kelas_id: kelasId }]).select().single(); },
  async removeKelasFromKegiatan(kegiatanId: string, kelasId: string) { const { error } = await supabase.from("kegiatan_kelas").delete().eq("kegiatan_id", kegiatanId).eq("kelas_id", kelasId); return { error }; },

  async getBeasiswaAdministrasi() {
    const { data, error } = await supabase
      .from("beasiswa_administrasi")
      .select("*, beasiswa_administrasi_siswa (siswa_id, siswa:siswa_id (id, nama, nis, kelas_id, kelas:kelas_id (id, nama_kelas, jurusan, tahun_ajaran))), beasiswa_administrasi_kegiatan (kegiatan_id, kegiatan:kegiatan_id (id, nama_kegiatan, nominal, deskripsi, tanggal_mulai, tanggal_selesai, status, created_at, updated_at))")
      .order("created_at", { ascending: false });
    if (error) return { data: null, error };

    const transformed: BeasiswaAdministrasiWithRelations[] = (data || []).map((item: any) => ({
      ...item,
      siswa_ids: item.beasiswa_administrasi_siswa?.map((rel: any) => rel.siswa_id) ?? [],
      kegiatan_ids: item.beasiswa_administrasi_kegiatan?.map((rel: any) => rel.kegiatan_id) ?? [],
      siswa_list: item.beasiswa_administrasi_siswa?.map((rel: any) => rel.siswa).filter(Boolean) ?? [],
      kegiatan_list: item.beasiswa_administrasi_kegiatan?.map((rel: any) => rel.kegiatan).filter(Boolean) ?? [],
    }));

    return { data: transformed, error };
  },

  async getBeasiswaAdministrasiById(id: string) {
    const { data, error } = await supabase
      .from("beasiswa_administrasi")
      .select("*, beasiswa_administrasi_siswa (siswa_id, siswa:siswa_id (id, nama, nis, kelas_id, kelas:kelas_id (id, nama_kelas, jurusan, tahun_ajaran))), beasiswa_administrasi_kegiatan (kegiatan_id, kegiatan:kegiatan_id (id, nama_kegiatan, nominal, deskripsi, tanggal_mulai, tanggal_selesai, status, created_at, updated_at))")
      .eq("id", id)
      .single();

    if (error || !data) return { data: null, error };

    const transformed: BeasiswaAdministrasiWithRelations = {
      ...data,
      siswa_ids: (data as any).beasiswa_administrasi_siswa?.map((rel: any) => rel.siswa_id) ?? [],
      kegiatan_ids: (data as any).beasiswa_administrasi_kegiatan?.map((rel: any) => rel.kegiatan_id) ?? [],
      siswa_list: (data as any).beasiswa_administrasi_siswa?.map((rel: any) => rel.siswa).filter(Boolean) ?? [],
      kegiatan_list: (data as any).beasiswa_administrasi_kegiatan?.map((rel: any) => rel.kegiatan).filter(Boolean) ?? [],
    };

    return { data: transformed, error };
  },

  async createBeasiswaAdministrasi(
    beasiswa: Omit<BeasiswaAdministrasi, "id" | "created_at" | "updated_at"> & {
      siswa_ids?: string[];
      kegiatan_ids?: string[];
    }
  ) {
    const { siswa_ids = [], kegiatan_ids = [], ...beasiswaData } = beasiswa as any;

    const { data, error } = await supabase
      .from("beasiswa_administrasi")
      .insert([beasiswaData])
      .select()
      .single();

    if (error || !data) return { data: null, error };

    if (siswa_ids.length > 0) {
      const { error: siswaError } = await supabase.from("beasiswa_administrasi_siswa").insert(
        siswa_ids.map((siswa_id: string) => ({ beasiswa_id: data.id, siswa_id }))
      );
      if (siswaError) return { data: null, error: siswaError };
    }

    if (kegiatan_ids.length > 0) {
      const { error: kegiatanError } = await supabase.from("beasiswa_administrasi_kegiatan").insert(
        kegiatan_ids.map((kegiatan_id: string) => ({ beasiswa_id: data.id, kegiatan_id }))
      );
      if (kegiatanError) return { data: null, error: kegiatanError };
    }

    return this.getBeasiswaAdministrasiById(data.id);
  },

  async updateBeasiswaAdministrasi(
    id: string,
    beasiswa: Partial<BeasiswaAdministrasi> & {
      siswa_ids?: string[];
      kegiatan_ids?: string[];
    }
  ) {
    const { siswa_ids, kegiatan_ids, ...beasiswaData } = beasiswa;

    const { error } = await supabase
      .from("beasiswa_administrasi")
      .update(beasiswaData)
      .eq("id", id);

    if (error) return { data: null, error };

    if (siswa_ids !== undefined) {
      const { error: deleteError } = await supabase.from("beasiswa_administrasi_siswa").delete().eq("beasiswa_id", id);
      if (deleteError) return { data: null, error: deleteError };
      if (siswa_ids.length > 0) {
        const { error: siswaError } = await supabase.from("beasiswa_administrasi_siswa").insert(
          siswa_ids.map((siswa_id) => ({ beasiswa_id: id, siswa_id }))
        );
        if (siswaError) return { data: null, error: siswaError };
      }
    }

    if (kegiatan_ids !== undefined) {
      const { error: deleteError } = await supabase.from("beasiswa_administrasi_kegiatan").delete().eq("beasiswa_id", id);
      if (deleteError) return { data: null, error: deleteError };
      if (kegiatan_ids.length > 0) {
        const { error: kegiatanError } = await supabase.from("beasiswa_administrasi_kegiatan").insert(
          kegiatan_ids.map((kegiatan_id) => ({ beasiswa_id: id, kegiatan_id }))
        );
        if (kegiatanError) return { data: null, error: kegiatanError };
      }
    }

    return this.getBeasiswaAdministrasiById(id);
  },

  async deleteBeasiswaAdministrasi(id: string) {
    await supabase.from("beasiswa_administrasi_siswa").delete().eq("beasiswa_id", id);
    await supabase.from("beasiswa_administrasi_kegiatan").delete().eq("beasiswa_id", id);
    const { error } = await supabase.from("beasiswa_administrasi").delete().eq("id", id);
    return { error };
  },

  async getPengeluaran() { return supabase.from("pengeluaran").select("*").order("tanggal", { ascending: false }); },
  async getPengeluaranByKegiatan(kegiatanId: string) { return supabase.from("pengeluaran").select("*").eq("kegiatan_id", kegiatanId).order("tanggal", { ascending: false }); },
  async createPengeluaran(pengeluaran: Omit<Pengeluaran, "id" | "created_at" | "updated_at">) { return supabase.from("pengeluaran").insert([pengeluaran]).select().single(); },
  async updatePengeluaran(id: string, pengeluaran: Partial<Pengeluaran>) { return supabase.from("pengeluaran").update(pengeluaran).eq("id", id).select().single(); },
  async deletePengeluaran(id: string) { const { error } = await supabase.from("pengeluaran").delete().eq("id", id); return { error }; },

  async getAdministrasi() { return supabase.from("administrasi").select("*").order("created_at", { ascending: false }); },
  async getAdministrasiById(id: string) { return supabase.from("administrasi").select("*").eq("id", id).single(); },
  async createAdministrasi(administrasi: Omit<Administrasi, "id" | "created_at" | "updated_at">) { return supabase.from("administrasi").insert([administrasi]).select().single(); },
  async updateAdministrasi(id: string, administrasi: Partial<Administrasi>) { return supabase.from("administrasi").update(administrasi).eq("id", id).select().single(); },
  async deleteAdministrasi(id: string) { const { error } = await supabase.from("administrasi").delete().eq("id", id); return { error }; },

  async getCashflow(startDate?: string, endDate?: string) { let query = supabase.from("cashflow").select("*").order("tanggal", { ascending: false }); if (startDate) query = query.gte("tanggal", startDate); if (endDate) query = query.lte("tanggal", endDate); return query; },
  async getCashflowByType(jenis: "income" | "expense", startDate?: string, endDate?: string) { let query = supabase.from("cashflow").select("*").eq("jenis_transaksi", jenis).order("tanggal", { ascending: false }); if (startDate) query = query.gte("tanggal", startDate); if (endDate) query = query.lte("tanggal", endDate); return query; },
  async getCashflowWithDetails() { return supabase.from("cashflow").select("*, akun:akun_pembayaran_id (id, nama_akun, jenis_akun), pembayaran:pembayaran_id (id, jumlah, metode_pembayaran)").order("tanggal", { ascending: false }); },
  async createCashflow(cashflow: Omit<Cashflow, "id" | "created_at" | "updated_at">) { return supabase.from("cashflow").insert([cashflow]).select().single(); },
  async updateCashflow(id: string, cashflow: Partial<Cashflow>) { return supabase.from("cashflow").update(cashflow).eq("id", id).select().single(); },
  async deleteCashflow(id: string) { const { error } = await supabase.from("cashflow").delete().eq("id", id); return { error }; },

  async getAkunPembayaran() { return supabase.from("akun_pembayaran").select("*").order("created_at", { ascending: false }); },
  async getAkunPembayaranById(id: string) { return supabase.from("akun_pembayaran").select("*").eq("id", id).single(); },
  async createAkunPembayaran(akun: Omit<AkunPembayaran, "id" | "created_at" | "updated_at">) { return supabase.from("akun_pembayaran").insert([akun]).select().single(); },
  async updateAkunPembayaran(id: string, akun: Partial<AkunPembayaran>) { return supabase.from("akun_pembayaran").update(akun).eq("id", id).select().single(); },
  async deleteAkunPembayaran(id: string) { const { error } = await supabase.from("akun_pembayaran").delete().eq("id", id); return { error }; },

  async getKategori() { return supabase.from("kategori").select("*").order("urutan").order("nama_kategori"); },
  async getKategoriByJenis(jenis: "income" | "expense") { return supabase.from("kategori").select("*").eq("jenis", jenis).order("urutan").order("nama_kategori"); },
  async getKategoriById(id: string) { return supabase.from("kategori").select("*").eq("id", id).single(); },
  async createKategori(kategori: Omit<Kategori, "id" | "created_at" | "updated_at">) { return supabase.from("kategori").insert([kategori]).select().single(); },
  async updateKategori(id: string, kategori: Partial<Kategori>) { return supabase.from("kategori").update(kategori).eq("id", id).select().single(); },
  async deleteKategori(id: string) { const { error } = await supabase.from("kategori").delete().eq("id", id); return { error }; },

  // 🆕 Auto-sync pembayaran (income) to cashflow
  async getPembayaranByKegiatan(kegiatanId: string) {
    const { data, error } = await supabase
      .from("pembayaran")
      .select("*, tagihan:tagihan_id (id, kegiatan_id, siswa_id)")
      .eq("tagihan.kegiatan_id", kegiatanId)
      .order("tanggal_pembayaran", { ascending: false });
    return { data, error };
  },

  // 🆕 Get aggregated income from pembayaran for a kegiatan
  async getKegiatanIncome(kegiatanId: string) {
    const { data, error } = await supabase
      .from("pembayaran")
      .select("jumlah, tanggal_pembayaran")
      .eq("tagihan.kegiatan_id", kegiatanId);
    if (error) return { data: null, error };
    const totalIncome = (data || []).reduce((sum: number, p: any) => sum + (p.jumlah || 0), 0);
    return { data: { total: totalIncome, records: data }, error };
  },

  // 🆕 Create income entry in pengeluaran (as negative expense) from pembayaran
  async syncPembayaranToIncome(pembayaranId: string, kegiatanId: string, siswaId: string, jumlah: number, tanggal: string) {
    const incomeKategori = await supabase
      .from("kategori")
      .select("id")
      .eq("jenis", "income")
      .order("urutan")
      .limit(1)
      .single();
    
    if (incomeKategori.error || !incomeKategori.data) {
      return { error: new Error("Income kategori tidak ditemukan") };
    }

    return supabase.from("pengeluaran").insert([
      {
        kegiatan_id: kegiatanId,
        jenis: "income",
        kategori: incomeKategori.data.id,
        jumlah: jumlah,
        tanggal: tanggal,
        deskripsi: `Pembayaran dari siswa (ID: ${siswaId.substring(0, 8)}...)`,
        pembayaran_id: pembayaranId,
      },
    ]).select().single();
  },

  // 🆕 Update pembayaran with print receipt info
  async updatePembayaranCetakStruk(id: string, cetak_struk: boolean, nomor_struk?: string) {
    const data: any = { cetak_struk, updated_at: new Date().toISOString() };
    if (nomor_struk) data.nomor_struk = nomor_struk;
    return supabase.from("pembayaran").update(data).eq("id", id).select().single();
  },
};

export default supabase;
