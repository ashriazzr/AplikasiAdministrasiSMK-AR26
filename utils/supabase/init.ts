import { supabase } from "./client";

/**
 * Database initialization helper
 * Checks if required tables exist and provides utility functions
 */

export interface InitializationResult {
  success: boolean;
  message: string;
  tables?: string[];
  error?: string;
}

/**
 * Check if database is properly initialized
 */
export async function checkDatabaseHealth(): Promise<InitializationResult> {
  try {
    const requiredTables = [
      "kelas",
      "siswa",
      "administrasi",
      "tagihan",
      "pembayaran",
      "rfid_logs",
      "kegiatan_administrasi",
      "cashflow",
      "akun_pembayaran",
    ];

    const results = [];
    let allTablesExist = true;

    for (const table of requiredTables) {
      try {
        const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });

        if (error && error.message.includes("does not exist")) {
          results.push(`❌ ${table}`);
          allTablesExist = false;
        } else if (error) {
          results.push(`⚠️ ${table} (Error: ${error.message})`);
        } else {
          results.push(`✅ ${table} (${count} records)`);
        }
      } catch (err) {
        results.push(`❌ ${table} (Exception: ${String(err)})`);
        allTablesExist = false;
      }
    }

    return {
      success: allTablesExist,
      message: allTablesExist ? "Database is properly initialized" : "Some tables are missing",
      tables: results,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to check database health",
      error: String(error),
    };
  }
}

/**
 * Seed initial data for testing
 */
export async function seedTestData(): Promise<InitializationResult> {
  try {
    // Check if kelas already exists
    const { count: kelasCount } = await supabase.from("kelas").select("*", { count: "exact", head: true });

    if (kelasCount && kelasCount > 0) {
      return {
        success: true,
        message: "Test data already exists",
      };
    }

    // Create sample data
    const sampleKelas = [
      { nama_kelas: "X-A", tingkat: "10", wali_kelas: "Ibu Siti" },
      { nama_kelas: "X-B", tingkat: "10", wali_kelas: "Bapak Bambang" },
      { nama_kelas: "XI-A", tingkat: "11", wali_kelas: "Ibu Rini" },
    ];

    const { data: kelasData, error: kelasError } = await supabase.from("kelas").insert(sampleKelas).select();

    if (kelasError) {
      return {
        success: false,
        message: "Failed to seed kelas data",
        error: kelasError.message,
      };
    }

    // Add sample siswa
    if (kelasData && kelasData.length > 0) {
      const sampleSiswa = [
        {
          nama: "Ahmad Fauzi",
          kelas_id: kelasData[0].id,
          nis: "2024001",
          jenis_kelamin: "Laki-laki",
          tanggal_lahir: "2009-05-15",
          alamat: "Jl. Merdeka No. 10",
          rfid_card: "01020304",
        },
        {
          nama: "Siti Nurhaliza",
          kelas_id: kelasData[0].id,
          nis: "2024002",
          jenis_kelamin: "Perempuan",
          tanggal_lahir: "2009-07-22",
          alamat: "Jl. Sudirman No. 5",
          rfid_card: "05060708",
        },
        {
          nama: "Budi Santoso",
          kelas_id: kelasData[1].id,
          nis: "2024003",
          jenis_kelamin: "Laki-laki",
          tanggal_lahir: "2009-03-10",
          alamat: "Jl. Ahmad Yani No. 20",
          rfid_card: "09101112",
        },
      ];

      const { error: siswaError } = await supabase.from("siswa").insert(sampleSiswa);

      if (siswaError) {
        return {
          success: false,
          message: "Failed to seed siswa data",
          error: siswaError.message,
        };
      }
    }

    // Add sample administrasi
    const sampleAdmin = [
      {
        nama: "Kepala Sekolah",
        email: "kepala@sekolah.sch.id",
        jabatan: "Kepala Sekolah",
        telepon: "08123456789",
        tanggal_bergabung: "2020-01-01",
      },
      {
        nama: "Tata Usaha",
        email: "tata.usaha@sekolah.sch.id",
        jabatan: "Staf Tata Usaha",
        telepon: "08129876543",
        tanggal_bergabung: "2021-06-01",
      },
    ];

    const { error: adminError } = await supabase.from("administrasi").insert(sampleAdmin);

    if (adminError) {
      return {
        success: false,
        message: "Failed to seed administrasi data",
        error: adminError.message,
      };
    }

    return {
      success: true,
      message: "Test data seeded successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to seed test data",
      error: String(error),
    };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const stats: Record<string, number> = {};

    const tables = ["kelas", "siswa", "administrasi", "tagihan", "pembayaran", "rfid_logs", "kegiatan_administrasi", "cashflow"];

    for (const table of tables) {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });

      if (!error) {
        stats[table] = count || 0;
      }
    }

    return {
      success: true,
      stats,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Reset database (for development only)
 * WARNING: This will delete all data!
 */
export async function resetDatabase() {
  try {
    const tables = ["pembayaran", "rfid_logs", "cashflow", "tagihan", "kegiatan_administrasi", "siswa", "administrasi", "akun_pembayaran", "kelas"];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error && !error.message.includes("does not exist")) {
        console.error(`Error deleting from ${table}:`, error);
      }
    }

    return {
      success: true,
      message: "Database reset successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
