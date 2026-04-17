import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./components/Dashboard";
import Administrasi from "./components/Administrasi";
import Rombel from "./components/Rombel";
import KegiatanAdministrasi from "./components/KegiatanAdministrasi";
import Tagihan from "./components/Tagihan";
import RiwayatPembayaran from "./components/RiwayatPembayaran";
import Cashflow from "./components/Cashflow";
import RFIDScanner from "./components/RFIDScanner";
import Analytics from "./components/Analytics";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: () => (
      <ProtectedRoute>
        <Root />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: "administrasi", Component: Administrasi },
      { path: "kegiatan-administrasi", Component: KegiatanAdministrasi },
      { path: "cashflow", Component: Cashflow },
      { path: "analytics", Component: Analytics },
      { path: "tagihan", Component: Tagihan },
      { path: "riwayat-pembayaran", Component: RiwayatPembayaran },
      { path: "rfid-scanner", Component: RFIDScanner },
      { path: "rombel", Component: Rombel },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});