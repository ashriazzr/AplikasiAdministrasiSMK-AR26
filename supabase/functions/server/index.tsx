import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

type HonoContext = any; // Type for Hono context

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-d70cf9fb/health", (c: HonoContext) => {
  return c.json({ status: "ok" });
});

// ============ KELAS ROUTES ============
// Get all kelas
app.get("/make-server-d70cf9fb/kelas", async (c: HonoContext) => {
  try {
    const kelasData = await kv.getByPrefix("kelas:");
    return c.json({ success: true, data: kelasData });
  } catch (error) {
    console.log("Error fetching kelas:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create kelas
app.post("/make-server-d70cf9fb/kelas", async (c: HonoContext) => {
  try {
    const body = await c.req.json();
    const id = `kelas:${Date.now()}`;
    const kelasData = {
      id,
      nama_kelas: body.nama_kelas,
      tingkat: body.tingkat,
      wali_kelas: body.wali_kelas,
      created_at: new Date().toISOString(),
    };
    await kv.set(id, kelasData);
    return c.json({ success: true, data: kelasData });
  } catch (error) {
    console.log("Error creating kelas:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update kelas
app.put("/make-server-d70cf9fb/kelas/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(id);
    
    if (!existing) {
      return c.json({ success: false, error: "Kelas not found" }, 404);
    }
    
    const updatedData = {
      ...existing,
      ...body,
      id,
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(id, updatedData);
    return c.json({ success: true, data: updatedData });
  } catch (error) {
    console.log("Error updating kelas:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete kelas
app.delete("/make-server-d70cf9fb/kelas/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    await kv.del(id);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting kelas:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ ADMINISTRASI ROUTES ============
// Get all administrasi
app.get("/make-server-d70cf9fb/administrasi", async (c: HonoContext) => {
  try {
    const administrasiData = await kv.getByPrefix("admin:");
    return c.json({ success: true, data: administrasiData });
  } catch (error) {
    console.log("Error fetching administrasi:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create administrasi
app.post("/make-server-d70cf9fb/administrasi", async (c: HonoContext) => {
  try {
    const body = await c.req.json();
    const id = `admin:${Date.now()}`;
    const adminData = {
      id,
      nama: body.nama,
      email: body.email,
      jabatan: body.jabatan,
      telepon: body.telepon,
      tanggal_bergabung: body.tanggal_bergabung,
      created_at: new Date().toISOString(),
    };
    await kv.set(id, adminData);
    return c.json({ success: true, data: adminData });
  } catch (error) {
    console.log("Error creating administrasi:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update administrasi
app.put("/make-server-d70cf9fb/administrasi/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(id);
    
    if (!existing) {
      return c.json({ success: false, error: "Administrasi not found" }, 404);
    }
    
    const updatedData = {
      ...existing,
      ...body,
      id,
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(id, updatedData);
    return c.json({ success: true, data: updatedData });
  } catch (error) {
    console.log("Error updating administrasi:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete administrasi
app.delete("/make-server-d70cf9fb/administrasi/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    await kv.del(id);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting administrasi:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ SISWA ROUTES ============
// Get all siswa
app.get("/make-server-d70cf9fb/siswa", async (c: HonoContext) => {
  try {
    const siswaData = await kv.getByPrefix("siswa:");
    return c.json({ success: true, data: siswaData });
  } catch (error) {
    console.log("Error fetching siswa:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create siswa
app.post("/make-server-d70cf9fb/siswa", async (c: HonoContext) => {
  try {
    const body = await c.req.json();
    const id = `siswa:${Date.now()}`;
    const siswaData = {
      id,
      nama: body.nama,
      kelas_id: body.kelas_id,
      nis: body.nis,
      jenis_kelamin: body.jenis_kelamin,
      tanggal_lahir: body.tanggal_lahir,
      alamat: body.alamat,
      rfid_card: body.rfid_card || "",
      created_at: new Date().toISOString(),
    };
    await kv.set(id, siswaData);
    return c.json({ success: true, data: siswaData });
  } catch (error) {
    console.log("Error creating siswa:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update siswa
app.put("/make-server-d70cf9fb/siswa/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(id);
    
    if (!existing) {
      return c.json({ success: false, error: "Siswa not found" }, 404);
    }
    
    const updatedData = {
      ...existing,
      ...body,
      id,
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(id, updatedData);
    return c.json({ success: true, data: updatedData });
  } catch (error) {
    console.log("Error updating siswa:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete siswa
app.delete("/make-server-d70cf9fb/siswa/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    await kv.del(id);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting siswa:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ DASHBOARD STATS ============
app.get("/make-server-d70cf9fb/stats", async (c: HonoContext) => {
  try {
    const [administrasi, siswa, kelas] = await Promise.all([
      kv.getByPrefix("admin:"),
      kv.getByPrefix("siswa:"),
      kv.getByPrefix("kelas:"),
    ]);
    
    // Count siswa by kelas
    const siswaByKelas: Record<string, number> = {};
    siswa.forEach((s: any) => {
      if (s.kelas_id) {
        siswaByKelas[s.kelas_id] = (siswaByKelas[s.kelas_id] || 0) + 1;
      }
    });
    
    // Count siswa by gender
    const siswaByGender = {
      laki: siswa.filter((s: any) => s.jenis_kelamin === 'Laki-laki').length,
      perempuan: siswa.filter((s: any) => s.jenis_kelamin === 'Perempuan').length,
    };
    
    return c.json({
      success: true,
      data: {
        totalAdministrasi: administrasi.length,
        totalSiswa: siswa.length,
        totalKelas: kelas.length,
        siswaByKelas,
        siswaByGender,
      },
    });
  } catch (error) {
    console.log("Error fetching stats:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ KEGIATAN ADMINISTRASI ROUTES ============
// Get all kegiatan administrasi
app.get("/make-server-d70cf9fb/kegiatan-administrasi", async (c) => {
  try {
    const kegiatanData = await kv.getByPrefix("kegiatan:");
    return c.json({ success: true, data: kegiatanData });
  } catch (error) {
    console.log("Error fetching kegiatan administrasi:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create kegiatan administrasi
app.post("/make-server-d70cf9fb/kegiatan-administrasi", async (c) => {
  try {
    const body = await c.req.json();
    const id = `kegiatan:${Date.now()}`;
    const kegiatanData = {
      id,
      nama_kegiatan: body.nama_kegiatan,
      nominal: body.nominal,
      batas_pembayaran: body.batas_pembayaran,
      kelas_ids: body.kelas_ids, // Array of kelas IDs
      created_at: new Date().toISOString(),
    };
    await kv.set(id, kegiatanData);
    return c.json({ success: true, data: kegiatanData });
  } catch (error) {
    console.log("Error creating kegiatan administrasi:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update kegiatan administrasi
app.put("/make-server-d70cf9fb/kegiatan-administrasi/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(id);
    
    if (!existing) {
      return c.json({ success: false, error: "Kegiatan not found" }, 404);
    }
    
    const updatedData = {
      ...existing,
      ...body,
      id,
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(id, updatedData);
    return c.json({ success: true, data: updatedData });
  } catch (error) {
    console.log("Error updating kegiatan administrasi:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete kegiatan administrasi
app.delete("/make-server-d70cf9fb/kegiatan-administrasi/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(id);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting kegiatan administrasi:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ PEMBAYARAN/TAGIHAN ROUTES ============
// Get siswa by kelas
app.get("/make-server-d70cf9fb/siswa-by-kelas/:kelasId", async (c: HonoContext) => {
  try {
    const kelasId = c.req.param("kelasId");
    const allSiswa = await kv.getByPrefix("siswa:");
    const siswaByKelas = allSiswa.filter((s: any) => s.kelas_id === kelasId);
    return c.json({ success: true, data: siswaByKelas });
  } catch (error) {
    console.log("Error fetching siswa by kelas:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get tagihan for a student
app.get("/make-server-d70cf9fb/tagihan/:siswaId", async (c) => {
  try {
    const siswaId = c.req.param("siswaId");
    const siswa = await kv.get(siswaId);
    
    if (!siswa) {
      return c.json({ success: false, error: "Siswa not found" }, 404);
    }
    
    // Get all kegiatan for this student's class
    const allKegiatan = await kv.getByPrefix("kegiatan:");
    const kegiatanForSiswa = allKegiatan.filter((k: any) => 
      k.kelas_ids && k.kelas_ids.includes(siswa.kelas_id)
    );
    
    // Get all pembayaran for this student
    const allPembayaran = await kv.getByPrefix("pembayaran:");
    const pembayaranSiswa = allPembayaran.filter((p: any) => p.siswa_id === siswaId);
    
    // Calculate tagihan
    const tagihan = kegiatanForSiswa.map((kegiatan: any) => {
      const pembayaranForKegiatan = pembayaranSiswa.filter(
        (p: any) => p.kegiatan_id === kegiatan.id
      );
      const totalDibayar = pembayaranForKegiatan.reduce(
        (sum: number, p: any) => sum + (p.jumlah_bayar || 0), 
        0
      );
      const sisaBayar = kegiatan.nominal - totalDibayar;
      
      return {
        kegiatan_id: kegiatan.id,
        nama_kegiatan: kegiatan.nama_kegiatan,
        nominal: kegiatan.nominal,
        batas_pembayaran: kegiatan.batas_pembayaran,
        total_dibayar: totalDibayar,
        sisa_bayar: sisaBayar,
        status: sisaBayar <= 0 ? "Lunas" : "Belum Lunas",
        pembayaran: pembayaranForKegiatan,
      };
    });
    
    return c.json({ success: true, data: tagihan });
  } catch (error) {
    console.log("Error fetching tagihan:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all tagihan records for analytics
app.get("/make-server-d70cf9fb/tagihan", async (c: HonoContext) => {
  try {
    // Get all siswa
    const allSiswa = await kv.getByPrefix("siswa:");
    
    // Get all kegiatan
    const allKegiatan = await kv.getByPrefix("kegiatan:");
    
    // Get all pembayaran
    const allPembayaran = await kv.getByPrefix("pembayaran:");
    
    // Build complete tagihan list
    const allTagihan: any[] = [];

    allSiswa.forEach((siswa: any) => {
      // Get kegiatan for this siswa's class
      const kegiatanForClass = allKegiatan.filter((kg: any) =>
        kg.kelas_ids && kg.kelas_ids.includes(siswa.kelas_id)
      );

      // Calculate tagihan for each kegiatan
      kegiatanForClass.forEach((kg: any) => {
        const pembayaranForKegiatan = allPembayaran.filter(
          (p: any) => p.kegiatan_id === kg.id && p.siswa_id === siswa.id
        );

        const totalDibayar = pembayaranForKegiatan.reduce(
          (sum: number, p: any) => sum + (p.jumlah_bayar || 0),
          0
        );

        const sisaBayar = kg.nominal - totalDibayar;
        let status: "lunas" | "sebagian" | "belum_bayar" = "belum_bayar";

        if (sisaBayar <= 0) {
          status = "lunas";
        } else if (totalDibayar > 0) {
          status = "sebagian";
        }

        allTagihan.push({
          id: `${siswa.id}-${kg.id}`,
          siswa_id: siswa.id,
          siswa_nama: siswa.nama,
          siswa_nis: siswa.nis,
          kegiatan_id: kg.id,
          kegiatan_nama: kg.nama_kegiatan,
          nominal: kg.nominal,
          tanggal_jatuh_tempo: kg.batas_pembayaran || "",
          status,
          sisa_bayar: sisaBayar,
          total_dibayar: totalDibayar,
        });
      });
    });

    return c.json({ success: true, data: allTagihan });
  } catch (error) {
    console.log("Error fetching all tagihan:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create pembayaran
app.post("/make-server-d70cf9fb/pembayaran", async (c: HonoContext) => {
  try {
    const body = await c.req.json();
    const id = `pembayaran:${Date.now()}`;
    const pembayaranData = {
      id,
      siswa_id: body.siswa_id,
      kegiatan_id: body.kegiatan_id,
      jumlah_bayar: body.jumlah_bayar,
      tanggal_bayar: body.tanggal_bayar || new Date().toISOString(),
      keterangan: body.keterangan || "",
      created_at: new Date().toISOString(),
    };
    await kv.set(id, pembayaranData);
    return c.json({ success: true, data: pembayaranData });
  } catch (error) {
    console.log("Error creating pembayaran:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all pembayaran
app.get("/make-server-d70cf9fb/pembayaran", async (c: HonoContext) => {
  try {
    const pembayaranData = await kv.getByPrefix("pembayaran:");
    return c.json({ success: true, data: pembayaranData });
  } catch (error) {
    console.log("Error fetching pembayaran:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update pembayaran
app.put("/make-server-d70cf9fb/pembayaran/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    // Always use pembayaran: prefix with the numeric ID
    const fullId = `pembayaran:${id}`;
    
    const existing = await kv.get(fullId);
    
    if (!existing) {
      return c.json({ success: false, error: "Pembayaran tidak ditemukan" }, 404);
    }
    
    const updatedData = {
      ...existing,
      ...body,
      id: fullId,
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(fullId, updatedData);
    return c.json({ success: true, data: updatedData });
  } catch (error) {
    console.log("Error updating pembayaran:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete pembayaran
app.delete("/make-server-d70cf9fb/pembayaran/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    
    // Always use pembayaran: prefix with the numeric ID
    const fullId = `pembayaran:${id}`;
    
    const existing = await kv.get(fullId);
    
    if (!existing) {
      return c.json({ success: false, error: "Pembayaran tidak ditemukan" }, 404);
    }
    
    await kv.del(fullId);
    return c.json({ success: true, message: "Pembayaran berhasil dihapus" });
  } catch (error) {
    console.log("Error deleting pembayaran:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get payment statistics
app.get("/make-server-d70cf9fb/payment-stats", async (c: HonoContext) => {
  try {
    const [kegiatan, pembayaran, siswa, kelas] = await Promise.all([
      kv.getByPrefix("kegiatan:"),
      kv.getByPrefix("pembayaran:"),
      kv.getByPrefix("siswa:"),
      kv.getByPrefix("kelas:"),
    ]);
    
    // Calculate stats per kelas
    const statsByKelas: Record<string, any> = {};
    kelas.forEach((k: any) => {
      const siswaInKelas = siswa.filter((s: any) => s.kelas_id === k.id);
      const kegiatanForKelas = kegiatan.filter((kg: any) => 
        kg.kelas_ids && kg.kelas_ids.includes(k.id)
      );
      
      const totalTagihan = kegiatanForKelas.reduce((sum: number, kg: any) => 
        sum + (kg.nominal * siswaInKelas.length), 0
      );
      
      const pembayaranKelas = pembayaran.filter((p: any) => {
        const siswaObj = siswa.find((s: any) => s.id === p.siswa_id);
        return siswaObj && siswaObj.kelas_id === k.id;
      });
      
      const totalDibayar = pembayaranKelas.reduce((sum: number, p: any) => 
        sum + (p.jumlah_bayar || 0), 0
      );
      
      statsByKelas[k.id] = {
        nama_kelas: k.nama_kelas,
        total_siswa: siswaInKelas.length,
        total_tagihan: totalTagihan,
        total_dibayar: totalDibayar,
        sisa_tagihan: totalTagihan - totalDibayar,
      };
    });
    
    // Calculate stats per kegiatan
    const statsByKegiatan: Record<string, any> = {};
    kegiatan.forEach((kg: any) => {
      const siswaForKegiatan = siswa.filter((s: any) => 
        kg.kelas_ids && kg.kelas_ids.includes(s.kelas_id)
      );
      
      const totalTagihan = kg.nominal * siswaForKegiatan.length;
      
      const pembayaranKegiatan = pembayaran.filter((p: any) => 
        p.kegiatan_id === kg.id
      );
      
      const totalDibayar = pembayaranKegiatan.reduce((sum: number, p: any) => 
        sum + (p.jumlah_bayar || 0), 0
      );
      
      statsByKegiatan[kg.id] = {
        nama_kegiatan: kg.nama_kegiatan,
        nominal: kg.nominal,
        total_siswa: siswaForKegiatan.length,
        total_tagihan: totalTagihan,
        total_dibayar: totalDibayar,
        sisa_tagihan: totalTagihan - totalDibayar,
      };
    });
    
    return c.json({
      success: true,
      data: {
        statsByKelas,
        statsByKegiatan,
      },
    });
  } catch (error) {
    console.log("Error fetching payment stats:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ PENGELUARAN (EXPENSE) ROUTES ============
// Create pengeluaran
app.post("/make-server-d70cf9fb/pengeluaran", async (c: HonoContext) => {
  try {
    const body = await c.req.json();
    const id = `pengeluaran:${Date.now()}`;
    const pengeluaranData = {
      id,
      kegiatan_id: body.kegiatan_id,
      deskripsi: body.deskripsi,
      jumlah: body.jumlah,
      tanggal: body.tanggal || new Date().toISOString(),
      kategori: body.kategori || "lainnya",
      keterangan: body.keterangan || "",
      created_at: new Date().toISOString(),
    };
    await kv.set(id, pengeluaranData);
    return c.json({ success: true, data: pengeluaranData });
  } catch (error) {
    console.log("Error creating pengeluaran:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all pengeluaran
app.get("/make-server-d70cf9fb/pengeluaran", async (c: HonoContext) => {
  try {
    const pengeluaranData = await kv.getByPrefix("pengeluaran:");
    return c.json({ success: true, data: pengeluaranData });
  } catch (error) {
    console.log("Error fetching pengeluaran:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get pengeluaran by kegiatan
app.get("/make-server-d70cf9fb/pengeluaran/:kegiatanId", async (c: HonoContext) => {
  try {
    const kegiatanId = c.req.param("kegiatanId");
    const allPengeluaran = await kv.getByPrefix("pengeluaran:");
    const filtered = allPengeluaran.filter((p: any) => p.kegiatan_id === kegiatanId);
    return c.json({ success: true, data: filtered });
  } catch (error) {
    console.log("Error fetching pengeluaran by kegiatan:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update pengeluaran
app.put("/make-server-d70cf9fb/pengeluaran/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const fullId = `pengeluaran:${id}`;
    const existing = await kv.get(fullId);
    
    if (!existing) {
      return c.json({ success: false, error: "Pengeluaran tidak ditemukan" }, 404);
    }
    
    const updatedData = {
      ...existing,
      ...body,
      id: fullId,
      updated_at: new Date().toISOString(),
    };
    
    await kv.set(fullId, updatedData);
    return c.json({ success: true, data: updatedData });
  } catch (error) {
    console.log("Error updating pengeluaran:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Delete pengeluaran
app.delete("/make-server-d70cf9fb/pengeluaran/:id", async (c: HonoContext) => {
  try {
    const id = c.req.param("id");
    
    const fullId = `pengeluaran:${id}`;
    const existing = await kv.get(fullId);
    
    if (!existing) {
      return c.json({ success: false, error: "Pengeluaran tidak ditemukan" }, 404);
    }
    
    await kv.del(fullId);
    return c.json({ success: true, message: "Pengeluaran berhasil dihapus" });
  } catch (error) {
    console.log("Error deleting pengeluaran:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ============ RFID SCANNER ROUTES ============
// Get siswa by RFID card
app.get("/make-server-d70cf9fb/rfid/:cardId", async (c: HonoContext) => {
  try {
    const cardId = c.req.param("cardId");
    console.log("RFID scan request for card:", cardId);
    
    const allSiswa = await kv.getByPrefix("siswa:");
    const siswa = allSiswa.find((s: any) => s.rfid_card === cardId);
    
    if (!siswa) {
      return c.json({ 
        success: false, 
        error: "Kartu RFID tidak terdaftar",
        message: "Kartu RFID tidak ditemukan dalam sistem"
      }, 404);
    }
    
    // Get kelas info
    const kelas = await kv.get(siswa.kelas_id);
    
    // Get tagihan for this student
    const allKegiatan = await kv.getByPrefix("kegiatan:");
    const kegiatanForSiswa = allKegiatan.filter((k: any) => 
      k.kelas_ids && k.kelas_ids.includes(siswa.kelas_id)
    );
    
    const allPembayaran = await kv.getByPrefix("pembayaran:");
    const pembayaranSiswa = allPembayaran.filter((p: any) => p.siswa_id === siswa.id);
    
    const tagihan = kegiatanForSiswa.map((kegiatan: any) => {
      const pembayaranForKegiatan = pembayaranSiswa.filter(
        (p: any) => p.kegiatan_id === kegiatan.id
      );
      const totalDibayar = pembayaranForKegiatan.reduce(
        (sum: number, p: any) => sum + (p.jumlah_bayar || 0), 
        0
      );
      const sisaBayar = kegiatan.nominal - totalDibayar;
      
      return {
        kegiatan_id: kegiatan.id,
        nama_kegiatan: kegiatan.nama_kegiatan,
        nominal: kegiatan.nominal,
        batas_pembayaran: kegiatan.batas_pembayaran,
        total_dibayar: totalDibayar,
        sisa_bayar: sisaBayar,
        status: sisaBayar <= 0 ? "Lunas" : "Belum Lunas",
      };
    });
    
    return c.json({ 
      success: true, 
      data: {
        siswa: {
          ...siswa,
          kelas_nama: kelas?.nama_kelas || "Unknown"
        },
        tagihan: tagihan,
      }
    });
  } catch (error) {
    console.log("Error fetching siswa by RFID:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Arduino scan endpoint - for Arduino to POST RFID data
app.post("/make-server-d70cf9fb/rfid-scan", async (c: HonoContext) => {
  try {
    const body = await c.req.json();
    const cardId = body.card_id || body.cardId || body.rfid;
    
    if (!cardId) {
      return c.json({ success: false, error: "Card ID is required" }, 400);
    }
    
    console.log("Arduino RFID scan received:", cardId);
    
    // Store the last scanned card temporarily
    await kv.set("rfid:last_scan", {
      card_id: cardId,
      timestamp: new Date().toISOString(),
    });
    
    // Get siswa data
    const allSiswa = await kv.getByPrefix("siswa:");
    const siswa = allSiswa.find((s: any) => s.rfid_card === cardId);
    
    if (!siswa) {
      return c.json({ 
        success: false, 
        error: "Card not registered",
        card_id: cardId 
      }, 404);
    }
    
    return c.json({ 
      success: true, 
      message: "Card scanned successfully",
      card_id: cardId,
      siswa_nama: siswa.nama,
      siswa_nis: siswa.nis,
    });
  } catch (error) {
    console.log("Error processing RFID scan from Arduino:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get last RFID scan (for frontend polling)
app.get("/make-server-d70cf9fb/rfid-last-scan", async (c: HonoContext) => {
  try {
    const lastScan = await kv.get("rfid:last_scan");
    
    if (!lastScan) {
      return c.json({ success: true, data: null });
    }
    
    // Check if scan is recent (within last 10 seconds)
    const scanTime = new Date(lastScan.timestamp).getTime();
    const now = new Date().getTime();
    const diffSeconds = (now - scanTime) / 1000;
    
    if (diffSeconds > 10) {
      return c.json({ success: true, data: null });
    }
    
    return c.json({ success: true, data: lastScan });
  } catch (error) {
    console.log("Error fetching last RFID scan:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Clear last RFID scan (after processing)
app.delete("/make-server-d70cf9fb/rfid-last-scan", async (c: HonoContext) => {
  try {
    await kv.del("rfid:last_scan");
    return c.json({ success: true });
  } catch (error) {
    console.log("Error clearing last RFID scan:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Fallback & Debugging - catch all routes
app.all("*", (c: HonoContext) => {
  const method = c.req.method;
  const path = c.req.path;
  console.log(`[404] Unmatched route: ${method} ${path}`);
  return c.json(
    { 
      success: false, 
      error: "Route not found",
      method,
      path,
      message: `No route matched for ${method} ${path}`
    },
    404
  );
});

// Deno Edge Functions handler
Deno.serve((req: Request) => app.fetch(req));