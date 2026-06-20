import React, { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { UserSession } from "./types";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import DashboardOverview from "./components/DashboardOverview";
import ProjectTable from "./components/ProjectTable";
import MapPane from "./components/MapPane";
import DataModal from "./components/DataModal";
import { 
  LogOut, Menu, User, Shield, AlertTriangle, CheckCircle2, 
  Sparkles, BellRing, Moon, Sun, Lock, Loader2, ArrowRight
} from "lucide-react";

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function App() {
  // Session states
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem("userSession");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Dark mode option
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  // UI state
  const [currentViewId, setCurrentViewId] = useState<string>("overview");
  const [currentViewTitle, setCurrentViewTitle] = useState<string>("Overview");
  const [isSub, setIsSub] = useState<boolean>(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState<boolean>(false);
  
  // Data State
  const [viewData, setViewData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Dashboard Aggregate State
  const [dashboardData, setDashboardData] = useState<{
    proyek: any[];
    pembayaran: any[];
    tagihan: any[];
  }>({ proyek: [], pembayaran: [], tagihan: [] });

  // CRUD states
  const [isModelOpen, setIsModelOpen] = useState<boolean>(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  
  // Toaster notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auto Logout timer referencing ref
  const autoLogoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger Toasts helper
  const addToast = (title: string, message: string, type: "success" | "error" | "info" = "success") => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type
    };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 4000);
  };

  // Start 30 minutes auto-logout timer on dynamic key interaction or login
  const startAutoLogoutTimer = () => {
    if (autoLogoutTimerRef.current) {
      clearTimeout(autoLogoutTimerRef.current);
    }
    // 30 Minutes = 30 * 60 * 1000 ms
    autoLogoutTimerRef.current = setTimeout(() => {
      addToast("Sesi Berakhir", "Anda keluar otomatis demi keamanan sistem karena tidak ada aktivitas selama 30 menit.", "info");
      setTimeout(() => {
        handleLogoutConfirm();
      }, 1500);
    }, 30 * 60 * 1000);
  };

  // Reset timer on key events to track activity
  useEffect(() => {
    if (session) {
      startAutoLogoutTimer();
      const resetOnActivity = () => startAutoLogoutTimer();
      window.addEventListener("mousemove", resetOnActivity);
      window.addEventListener("keydown", resetOnActivity);

      return () => {
        window.removeEventListener("mousemove", resetOnActivity);
        window.removeEventListener("keydown", resetOnActivity);
        if (autoLogoutTimerRef.current) {
          clearTimeout(autoLogoutTimerRef.current);
        }
      };
    }
  }, [session]);

  // Apply dark mode classes
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Session login hook
  const handleLoginSuccess = (userSession: UserSession) => {
    localStorage.setItem("userSession", JSON.stringify(userSession));
    setSession(userSession);
    addToast(
      "Masuk Sukses", 
      `Selamat datang kembali, ${userSession["Nama Lengkap"] || userSession["Nama Pengguna"]}!`, 
      "success"
    );
    // Redirect to Overview default view
    setCurrentViewId("overview");
    setCurrentViewTitle("Overview");
    setIsSub(false);
  };

  const handleLogoutConfirm = () => {
    localStorage.removeItem("userSession");
    setSession(null);
    setShowLogoutConfirm(false);
    if (autoLogoutTimerRef.current) {
      clearTimeout(autoLogoutTimerRef.current);
    }
  };

  // Sync core Firestore collections based on current view selection
  useEffect(() => {
    if (!session) return;

    setLoading(true);

    // 1. Overview dashboard: Subscribes to 3 separate snapshots asynchronously
    if (currentViewId === "overview") {
      let activeUnsubs: (() => void)[] = [];
      const aggregations = { proyek: [], pembayaran: [], tagihan: [] };
      let collectionsSynced = 3;

      const triggerAggregateAndStopLoading = () => {
        collectionsSynced--;
        if (collectionsSynced === 0) {
          setLoading(false);
        }
      };

      const unsubProj = onSnapshot(collection(db, "semua-proyek"), (snap) => {
        const rows: any[] = [];
        snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
        aggregations.proyek = rows as any;
        setDashboardData(prev => ({ ...prev, proyek: rows }));
        if (collectionsSynced > 0) triggerAggregateAndStopLoading();
      }, (err) => {
        console.error("Proyek Error:", err);
        if (collectionsSynced > 0) triggerAggregateAndStopLoading();
      });

      const unsubPemb = onSnapshot(collection(db, "daftar-pembayaran"), (snap) => {
        const rows: any[] = [];
        snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
        aggregations.pembayaran = rows as any;
        setDashboardData(prev => ({ ...prev, pembayaran: rows }));
        if (collectionsSynced > 0) triggerAggregateAndStopLoading();
      }, (err) => {
        console.error("Pembayaran Error:", err);
        if (collectionsSynced > 0) triggerAggregateAndStopLoading();
      });

      const unsubTag = onSnapshot(collection(db, "daftar-tagihan"), (snap) => {
        const rows: any[] = [];
        snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
        aggregations.tagihan = rows as any;
        setDashboardData(prev => ({ ...prev, tagihan: rows }));
        if (collectionsSynced > 0) triggerAggregateAndStopLoading();
      }, (err) => {
        console.error("Tagihan Error:", err);
        if (collectionsSynced > 0) triggerAggregateAndStopLoading();
      });

      activeUnsubs = [unsubProj, unsubPemb, unsubTag];

      return () => {
        activeUnsubs.forEach(unsub => unsub());
      };
    }

    // 2. Regular modular view: maps to standard paths
    // Determine target firestore path
    let syncPath = currentViewId;
    if (currentViewId === "semua-proyek") syncPath = "semua-proyek";
    else if (currentViewId === "daftar-pembayaran") syncPath = "daftar-pembayaran";
    else if (currentViewId === "daftar-tagihan") syncPath = "daftar-tagihan";
    else if (currentViewId === "daftar-karyawan") syncPath = "daftar-karyawan";
    else if (currentViewId === "daftar-pelaksana") syncPath = "daftar-pelaksana";
    else if (currentViewId === "daftar-absensi") syncPath = "daftar-absensi";

    const unsub = onSnapshot(collection(db, syncPath), (snapshot) => {
      const rows: any[] = [];
      snapshot.forEach(doc => {
        rows.push({ id: doc.id, ...doc.data() });
      });
      setViewData(rows);
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching ${syncPath}:`, error);
      addToast("Koneksi Gagal", `Gagal memuat parameter ${syncPath}.`, "error");
      setLoading(false);
    });

    return () => {
      unsub();
    };

  }, [currentViewId, session]);

  // Firestore save/update CRUD implementation helper
  const handleSaveDocument = async (formData: Record<string, any>) => {
    // Path resolution matching view
    let targetPath = currentViewId;

    const docData = { ...formData, CreatedAt: Timestamp.now() };

    // Numerical and type formatting
    const columnsToNumber = ["HP BoQ", "Nilai BoQ", "Bobot", "FO 48c", "FO 96c", "FO 96c_A", "FO 96c_B", "Total FO", "BoQ Ext Pole", "BoQ New Pole", "Harga Satuan", "Volume BoQ", "Total Nilai BoQ", "Volume", "Total Harga", "Nilai Pembayaran", "Nilai Invoice", "Nilai SPK", "Nilai Terbayar", "Volume Rekon", "Total Nilai Rekon"];
    const columnsToDates = ["Tanggal SPK", "Tanggal Pembayaran", "Tanggal Invoice", "Tanggal PO", "Tanggal SJ", "Tanggal"];

    columnsToNumber.forEach(c => {
      if (docData[c] !== undefined && docData[c] !== "") {
        docData[c] = parseFloat(String(docData[c]).replace(/,/g, "")) || 0;
      }
    });

    columnsToDates.forEach(c => {
      if (docData[c] !== undefined && docData[c] !== "") {
        docData[c] = Timestamp.fromDate(new Date(docData[c]));
      }
    });

    if (editingRow) {
      // Execute UpdateDoc
      const docRef = doc(db, targetPath, editingRow.id);
      await updateDoc(docRef, docData);
      addToast("Sukses", "Data rekaman berhasil diperbarui.", "success");
    } else {
      // Execute AddDoc 
      await addDoc(collection(db, targetPath), docData);
      addToast("Sukses", "Data rekaman baru berhasil disimpan.", "success");
    }
  };

  // Firestore delete row helper
  const handleDeleteDocument = async () => {
    if (!showDeleteConfirm) return;
    try {
      await deleteDoc(doc(db, currentViewId, showDeleteConfirm));
      addToast("Deleted", "Data rekaman berhasil dihapus.", "success");
    } catch (e: any) {
      addToast("Gagal", `Gagal menghapus data: ${e.message}`, "error");
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  // Trigger editing map url parameters
  const handleEditMapUrl = async (id: string, currentUrl: string) => {
    const input = prompt("Masukkan URL Google Maps Embed (iframe src / link) baru:", currentUrl);
    if (input === null) return;
    
    try {
      if (id) {
        await updateDoc(doc(db, currentViewId, id), { url: input });
      } else {
        await addDoc(collection(db, currentViewId), { url: input, CreatedAt: Timestamp.now() });
      }
      addToast("Maps Updated", "URL tautan peta berhasil diperbarui.", "success");
    } catch (err: any) {
      addToast("Error", `Gagal update peta: ${err.message}`, "error");
    }
  };

  if (!session) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-sans flex transition-all">
      
      {/* Toast Notification Container in Bootstrap alert/toast styles */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const borderClass = t.type === "success" ? "border-green-300 dark:border-green-900/50 bg-green-50/95" : t.type === "error" ? "border-red-300 dark:border-red-900/50 bg-red-50/95" : "border-blue-300 dark:border-blue-900/50 bg-blue-50/95";
          return (
            <div 
              key={t.id}
              className={`
                w-80 p-3 rounded bg-white dark:bg-slate-800 shadow border ${borderClass} backdrop-blur-md
                flex items-start gap-2.5 pointer-events-auto transition-all animate-slideUp
              `}
            >
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-[#198754] mt-0.5" />}
              {t.type === "error" && <AlertTriangle className="w-5 h-5 text-[#dc3545] mt-0.5" />}
              {t.type === "info" && <BellRing className="w-5 h-5 text-[#0d6efd] mt-0.5" />}
              
              <div className="space-y-0.5 flex-grow">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{t.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal">{t.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accordion Sidebar */}
      <Sidebar 
        currentViewId={currentViewId}
        onSelectView={(viewId, title, isSubCategory) => {
          setCurrentViewId(viewId);
          setCurrentViewTitle(title);
          setIsSub(isSubCategory);
        }}
        isOpenOnMobile={showMobileSidebar}
        onCloseMobile={() => setShowMobileSidebar(false)}
      />

      {/* Workspace content wrapper */}
      <div className="flex-grow lg:ml-72 flex flex-col min-h-screen min-w-0">
        
        {/* Global Toolbar Header - Bootstrap-like Flat Strip nav */}
        <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between z-30 transition-all">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowMobileSidebar(true)}
              className="lg:hidden p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 hover:bg-slate-200 transition-all cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5">
                {isSub ? "Kategori Detail" : "Menu Utama"}
              </p>
              <h2 className="text-xs font-bold text-slate-800 dark:text-white tracking-wide uppercase">
                {currentViewTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Dark mode slider */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded transition-all cursor-pointer"
              title="Ganti Tema Visual"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Profile Avatar Badge - Bootstrap outline style */}
            <div className="items-center gap-2 hidden sm:flex px-2.5 py-1 bg-slate-50 dark:bg-slate-800/65 border border-slate-300 dark:border-slate-705 rounded">
              <div className="w-6 h-6 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded flex items-center justify-center font-extrabold text-xs border border-blue-200">
                {session["Nama Lengkap"] ? session["Nama Lengkap"].charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left leading-none">
                <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                  {session["Nama Lengkap"] || session["Nama Pengguna"]}
                </h4>
                <p className="text-[9px] font-bold text-slate-450 uppercase tracking-widest mt-0.5 flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5 text-blue-500" />
                  <span>{session.Role || "Guest"}</span>
                </p>
              </div>
            </div>

            {/* Logout dispatch trigger */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-1.5 bg-red-50 hover:bg-red-500 hover:text-white border border-red-300 dark:bg-red-950/10 dark:border-red-900/30 text-red-600 rounded transition-all cursor-pointer flex items-center gap-1"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-bold hidden md:inline">Keluar</span>
            </button>

          </div>
        </header>

        {/* Viewport content layout */}
        <main className="flex-grow p-6 overflow-y-auto">
          {currentViewId === "overview" ? (
            <DashboardOverview 
              proyek={dashboardData.proyek}
              pembayaran={dashboardData.pembayaran}
              tagihan={dashboardData.tagihan}
              onSelectView={(vId, title, isSubCat) => {
                setCurrentViewId(vId);
                setCurrentViewTitle(title);
                setIsSub(isSubCat);
              }}
            />
          ) : currentViewId.endsWith("-maps") ? (
            <MapPane 
              data={viewData}
              loading={loading}
              isAdmin={session.Role === "Super Admin" || session.Role === "Admin"}
              onEditMapUrl={handleEditMapUrl}
            />
          ) : (
            <ProjectTable 
              data={viewData}
              viewId={currentViewId}
              loading={loading}
              onAddNew={() => {
                setEditingRow(null);
                setIsModelOpen(true);
              }}
              onEdit={(row) => {
                setEditingRow(row);
                setIsModelOpen(true);
              }}
              onDelete={(id) => setShowDeleteConfirm(id)}
              userRole={session.Role || "Guest"}
            />
          )}
        </main>
      </div>

      {/* CRUD Form Modal */}
      <DataModal 
        isOpen={isModelOpen}
        onClose={() => {
          setIsModelOpen(false);
          setEditingRow(null);
        }}
        viewId={currentViewId}
        editData={editingRow}
        onSave={handleSaveDocument}
      />

      {/* Confirm Deletion Alert Overlay - Bootstrap style */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] transition-all">
          <div className="bg-white dark:bg-slate-800 rounded w-full max-w-sm border border-slate-300 dark:border-slate-700 shadow p-4 space-y-3 animate-scaleUp">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-950/20 text-[#dc3545] rounded flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Konfirmasi Hapus Data</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Apakah Anda benar-benar yakin ingin menghapus data rekaman ini? Tindakan ini bersifat permanen dan tidak dapat dikembalikan.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1.5">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-bs-secondary px-3 py-1.5 hover:bg-secondary text-white rounded font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteDocument}
                className="px-3 py-1.5 bg-[#dc3545] hover:bg-red-700 text-white rounded font-bold text-xs cursor-pointer transition-all"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Logout Overlay - Bootstrap style */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] transition-all">
          <div className="bg-white dark:bg-slate-800 rounded w-full max-w-sm border border-slate-300 dark:border-slate-700 shadow p-4 space-y-3 animate-scaleUp">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-blue-400 rounded flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Keluar dari Sesi</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Apakah Anda yakin ingin keluar dari akun Anda sekarang? Sesi Anda akan ditutup.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1.5">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-bs-secondary px-3 py-1.5 hover:bg-secondary text-white rounded font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="btn-bs-primary px-3 py-1.5 hover:bg-blue-700 text-white rounded font-bold text-xs cursor-pointer transition-all flex items-center gap-1"
              >
                <span>Keluar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
