import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewId: string;
  editData: any | null;
  onSave: (docData: any) => Promise<void>;
}

export default function DataModal({ isOpen, onClose, viewId, editData, onSave }: DataModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Load editData into fields
  useEffect(() => {
    if (editData) {
      const initial: Record<string, any> = {};
      Object.entries(editData).forEach(([key, val]) => {
        if (val && typeof val === "object" && (val as any).seconds !== undefined) {
          // Convert Firestore Timestamp to Date string "YYYY-MM-DD"
          const date = new Date((val as any).seconds * 1000);
          initial[key] = date.toISOString().split("T")[0];
        } else {
          initial[key] = val;
        }
      });
      setFormData(initial);
    } else {
      // Set some defaults
      const today = new Date().toISOString().split("T")[0];
      const defaults: Record<string, any> = {};
      if (viewId === "semua-proyek") {
        defaults["Tanggal SPK"] = today;
        defaults["Status Proyek"] = "In Progress";
      } else if (viewId === "jrp-jobj-material" || viewId.endsWith("-material")) {
        defaults["Tanggal PO"] = today;
        defaults["Status Material"] = "Received";
      } else if (viewId === "jrp-jobj-bon-material") {
        defaults["Tanggal SJ"] = today;
      } else if (viewId === "daftar-pembayaran") {
        defaults["Tanggal Pembayaran"] = today;
        defaults["Status"] = "OK";
      } else if (viewId === "daftar-tagihan") {
        defaults["Tanggal Invoice"] = today;
        defaults["Tanggal Pembayaran"] = today;
        defaults["Status Invoice"] = "Submit";
        defaults["Status Pembayaran"] = "Belum dibayar";
      } else if (viewId === "daftar-absensi") {
        defaults["Tanggal"] = today;
        defaults["Check In"] = "08:00";
        defaults["Check Out"] = "17:00";
        defaults["Status"] = "Hadir";
      }
      setFormData(defaults);
    }
    setErrorLocal(null);
  }, [editData, viewId, isOpen]);

  // Handle change on standard field inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto calculation: Total Jam Kerja based on Check In & Check Out
      if (viewId === "daftar-absensi" && (name === "Check In" || name === "Check Out")) {
        const cin = updated["Check In"];
        const cout = updated["Check Out"];
        if (cin && cout) {
          const [h1, m1] = cin.split(":").map(Number);
          const [h2, m2] = cout.split(":").map(Number);
          if (!isNaN(h1) && !isNaN(h2)) {
            let diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diffMins < 0) diffMins += 24 * 60; // Over midnight
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            updated["Total Jam Kerja"] = `${hrs} jam ${mins} menit`;
          }
        }
      }

      // Auto calculation: Total Harga = Volume * Harga Satuan (for material)
      if (viewId.endsWith("-material") && (name === "Volume" || name === "Harga Satuan")) {
        const vol = parseFloat(String(updated["Volume"]).replace(/,/g, "")) || 0;
        const price = parseFloat(String(updated["Harga Satuan"]).replace(/,/g, "")) || 0;
        updated["Total Harga"] = (vol * price).toFixed(2);
      }

      // Auto calculation: Total Nilai BoQ = Harga Satuan * Volume BoQ
      if ((viewId.endsWith("-spk") || viewId.endsWith("-boq")) && (name === "Harga Satuan" || name === "Volume BoQ")) {
        const price = parseFloat(String(updated["Harga Satuan"]).replace(/,/g, "")) || 0;
        const vol = parseFloat(String(updated["Volume BoQ"]).replace(/,/g, "")) || 0;
        updated["Total Nilai BoQ"] = (price * vol).toFixed(2);
      }

      // Auto calculation: Total Nilai Rekon = Harga Satuan * Volume Rekon
      if (viewId.endsWith("-rekon") && (name === "Harga Satuan" || name === "Volume Rekon")) {
        const price = parseFloat(String(updated["Harga Satuan"]).replace(/,/g, "")) || 0;
        const vol = parseFloat(String(updated["Volume Rekon"]).replace(/,/g, "")) || 0;
        updated["Total Nilai Rekon"] = (price * vol).toFixed(2);
      }

      return updated;
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorLocal(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorLocal(err.message || "Gagal menyimpan data ke Firestore.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const titleText = editData ? "Edit Data Rekaman" : "Tambah Data Baru";

  // Dynamic content renderer depending on viewId
  const renderFields = () => {
    if (viewId === "jrp-jobj-spk") {
      return (
        <>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Cluster</label>
            <input type="text" name="Nama Cluster" value={formData["Nama Cluster"] || ""} onChange={handleChange} placeholder="Masukkan nama cluster" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tipe</label>
            <input type="text" name="Tipe" value={formData["Tipe"] || ""} onChange={handleChange} placeholder="Masukkan tipe" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">HP BoQ</label>
            <input type="number" step="any" name="HP BoQ" value={formData["HP BoQ"] || ""} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Zona</label>
            <input type="text" name="Zona" value={formData["Zona"] || ""} onChange={handleChange} placeholder="Masukkan zona" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nilai BoQ</label>
            <input type="number" step="any" name="Nilai BoQ" value={formData["Nilai BoQ"] || ""} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Bobot (%)</label>
            <input type="number" step="any" name="Bobot" value={formData["Bobot"] || ""} onChange={handleChange} placeholder="0.00" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
            <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" placeholder="Keterangan tambahan..." />
          </div>
        </>
      );
    }

    if (viewId === "jrp-jobj-boq" || viewId === "surge-fm-expole-boq" || viewId === "surge-fm-newpole-boq") {
      return (
        <>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Item Pekerjaan</label>
            <input type="text" name="Item Pekerjaan" value={formData["Item Pekerjaan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Satuan</label>
            <input type="text" name="Satuan" value={formData["Satuan"] || ""} onChange={handleChange} placeholder="Pcs / Mtr" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Harga Satuan</label>
            <input type="number" step="any" name="Harga Satuan" value={formData["Harga Satuan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
            <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
        </>
      );
    }

    if (viewId === "jrp-jobj-bon-material") {
      return (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal SJ</label>
            <input type="date" name="Tanggal SJ" value={formData["Tanggal SJ"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">No Surat Jalan</label>
            <input type="text" name="No Surat Jalan" value={formData["No Surat Jalan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Material</label>
            <input type="text" name="Nama Material" value={formData["Nama Material"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Satuan</label>
            <input type="text" name="Satuan" value={formData["Satuan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Volume</label>
            <input type="number" step="any" name="Volume" value={formData["Volume"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gudang</label>
            <input type="text" name="Gudang" value={formData["Gudang"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">User</label>
            <input type="text" name="User" value={formData["User"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Proyek</label>
            <input type="text" name="Nama Proyek" value={formData["Nama Proyek"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lokasi</label>
            <input type="text" name="Nama Lokasi" value={formData["Nama Lokasi"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
            <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
        </>
      );
    }

    if (viewId === "surge-fm-expole-spk" || viewId === "surge-fm-newpole-spk") {
      const isNew = viewId === "surge-fm-newpole-spk";
      return (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">DAOP</label>
            <input type="text" name="DAOP" value={formData["DAOP"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Segmen</label>
            <input type="text" name="Segmen" value={formData["Segmen"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          
          {isNew ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">FO 96c_A</label>
                <input type="number" step="any" name="FO 96c_A" value={formData["FO 96c_A"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">FO 96c_B</label>
                <input type="number" step="any" name="FO 96c_B" value={formData["FO 96c_B"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total FO</label>
                <input type="number" step="any" name="Total FO" value={formData["Total FO"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">BoQ New Pole</label>
                <input type="number" step="any" name="BoQ New Pole" value={formData["BoQ New Pole"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">FO 48c</label>
                <input type="number" step="any" name="FO 48c" value={formData["FO 48c"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">FO 96c</label>
                <input type="number" step="any" name="FO 96c" value={formData["FO 96c"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total FO</label>
                <input type="number" step="any" name="Total FO" value={formData["Total FO"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">BoQ Ext Pole</label>
                <input type="number" step="any" name="BoQ Ext Pole" value={formData["BoQ Ext Pole"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Bobot (%)</label>
            <input type="number" step="any" name="Bobot" value={formData["Bobot"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
            <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
        </>
      );
    }

    if (viewId.endsWith("-spk") || viewId.endsWith("-boq") || viewId.endsWith("-rekon")) {
      const isSPK = viewId.endsWith("-spk");
      const isRekon = viewId.endsWith("-rekon");
      
      return (
        <>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Item Pekerjaan</label>
            <input type="text" name="Item Pekerjaan" value={formData["Item Pekerjaan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Satuan</label>
            <input type="text" name="Satuan" value={formData["Satuan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Harga Satuan</label>
            <input type="number" step="any" name="Harga Satuan" value={formData["Harga Satuan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          
          {isRekon ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Volume Rekon</label>
                <input type="number" step="any" name="Volume Rekon" value={formData["Volume Rekon"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Nilai Rekon</label>
                <input type="number" step="any" name="Total Nilai Rekon" value={formData["Total Nilai Rekon"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Volume BoQ</label>
                <input type="number" step="any" name="Volume BoQ" value={formData["Volume BoQ"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Nilai BoQ</label>
                <input type="number" step="any" name="Total Nilai BoQ" value={formData["Total Nilai BoQ"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
              </div>
            </>
          )}

          {isSPK && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Bobot (%)</label>
              <input type="number" step="any" name="Bobot" value={formData["Bobot"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
            </div>
          )}

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
            <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
        </>
      );
    }

    if (viewId.endsWith("-material")) {
      return (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal PO</label>
            <input type="date" name="Tanggal PO" value={formData["Tanggal PO"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nomor PO Material</label>
            <input type="text" name="Nomor PO Material" value={formData["Nomor PO Material"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Supplier</label>
            <input type="text" name="Nama Supplier" value={formData["Nama Supplier"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Material</label>
            <input type="text" name="Nama Material" value={formData["Nama Material"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Spesifikasi Material</label>
            <input type="text" name="Spesifikasi Material" value={formData["Spesifikasi Material"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Satuan</label>
            <input type="text" name="Satuan" value={formData["Satuan"] || ""} onChange={handleChange} placeholder="Mtr / Lot" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Volume</label>
            <input type="number" step="any" name="Volume" value={formData["Volume"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Harga Satuan</label>
            <input type="number" step="any" name="Harga Satuan" value={formData["Harga Satuan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Harga</label>
            <input type="number" step="any" name="Total Harga" value={formData["Total Harga"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status Material</label>
            <select name="Status Material" value={formData["Status Material"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500">
              <option value="In Progress">In Progress</option>
              <option value="Dikirim">Dikirim</option>
              <option value="Received">Received</option>
              <option value="Ordered">Ordered</option>
              <option value="In Transit">In Transit</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Link URL Dokumen</label>
            <input type="url" name="URL Dokumen" value={formData["URL Dokumen"] || ""} onChange={handleChange} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
            <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
        </>
      );
    }

    if (viewId === "daftar-pembayaran") {
      return (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Pembayaran</label>
            <input type="date" name="Tanggal Pembayaran" value={formData["Tanggal Pembayaran"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Pembayaran</label>
            <input type="number" step="any" name="Nilai Pembayaran" value={formData["Nilai Pembayaran"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Perusahaan</label>
            <input type="text" name="Nama Perusahaan" value={formData["Nama Perusahaan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama SPK</label>
            <input type="text" name="Nama SPK" value={formData["Nama SPK"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
            <select name="Status" value={formData["Status"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required>
              <option value="OK">OK</option>
              <option value="NOK">NOK</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
            <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
        </>
      );
    }

    if (viewId === "daftar-tagihan") {
      return (
        <>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Perusahaan</label>
            <input type="text" name="Nama Perusahaan" value={formData["Nama Perusahaan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nomor SPK</label>
            <input type="text" name="Nomor SPK" value={formData["Nomor SPK"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama SPK</label>
            <input type="text" name="Nama SPK" value={formData["Nama SPK"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Uraian Detail Invoice</label>
            <textarea name="Uraian Detail Invoice" value={formData["Uraian Detail Invoice"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nomor Invoice</label>
            <input type="text" name="Nomor Invoice" value={formData["Nomor Invoice"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Invoice</label>
            <input type="date" name="Tanggal Invoice" value={formData["Tanggal Invoice"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Invoice</label>
            <input type="number" step="any" name="Nilai Invoice" value={formData["Nilai Invoice"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status Invoice</label>
            <select name="Status Invoice" value={formData["Status Invoice"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required>
              <option value="Submit">Submit</option>
              <option value="Revisi">Revisi</option>
              <option value="Reject">Reject</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Pembayaran</label>
            <input type="number" step="any" name="Nilai Pembayaran" value={formData["Nilai Pembayaran"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status Pembayaran</label>
            <select name="Status Pembayaran" value={formData["Status Pembayaran"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required>
              <option value="Belum dibayar">Belum dibayar</option>
              <option value="Sudah dibayar">Sudah dibayar</option>
              <option value="Dicicil">Dicicil</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">URL Dokumen</label>
            <input type="url" name="URL Dokumen" value={formData["URL Dokumen"] || ""} onChange={handleChange} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
            <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
        </>
      );
    }

    if (viewId === "daftar-karyawan" || viewId === "daftar-pelaksana") {
      const isKaryawan = viewId === "daftar-karyawan";
      return (
        <>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {isKaryawan ? "Nama Karyawan" : "Nama Mandor"}
            </label>
            <input type="text" name={isKaryawan ? "Nama Karyawan" : "Nama Mandor"} value={formData[isKaryawan ? "Nama Karyawan" : "Nama Mandor"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Jabatan</label>
            <input type="text" name="Jabatan" value={formData["Jabatan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">No Telepon</label>
            <input type="tel" name="No Telepon" value={formData["No Telepon"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">No KTP</label>
            <input type="text" name="No KTP" value={formData["No KTP"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alamat Lengkap</label>
            <textarea name="Alamat Lengkap" value={formData["Alamat Lengkap"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nomor Rekening</label>
            <input type="text" name={isKaryawan ? "Nomor Rekening" : "No Rekening"} value={formData[isKaryawan ? "Nomor Rekening" : "No Rekening"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alamat Email</label>
            <input type="email" name={isKaryawan ? "Alamat Email" : "Email"} value={formData[isKaryawan ? "Alamat Email" : "Email"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          {isKaryawan && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">No ID Karyawan</label>
              <input type="text" name="No ID Karyawan" value={formData["No ID Karyawan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Area Kerja</label>
            <input type="text" name="Area Kerja" value={formData["Area Kerja"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">URL Foto / Dokumen</label>
            <input type="url" name="URL Dokumen" value={formData["URL Dokumen"] || ""} onChange={handleChange} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
            <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
        </>
      );
    }

    if (viewId === "daftar-absensi") {
      return (
        <>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal</label>
            <input type="date" name="Tanggal" value={formData["Tanggal"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Karyawan</label>
            <input type="text" name="Nama Karyawan" value={formData["Nama Karyawan"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">NIK</label>
            <input type="text" name="NIK" value={formData["NIK"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama PM (Project Manager)</label>
            <input type="text" name="Nama PM" value={formData["Nama PM"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Lokasi Kerja</label>
            <input type="text" name="Lokasi Kerja" value={formData["Lokasi Kerja"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan / Project</label>
            <input type="text" name="Keterangan/Project" value={formData["Keterangan/Project"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Jam Masuk (Check In)</label>
            <input type="time" name="Check In" value={formData["Check In"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Jam Pulang (Check Out)</label>
            <input type="time" name="Check Out" value={formData["Check Out"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Jam Kerja</label>
            <input type="text" name="Total Jam Kerja" value={formData["Total Jam Kerja"] || ""} readOnly className="w-full px-3 py-2 text-sm rounded-xl border border-slate-205 dark:border-slate-705 bg-slate-100 dark:bg-slate-900 text-slate-500 pointer-events-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status Absensi</label>
            <select name="Status" value={formData["Status"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required>
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Alpa">Alpa</option>
              <option value="Cuti">Cuti</option>
            </select>
          </div>
        </>
      );
    }

    // Default/Fallback view schema: `semua-proyek`
    return (
      <>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal SPK</label>
          <input type="date" name="Tanggal SPK" value={formData["Tanggal SPK"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nomor SPK</label>
          <input type="text" name="Nomor SPK" value={formData["Nomor SPK"] || ""} onChange={handleChange} placeholder="Contoh: 001/SPK/..." className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama Perusahaan</label>
          <input type="text" name="Nama Perusahaan" value={formData["Nama Perusahaan"] || ""} onChange={handleChange} placeholder="Masukkan nama perusahaan" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nama SPK (Proyek)</label>
          <input type="text" name="Nama SPK" value={formData["Nama SPK"] || ""} onChange={handleChange} placeholder="Masukkan nama proyek" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nilai SPK</label>
          <input type="number" step="any" name="Nilai SPK" value={formData["Nilai SPK"] || ""} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Invoice</label>
          <input type="number" step="any" name="Nilai Invoice" value={formData["Nilai Invoice"] || ""} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Terbayar</label>
          <input type="number" step="any" name="Nilai Terbayar" value={formData["Nilai Terbayar"] || ""} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status Proyek</label>
          <select name="Status Proyek" value={formData["Status Proyek"] || ""} onChange={handleChange} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" required>
            <option value="In Progress">In Progress</option>
            <option value="Invoice">Invoice</option>
            <option value="Lunas">Lunas</option>
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">URL Dokumen</label>
          <input type="url" name="URL Dokumen" value={formData["URL Dokumen"] || ""} onChange={handleChange} placeholder="https://..." className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keterangan</label>
          <textarea name="Keterangan" value={formData["Keterangan"] || ""} onChange={handleChange} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500" placeholder="Keterangan tambahan..." />
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] transition-all">
      <div className="bg-white dark:bg-slate-800 rounded w-full max-w-2xl border border-slate-300 dark:border-slate-700 shadow flex flex-col max-h-[85vh] overflow-hidden transform transition-transform animate-scaleUp">
        
        {/* Modal Header */}
        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            {titleText}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-750 dark:hover:text-white rounded transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body form */}
        <form onSubmit={handleFormSubmit} className="flex flex-col flex-grow overflow-hidden">
          <div className="p-4 overflow-y-auto space-y-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 content-start">
            {/* Display local error boundary failures inside form */}
            {errorLocal && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-900/40 rounded flex items-start gap-2 text-red-700 dark:text-red-400 text-xs font-semibold md:col-span-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorLocal}</span>
              </div>
            )}
            
            {renderFields()}
          </div>

          {/* Modal Footer Actions - Bootstrap 5 button alignments */}
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-700 flex justify-end items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn-bs-secondary px-3 py-1.5 hover:bg-secondary text-white rounded text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-bs-primary px-3 py-1.5 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Data"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
