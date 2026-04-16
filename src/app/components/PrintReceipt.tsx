import React from "react";

interface ReceiptData {
  id: string;
  tanggal_pembayaran: string;
  siswa_nama: string;
  siswa_nis: string;
  kelas: string;
  nama_kegiatan: string;
  jumlah: number;
  metode_pembayaran: string;
  bukti_pembayaran?: string;
  dicatat_oleh?: string;
  nomor_struk?: string;
}

interface PrintReceiptProps {
  data: ReceiptData;
  tuName?: string;
}

export const PrintReceipt = React.forwardRef<HTMLDivElement, PrintReceiptProps>(
  ({ data, tuName = "Administrator" }, ref) => {
    const formatRupiah = (amount: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(amount);

    const formatDate = (ds: string) =>
      new Date(ds).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    const formatTime = (ds: string) =>
      new Date(ds).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

    return (
      <div
        ref={ref}
        className="bg-white p-8 max-w-2xl mx-auto"
        style={{ fontSize: "14px", lineHeight: "1.6" }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">BUKTI PEMBAYARAN</h1>
          <h2 className="text-xl font-semibold text-gray-800">SMK ARMANIYAH</h2>
          <p className="text-sm text-gray-600 mt-1">Sekolah Menengah Kejuruan Armaniyah</p>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>ID Struk: {data.nomor_struk || `STR-${data.id.substring(0, 8)}`}</span>
            <span>{formatDate(data.tanggal_pembayaran)}</span>
          </div>
        </div>

        {/* Data Pembayaran */}
        <div className="mb-6">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="font-semibold w-1/3">Nama Siswa</td>
                <td className="px-2">:</td>
                <td className="font-medium">{data.siswa_nama}</td>
              </tr>
              <tr>
                <td className="font-semibold">NIS</td>
                <td className="px-2">:</td>
                <td>{data.siswa_nis}</td>
              </tr>
              <tr>
                <td className="font-semibold">Kelas</td>
                <td className="px-2">:</td>
                <td>{data.kelas}</td>
              </tr>
              <tr>
                <td className="font-semibold">Kegiatan</td>
                <td className="px-2">:</td>
                <td>{data.nama_kegiatan}</td>
              </tr>
              <tr>
                <td className="font-semibold">Metode Pembayaran</td>
                <td className="px-2">:</td>
                <td className="capitalize">{data.metode_pembayaran || "Transfer"}</td>
              </tr>
              {data.bukti_pembayaran && (
                <tr>
                  <td className="font-semibold">Referensi/Bukti</td>
                  <td className="px-2">:</td>
                  <td>{data.bukti_pembayaran}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Jumlah Bayar */}
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">JUMLAH PEMBAYARAN:</span>
            <span className="text-2xl font-bold text-green-600">
              {formatRupiah(data.jumlah)}
            </span>
          </div>
        </div>

        {/* Waktu & Operator */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <p className="text-gray-600 mb-1">Waktu Pembayaran:</p>
            <p className="font-semibold">
              {formatDate(data.tanggal_pembayaran)} {formatTime(data.tanggal_pembayaran)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Dicatat Oleh (TU):</p>
            <p className="font-semibold">{tuName}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 text-center">
          <p className="text-xs text-gray-600 mb-3">
            Terima kasih telah melakukan pembayaran
          </p>
          <p className="text-xs text-gray-500">
            Bukti pembayaran ini sah dan berlaku sebagai dokumen resmi sekolah
          </p>
          <p className="text-xs text-gray-500 mt-2">
            SMK Armaniyah - Dicetak:{" "}
            {new Date().toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Print CSS */}
        <style>{`
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .print-receipt {
              max-width: 100%;
              margin: 0;
              padding: 20px;
            }
          }
        `}</style>
      </div>
    );
  }
);

PrintReceipt.displayName = "PrintReceipt";
