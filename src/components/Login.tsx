import React, { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { UserSession } from "../types";
import { LogIn, Key, User, ShieldAlert, Sparkles, Loader2 } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, "pengguna"),
        where("Nama Pengguna", "==", username.trim())
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // User found
        const userData = querySnapshot.docs[0].data() as UserSession;
        
        // Match passwords (handling cases where password might be stored as number)
        if (userData.Password !== undefined && String(userData.Password) === password) {
          onLoginSuccess(userData);
        } else {
          setError("Kata Sandi yang Anda masukkan salah.");
        }
      } else {
        setError("Nama Pengguna tidak ditemukan.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Terjadi kesalahan koneksi server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-light dark:bg-slate-900 px-4 z-[99999]">
      {/* Bootstrap subtle ambient background stripes */}
      <div className="absolute inset-0 z-0 bg-slate-100/50 dark:bg-slate-950/45" />

      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3 border border-slate-200 dark:border-slate-700 shadow relative z-10">
        
        {/* Bootstrap 5 Style Card Header */}
        <div className="bg-blue-600 dark:bg-indigo-950 p-6 text-center rounded-t-3 border-b border-blue-700/50 dark:border-slate-700">
          <div className="mx-auto w-12 h-12 bg-white/10 text-white rounded-circle flex items-center justify-center shadow-sm mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-white text-lg font-bold uppercase tracking-wide mb-1">PROYEK PORTAL</h2>
          <p className="text-slate-100 text-xs font-normal">
            Dashboard Monitoring &amp; Keuangan
          </p>
        </div>

        {/* Bootstrap Form Fields Container */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-center mb-3">
            <h3 className="text-slate-900 dark:text-white text-base font-bold mb-1">Silakan Masuk</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Gunakan kredensial akun Anda untuk mengakses sistem.
            </p>
          </div>

          <div className="space-y-3">
            {/* Username Input with Bootstrap form-control look */}
            <div>
              <label 
                htmlFor="username" 
                className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5 block"
              >
                Nama Pengguna
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  id="username"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Input with Bootstrap form-control look */}
            <div>
              <label 
                htmlFor="password" 
                className="text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1.5 block"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 dark:text-slate-500">
                  <Key className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  id="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Error Message with Bootstrap Alert style */}
          {error && (
            <div className="p-2.5 bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900/45 rounded text-red-700 dark:text-red-400 text-xs font-semibold flex items-start gap-2 animate-shake">
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button with Bootstrap btn-primary style */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
