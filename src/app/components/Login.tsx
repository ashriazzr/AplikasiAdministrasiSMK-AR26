import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Loader2, Mail, Sparkles, User } from "lucide-react";
import { RESTRICTED_ACCOUNT, SESSION_KEYS, isRestrictedAccount } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email || !email.includes("@")) {
      toast.error("Email tidak valid");
      setIsLoading(false);
      return;
    }
    if (!name || name.length < 3) {
      toast.error("Nama minimal 3 karakter");
      setIsLoading(false);
      return;
    }

    const restrictedUser = isRestrictedAccount(email, name);

    const adminId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEYS.adminId, adminId);
    sessionStorage.setItem(SESSION_KEYS.adminName, restrictedUser ? RESTRICTED_ACCOUNT.name : name);
    sessionStorage.setItem(SESSION_KEYS.adminEmail, email.trim().toLowerCase());
    sessionStorage.setItem(SESSION_KEYS.isLoggedIn, "true");
    sessionStorage.setItem(SESSION_KEYS.accessLevel, restrictedUser ? RESTRICTED_ACCOUNT.role : "full");

    toast.success(`Selamat datang, ${restrictedUser ? RESTRICTED_ACCOUNT.name : name}`);
    setTimeout(() => navigate("/"), 400);
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-sky-50">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,#ecfeff_0%,#eff6ff_45%,#f5f3ff_100%)]" />
      <div className="absolute inset-0 opacity-40 holo-grid" />
      <div className="absolute left-[8%] top-[12%] h-72 w-72 rounded-full bg-cyan-300/40 blur-3xl holo-pulse" />
      <div className="absolute right-[10%] top-[18%] h-64 w-64 rounded-full bg-indigo-300/35 blur-3xl holo-pulse delay-1000" />
      <div className="absolute bottom-[10%] left-[35%] h-56 w-56 rounded-full bg-fuchsia-200/40 blur-3xl holo-pulse delay-500" />
      <div className="absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/40 holo-rotate" />
      <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/35 holo-rotate-rev" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-300/20 to-transparent holo-scan" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-cyan-200/70 bg-white/85 p-6 shadow-[0_30px_90px_-35px_rgba(14,116,144,0.45)] backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Admin Portal</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">Masuk ke Sistem</h1>
              <p className="mt-1 text-sm text-slate-600">Tampilan cerah dengan hologram interaktif.</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500 p-2 text-white shadow-lg shadow-cyan-300/40">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Alamat Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="nama@sekolah.ac.id"
                  className="h-11 w-full rounded-lg border border-slate-200/90 bg-white/90 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Nama Lengkap</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  placeholder="Nama administrator"
                  className="h-11 w-full rounded-lg border border-slate-200/90 bg-white/90 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </div>
            </label>

            <div className="rounded-lg border border-cyan-100 bg-cyan-50/70 px-3 py-2 text-xs text-cyan-900">
              Akun terbatas: {RESTRICTED_ACCOUNT.email} / {RESTRICTED_ACCOUNT.name}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 text-sm font-semibold text-white transition hover:from-cyan-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          <div className="my-5 h-px w-full bg-slate-200/80" />

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setEmail("admin@demo.local");
              setName("Admin Demo");
              setTimeout(() => {
                sessionStorage.setItem(SESSION_KEYS.adminId, `admin_${Date.now()}`);
                sessionStorage.setItem(SESSION_KEYS.adminName, "Admin Demo");
                sessionStorage.setItem(SESSION_KEYS.adminEmail, "admin@demo.local");
                sessionStorage.setItem(SESSION_KEYS.isLoggedIn, "true");
                sessionStorage.setItem(SESSION_KEYS.accessLevel, "full");
                toast.success("Selamat datang, Admin Demo");
                navigate("/");
              }, 250);
            }}
            className="h-11 w-full rounded-lg border border-slate-200/90 bg-white/90 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50/60"
          >
            Masuk sebagai Demo
          </button>

          <p className="mt-5 text-center text-xs text-slate-400">© 2026 Universitas Bani Saleh</p>
        </div>
      </main>

      <style>{`
        .holo-grid {
          background-image:
            linear-gradient(rgba(14, 116, 144, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 116, 144, 0.2) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at center, black 35%, transparent 85%);
        }
        @keyframes holoPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.12); opacity: 0.85; }
        }
        @keyframes holoRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes holoRotateRev {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes holoScan {
          0% { transform: translateY(-20px); opacity: 0; }
          20% { opacity: 0.9; }
          100% { transform: translateY(calc(100vh - 120px)); opacity: 0; }
        }
        .holo-pulse { animation: holoPulse 8s ease-in-out infinite; }
        .holo-rotate { animation: holoRotate 24s linear infinite; }
        .holo-rotate-rev { animation: holoRotateRev 18s linear infinite; }
        .holo-scan { animation: holoScan 7s linear infinite; }
      `}</style>
    </div>
  );
}
