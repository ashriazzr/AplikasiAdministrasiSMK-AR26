import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, Users, GraduationCap, School, FileText, Wallet, History, CreditCard, BarChart3, Menu, X, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

export default function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminName, setAdminName] = useState("Admin");

  // Check if user is logged in
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("is_logged_in");
    const adminName = sessionStorage.getItem("admin_name");

    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    if (adminName) {
      setAdminName(adminName);
    }
  }, [navigate]);

  const handleLogout = () => {
    // Clear sessionStorage
    sessionStorage.removeItem("admin_id");
    sessionStorage.removeItem("admin_name");
    sessionStorage.removeItem("admin_email");
    sessionStorage.removeItem("is_logged_in");

    // Redirect to login
    navigate("/login");
  };
  
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/administrasi", label: "Administrasi", icon: Users },
    { path: "/kegiatan-administrasi", label: "Kegiatan Administrasi", icon: FileText },
    { path: "/analytics", label: "Analytics & Reporting", icon: BarChart3 },
    { path: "/tagihan", label: "Tagihan & Pembayaran", icon: Wallet },
    { path: "/riwayat-pembayaran", label: "Riwayat Pembayaran", icon: History },
    { path: "/rfid-scanner", label: "RFID Scanner", icon: CreditCard },
    { path: "/rombel", label: "Rombel", icon: School },
  ];
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Responsive Width */}
      <aside className={`${sidebarOpen ? "w-56" : "w-20"} bg-white shadow-md transition-all duration-300 flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex-1">
              <h1 className="text-lg font-bold text-blue-600 truncate">Sistem Administrasi</h1>
              <p className="text-xs text-gray-500 mt-1 truncate">Manajemen Sekolah</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-100 rounded transition-colors ml-2"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-2 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.label : ""}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-colors whitespace-nowrap ${
                  active
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t mt-auto">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="text-sm">
                <p className="font-semibold text-gray-800 truncate">{adminName}</p>
                <p className="text-xs text-gray-500 truncate">Administrator</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-full flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}