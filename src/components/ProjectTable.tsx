import React, { useState, useMemo } from "react";
import { 
  Search, Eye, Edit3, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, 
  Settings, Download, RefreshCw, AlertCircle, X, Check, FileDown,
  Database, Briefcase, CheckCircle, Landmark, TrendingUp, Sparkles, 
  FileText, Users, MapPin, FileSpreadsheet, Clock, HardHat, List, Plus
} from "lucide-react";
import { FilterState, SortState } from "../types";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface ProjectTableProps {
  data: any[];
  viewId: string;
  loading: boolean;
  onEdit: (row: any) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  userRole: string;
}

export default function ProjectTable({ data, viewId, loading, onEdit, onDelete, onAddNew, userRole }: ProjectTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const [sortState, setSortState] = useState<SortState>({
    column: "",
    direction: "asc"
  });

  // Filters State
  const [filters, setFilters] = useState<Partial<FilterState>>({
    tahun: "Semua Tahun",
    perusahaan: "Semua Perusahaan",
    namaSPK: "Semua SPK",
    statusProyek: "Semua Status",
    tipe: "Semua Tipe",
    zona: "Semua Zona",
    tahunPO: "Semua Tahun PO",
    supplier: "Semua Supplier",
    materialName: "Semua Material",
    statusMaterial: "Semua Status Material",
    entries: "Semua",
    tahunInvoice: "Semua Tahun Invoice",
    bulanInvoice: "Semua Bulan Invoice",
    tahunPembayaran: "Semua Tahun Pembayaran",
    bulanPembayaran: "Semua Bulan Pembayaran",
    statusInvoice: "Semua Status Invoice",
    statusPembayaran: "Semua Status Pembayaran",
    jabatan: "Semua Jabatan",
    areaKerja: "Semua Area Kerja",
    tahunSJ: "Semua Tahun SJ",
    daop: "Semua DAOP",
    bulan: "Semua Bulan",
    namaPM: "Semua Nama PM",
    lokasiKerja: "Semua Lokasi Kerja",
    project: "Semua Project",
    hadir: "Semua Hadir"
  });

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilters({
      tahun: "Semua Tahun",
      perusahaan: "Semua Perusahaan",
      namaSPK: "Semua SPK",
      statusProyek: "Semua Status",
      tipe: "Semua Tipe",
      zona: "Semua Zona",
      tahunPO: "Semua Tahun PO",
      supplier: "Semua Supplier",
      materialName: "Semua Material",
      statusMaterial: "Semua Status Material",
      entries: "Semua",
      tahunInvoice: "Semua Tahun Invoice",
      bulanInvoice: "Semua Bulan Invoice",
      tahunPembayaran: "Semua Tahun Pembayaran",
      bulanPembayaran: "Semua Bulan Pembayaran",
      statusInvoice: "Semua Status Invoice",
      statusPembayaran: "Semua Status Pembayaran",
      jabatan: "Semua Jabatan",
      areaKerja: "Semua Area Kerja",
      tahunSJ: "Semua Tahun SJ",
      daop: "Semua DAOP",
      bulan: "Semua Bulan",
      namaPM: "Semua Nama PM",
      lokasiKerja: "Semua Lokasi Kerja",
      project: "Semua Project",
      hadir: "Semua Hadir"
    });
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof FilterState, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setCurrentPage(1);
  };

  // Roles permissions
  const canWrite = userRole === "Super Admin";
  const canEdit = userRole === "Super Admin" || userRole === "Admin";

  // Helper formatting or calculations
  const parseNum = (v: any): number => {
    if (v === undefined || v === null || v === "-") return 0;
    return parseFloat(String(v).replace(/,/g, "")) || 0;
  };

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || val === "-") return "0.00";
    const num = parseFloat(String(val).replace(/,/g, ""));
    if (isNaN(num)) return val;
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (val: any) => {
    if (val === undefined || val === null || val === "-") return "0.00%";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return (num * 100).toFixed(2) + "%";
  };

  const formatDate = (val: any) => {
    if (!val || val === "-") return "-";
    try {
      let date: Date;
      if (val && typeof val === "object" && val.seconds !== undefined) {
        date = new Date(val.seconds * 1000);
      } else {
        date = new Date(val);
      }
      if (isNaN(date.getTime())) return val;
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      return `${String(date.getDate()).padStart(2, "0")}-${months[date.getMonth()]}-${date.getFullYear()}`;
    } catch (e) {
      return val;
    }
  };

  // Determine headers based on viewId
  const headers = useMemo(() => {
    if (viewId === "semua-proyek") {
      return [
        "Tanggal SPK", "Nomor SPK", "Nama Perusahaan", "Nama SPK",
        "Nilai SPK", "Nilai Invoice", "Nilai Terbayar",
        "Status Proyek", "URL Dokumen", "Keterangan"
      ];
    } else if (viewId === "daftar-pembayaran") {
      return [
        "Tanggal Pembayaran", "Nilai Pembayaran", "Nama Perusahaan",
        "Nama SPK", "Status", "Keterangan"
      ];
    } else if (viewId === "daftar-tagihan") {
      return [
        "Nama Perusahaan", "Nomor SPK", "Nama SPK", "Uraian Detail Invoice",
        "Nomor Invoice", "Tanggal Invoice", "Nilai Invoice",
        "Status Invoice", "Nilai Pembayaran", "Status Pembayaran",
        "URL Dokumen", "Keterangan"
      ];
    } else if (viewId === "daftar-karyawan") {
      return [
        "Nama Karyawan", "Jabatan", "No Telepon", "No KTP",
        "Alamat Lengkap", "Nomor Rekening", "Alamat Email",
        "No ID Karyawan", "Area Kerja", "URL Dokumen", "Keterangan"
      ];
    } else if (viewId === "daftar-pelaksana") {
      return [
        "Nama Mandor", "Jabatan", "No Telepon", "No KTP",
        "Alamat Lengkap", "No Rekening", "Email",
        "Area Kerja", "URL Dokumen", "Keterangan"
      ];
    } else if (viewId === "daftar-absensi") {
      return [
        "Tanggal", "Nama Karyawan", "NIK", "Nama PM", "Lokasi Kerja",
        "Keterangan/Project", "Check In", "Check Out", "Total Jam Kerja", "Status"
      ];
    } else if (viewId === "jrp-jobj-spk" || viewId.endsWith("-spk")) {
      return viewId.startsWith("surge-") 
        ? ["DAOP", "Segmen", "FO 48c", "FO 96c", "Total FO", "BoQ Ext Pole", "Bobot", "Keterangan"]
        : ["Item Pekerjaan", "Satuan", "Harga Satuan", "Volume BoQ", "Total Nilai BoQ", "Bobot", "Keterangan"];
    } else if (viewId === "jrp-jobj-bon-material") {
      return [
        "Tanggal SJ", "No Surat Jalan", "Nama Material", "Satuan", 
        "Volume", "Gudang", "User", "Nama Proyek", "Nama Lokasi", "Keterangan"
      ];
    } else if (viewId.endsWith("-material")) {
      return [
        "Tanggal PO", "Nomor PO Material", "Nama Supplier", "Nama Material",
        "Spesifikasi Material", "Satuan", "Volume", "Harga Satuan", "Total Harga",
        "Status Material", "URL Dokumen", "Keterangan"
      ];
    } else if (viewId === "jrp-jobj-boq" || viewId.endsWith("-boq")) {
      return ["Item Pekerjaan", "Satuan", "Harga Satuan", "Volume BoQ", "Total Nilai BoQ", "Keterangan"];
    } else if (viewId.endsWith("-rekon")) {
      return ["Item Pekerjaan", "Satuan", "Harga Satuan", "Volume Rekon", "Total Nilai Rekon", "Keterangan"];
    }
    
    // Default fallback columns if any
    return data.length > 0 
      ? Object.keys(data[0]).filter(k => k !== "id" && k !== "CreatedAt" && k !== "docId")
      : [];
  }, [viewId, data]);

  // Extract filter parameters from raw data
  const filterParams = useMemo(() => {
    const years = new Set<string>();
    const companies = new Set<string>();
    const spkNames = new Set<string>();
    const statusSet = new Set<string>();
    const suppliers = new Set<string>();
    const materials = new Set<string>();
    const statusMaterials = new Set<string>();
    const jabatans = new Set<string>();
    const areas = new Set<string>();
    const daops = new Set<string>();
    const pms = new Set<string>();
    const locations = new Set<string>();
    const statuses = new Set<string>();

    data.forEach(item => {
      // Years SPK/PO/Payment
      const dateVal = item["Tanggal SPK"] || item["Tanggal Pembayaran"] || item["Tanggal Invoice"] || item["Tanggal PO"] || item["Tanggal SJ"];
      if (dateVal) {
        let dateObj: Date;
        if (dateVal.seconds) dateObj = new Date(dateVal.seconds * 1000);
        else dateObj = new Date(dateVal);
        if (!isNaN(dateObj.getTime())) {
          years.add(String(dateObj.getFullYear()));
        }
      }

      if (item["Nama Perusahaan"]) companies.add(String(item["Nama Perusahaan"]));
      if (item["Nama SPK"]) spkNames.add(String(item["Nama SPK"]));
      if (item["Status Proyek"]) statusSet.add(String(item["Status Proyek"]));
      if (item["Nama Supplier"]) suppliers.add(String(item["Nama Supplier"]));
      if (item["Nama Material"]) materials.add(String(item["Nama Material"]));
      if (item["Status Material"]) statusMaterials.add(String(item["Status Material"]));
      if (item["Jabatan"]) jabatans.add(String(item["Jabatan"]));
      if (item["Area Kerja"]) areas.add(String(item["Area Kerja"]));
      if (item["DAOP"]) daops.add(String(item["DAOP"]));
      if (item["Nama PM"]) pms.add(String(item["Nama PM"]));
      if (item["Lokasi Kerja"]) locations.add(String(item["Lokasi Kerja"]));
      if (item["Status"]) statuses.add(String(item["Status"]));
    });

    return {
      years: Array.from(years).sort((a, b) => b.localeCompare(a)),
      companies: Array.from(companies).sort(),
      spkNames: Array.from(spkNames).sort(),
      states: Array.from(statusSet).sort(),
      suppliers: Array.from(suppliers).sort(),
      materials: Array.from(materials).sort(),
      statusMaterials: Array.from(statusMaterials).sort(),
      jabatans: Array.from(jabatans).sort(),
      areas: Array.from(areas).sort(),
      daops: Array.from(daops).sort(),
      pms: Array.from(pms).sort(),
      locations: Array.from(locations).sort(),
      statuses: Array.from(statuses).sort()
    };
  }, [data]);

  // Autocomplete suggestion collection
  const stringSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const suggestions = new Set<string>();
    
    data.forEach(item => {
      headers.forEach(h => {
        const val = item[h];
        if (val && typeof val === "string" && val.toLowerCase().includes(searchTerm.toLowerCase())) {
          suggestions.add(val);
        }
      });
    });

    return Array.from(suggestions).slice(0, 8);
  }, [searchTerm, data, headers]);

  // Filtering + Sorting workflow
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // 1. Text Search matching keywords
    if (searchTerm.trim()) {
      const queryWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      result = result.filter(item => {
        const rowString = Object.entries(item)
          .filter(([key]) => headers.includes(key))
          .map(([_, val]) => String(val))
          .join(" ")
          .toLowerCase();
        return queryWords.every(word => rowString.includes(word));
      });
    }

    // 2. Multi filters
    if (filters.tahun !== "Semua Tahun") {
      result = result.filter(item => {
        const dateVal = item["Tanggal SPK"] || item["Tanggal Pembayaran"] || item["Tanggal Invoice"] || item["Tanggal PO"] || item["Tanggal SJ"];
        if (!dateVal) return false;
        const dObj = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
        return String(dObj.getFullYear()) === filters.tahun;
      });
    }

    if (filters.perusahaan !== "Semua Perusahaan") {
      result = result.filter(item => item["Nama Perusahaan"] === filters.perusahaan);
    }

    if (filters.namaSPK !== "Semua SPK") {
      result = result.filter(item => item["Nama SPK"] === filters.namaSPK);
    }

    if (filters.statusProyek !== "Semua Status") {
      result = result.filter(item => item["Status Proyek"] === filters.statusProyek);
    }

    if (filters.supplier !== "Semua Supplier") {
      result = result.filter(item => item["Nama Supplier"] === filters.supplier);
    }

    if (filters.materialName !== "Semua Material") {
      result = result.filter(item => item["Nama Material"] === filters.materialName);
    }

    if (filters.statusMaterial !== "Semua Status Material") {
      result = result.filter(item => item["Status Material"] === filters.statusMaterial);
    }

    if (filters.jabatan !== "Semua Jabatan") {
      result = result.filter(item => item["Jabatan"] === filters.jabatan);
    }

    if (filters.areaKerja !== "Semua Area Kerja") {
      result = result.filter(item => item["Area Kerja"] === filters.areaKerja);
    }

    if (filters.daop !== "Semua DAOP") {
      result = result.filter(item => item["DAOP"] === filters.daop);
    }

    if (filters.namaPM !== "Semua Nama PM") {
      result = result.filter(item => item["Nama PM"] === filters.namaPM);
    }

    if (filters.lokasiKerja !== "Semua Lokasi Kerja") {
      result = result.filter(item => item["Lokasi Kerja"] === filters.lokasiKerja);
    }

    if (filters.hadir !== "Semua Hadir") {
      result = result.filter(item => item["Status"] === filters.hadir);
    }

    // 3. Sorting
    if (sortState.column) {
      const col = sortState.column;
      const desc = sortState.direction === "desc";
      const originalIndexes = new Map(data.map((item, idx) => [item, idx]));
      result.sort((a, b) => {
        if (col === "No") {
          const idxA = originalIndexes.get(a) ?? 0;
          const idxB = originalIndexes.get(b) ?? 0;
          return desc ? idxB - idxA : idxA - idxB;
        }

        let valA = a[col];
        let valB = b[col];

        // Format dates
        if (col.toLowerCase().includes("tanggal") || col === "Tanggal SJ") {
          const tA = valA && valA.seconds ? valA.seconds * 1000 : new Date(valA).getTime() || 0;
          const tB = valB && valB.seconds ? valB.seconds * 1000 : new Date(valB).getTime() || 0;
          return desc ? tB - tA : tA - tB;
        }

        // Format numbers
        if (col.toLowerCase().includes("nilai") || col.toLowerCase().includes("harga") || col.toLowerCase().includes("volume") || col === "Bobot") {
          const nA = parseNum(valA);
          const nB = parseNum(valB);
          return desc ? nB - nA : nA - nB;
        }

        // Default strings compare
        const sA = String(valA || "").toLowerCase();
        const sB = String(valB || "").toLowerCase();
        return desc ? sB.localeCompare(sA) : sA.localeCompare(sB);
      });
    }

    return result;
  }, [data, searchTerm, filters, sortState, headers]);

  // Formulated pagination limits
  const totalEntriesCount = filteredAndSortedData.length;
  const itemsPerPage = filters.entries === "Semua" ? totalEntriesCount : parseInt(filters.entries || "10");
  const totalPages = Math.ceil(totalEntriesCount / (itemsPerPage || 1)) || 1;

  const paginatedData = useMemo(() => {
    if (filters.entries === "Semua") return filteredAndSortedData;
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage, filters]);

  // Grouped sum values inside the footer row
  const tableFooters = useMemo(() => {
    const sums: Record<string, number> = {};
    const countCols = ["Nilai SPK", "Nilai Invoice", "Nilai Terbayar", "Nilai Pembayaran", "Total Harga", "Total Nilai BoQ", "Total Nilai Rekon", "Volume", "Bobot", "Total FO", "FO 48c", "FO 96c", "FO 96c_A", "FO 96c_B", "BoQ Ext Pole", "BoQ New Pole"];
    
    countCols.forEach(col => {
      sums[col] = filteredAndSortedData.reduce((total, row) => total + parseNum(row[col]), 0);
    });

    return sums;
  }, [filteredAndSortedData]);

  // Click sorting trigger
  const requestSort = (colName: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortState.column === colName && sortState.direction === "asc") {
      direction = "desc";
    }
    setSortState({ column: colName, direction });
  };

  // EXPORT Excel Handler
  const handleExportExcel = () => {
    if (filteredAndSortedData.length === 0) return;

    // Excel worksheet columns with formatted entries
    const rows = filteredAndSortedData.map((item, idx) => {
      const rowObj: Record<string, any> = { "No": idx + 1 };
      headers.forEach(h => {
        let val = item[h];
        if (val && typeof val === "object" && val.seconds !== undefined) {
          rowObj[h] = formatDate(val);
        } else if (h.toLowerCase().includes("nilai") || h.toLowerCase().includes("harga") || h.toLowerCase().includes("volume") || h === "Bobot") {
          rowObj[h] = parseNum(val);
        } else {
          rowObj[h] = val || "-";
        }
      });
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Proyek");
    
    // Auto-fit column widths
    const maxCols = headers.length + 1;
    worksheet["!cols"] = Array(maxCols).fill({ wch: 15 });

    XLSX.writeFile(workbook, `${viewId}_export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // EXPORT PDF Handler
  const handleExportPDF = () => {
    if (filteredAndSortedData.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const cols = ["No", ...headers];
    const rowsData = filteredAndSortedData.map((item, idx) => {
      return [
        idx + 1,
        ...headers.map(h => {
          let val = item[h];
          if (val && typeof val === "object" && val.seconds !== undefined) {
            return formatDate(val);
          }
          if (h.toLowerCase().includes("nilai") || h.toLowerCase().includes("harga")) {
            return formatCurrency(val);
          }
          if (h === "Bobot") {
            return formatPercent(val);
          }
          return val === undefined || val === null ? "-" : String(val);
        })
      ];
    });

    doc.setFont("helvetica", "bold");
    doc.text(`Dashboard Data Export - ${viewId.toUpperCase()}`, 14, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    (doc as any).autoTable({
      head: [cols],
      body: rowsData,
      startY: 20,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`${viewId}_export_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const getStatusBadgeClass = (status: any) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("lunas") || s === "ok" || s === "sudah dibayar" || s === "received" || s === "hadir") {
      return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-250 dark:border-emerald-900/30";
    }
    if (s.includes("progress") || s === "submit" || s === "dicicil" || s === "in transit" || s === "izin") {
      return "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-250 dark:border-amber-900/30";
    }
    if (s === "invoice" || s === "revisi" || s === "ordered") {
      return "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border border-indigo-250 dark:border-indigo-900/30";
    }
    return "bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-250 dark:border-red-900/30";
  };

  const paneMetrics = useMemo(() => {
    let m1 = { label: "Total Data Terdisplay", value: String(filteredAndSortedData.length) + " Baris", icon: "Database", color: "text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30" };
    let m2 = { label: "Total Nilai SPK", value: "-", icon: "Briefcase", color: "text-sky-500 bg-sky-50/70 dark:bg-sky-950/30" };
    let m3 = { label: "Total Terbayar", value: "-", icon: "CheckCircle", color: "text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30" };
    let m4 = { label: "Sisa Tagihan", value: "-", icon: "AlertCircle", color: "text-amber-500 bg-amber-50/70 dark:bg-amber-950/30" };

    if (viewId === "semua-proyek") {
      const spkSum = filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["Nilai SPK"]), 0);
      const paidSum = filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["Nilai Terbayar"]), 0);
      m2 = { label: "Total Nilai SPK", value: "Rp " + formatCurrency(spkSum), icon: "Briefcase", color: "text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30" };
      m3 = { label: "Sudah Terbayar", value: "Rp " + formatCurrency(paidSum), icon: "CheckCircle", color: "text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30" };
      m4 = { label: "Sisa SPK Belum Bayar", value: "Rp " + formatCurrency(Math.max(0, spkSum - paidSum)), icon: "AlertCircle", color: "text-amber-500 bg-amber-50/70 dark:bg-amber-950/30" };
    } else if (viewId === "daftar-pembayaran") {
      const paySum = filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["Nilai Pembayaran"]), 0);
      m2 = { label: "Total Pembayaran", value: "Rp " + formatCurrency(paySum), icon: "Landmark", color: "text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30" };
      m3 = { label: "Bulan Ini", value: String(filteredAndSortedData.filter(r => {
        const dStr = r["Tanggal Pembayaran"];
        if (!dStr) return false;
        const d = dStr.seconds ? new Date(dStr.seconds * 1000) : new Date(dStr);
        return d && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
      }).length) + " Transaksi", icon: "TrendingUp", color: "text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30" };
      m4 = { label: "Rata-rata Transaksi", value: "Rp " + formatCurrency(filteredAndSortedData.length ? paySum / filteredAndSortedData.length : 0), icon: "Sparkles", color: "text-sky-500 bg-sky-50/70 dark:bg-sky-950/30" };
    } else if (viewId === "daftar-tagihan") {
      const invoiceSum = filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["Nilai Invoice"]), 0);
      const paidSum = filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["Nilai Pembayaran"]), 0);
      m2 = { label: "Total Nilai Invoice", value: "Rp " + formatCurrency(invoiceSum), icon: "FileText", color: "text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30" };
      m3 = { label: "Nilai Terbayar", value: "Rp " + formatCurrency(paidSum), icon: "CheckCircle", color: "text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30" };
      m4 = { label: "Sisa Piutang", value: "Rp " + formatCurrency(Math.max(0, invoiceSum - paidSum)), icon: "AlertCircle", color: "text-red-500 bg-red-50/70 dark:bg-red-950/30" };
    } else if (viewId === "daftar-karyawan" || viewId === "daftar-pelaksana") {
      const currentLabel = viewId === "daftar-karyawan" ? "Karyawan" : "Pelaksana";
      const countByWorkplace: Record<string, number> = {};
      filteredAndSortedData.forEach(r => {
        const area = r["Area Kerja"] || "Lainnya";
        countByWorkplace[area] = (countByWorkplace[area] || 0) + 1;
      });
      const topArea = Object.entries(countByWorkplace).sort((a,b) => b[1]-a[1])[0];
      m2 = { label: `Total Staf ${currentLabel}`, value: String(filteredAndSortedData.length) + " Orang", icon: "Users", color: "text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30" };
      m3 = { label: "Sektor Terpadat", value: topArea ? `${topArea[0]} (${topArea[1]} org)` : "-", icon: "MapPin", color: "text-sky-500 bg-sky-50/70 dark:bg-sky-950/30" };
      m4 = { label: "Lengkap Dokumen", value: String(filteredAndSortedData.filter(r => r["URL Dokumen"] && r["URL Dokumen"] !== "-").length) + " Orang", icon: "FileSpreadsheet", color: "text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30" };
    } else if (viewId === "daftar-absensi") {
      const total = filteredAndSortedData.length;
      const hadir = filteredAndSortedData.filter(r => String(r["Status"] || "").toLowerCase().includes("hadir")).length;
      const izin = filteredAndSortedData.filter(r => {
        const statusStr = String(r["Status"] || "").toLowerCase();
        return statusStr.includes("izin") || statusStr.includes("sakit");
      }).length;
      m2 = { label: "Kehadiran Staf", value: String(hadir) + " Hadir", icon: "CheckCircle", color: "text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30" };
      m3 = { label: "Tingkat Kehadiran", value: total ? ((hadir / total) * 105).toFixed(1).replace("105", "100") + "%" : "0.0%", icon: "TrendingUp", color: "text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30" };
      m4 = { label: "Izin / Absen", value: String(izin) + " Orang", icon: "Clock", color: "text-amber-500 bg-amber-50/70 dark:bg-amber-950/30" };
    } else if (viewId.endsWith("-material") || viewId.endsWith("-bon-material")) {
      const isBon = viewId.endsWith("-bon-material");
      const volSum = filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["Volume"]), 0);
      if (!isBon) {
        const totalHarga = filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["Total Harga"]), 0);
        m2 = { label: "Total Nilai PO", value: "Rp " + formatCurrency(totalHarga), icon: "HardHat", color: "text-amber-500 bg-amber-50/70 dark:bg-amber-950/30" };
        m3 = { label: "Total Volume PO", value: volSum.toLocaleString("id-ID") + " Unit", icon: "TrendingUp", color: "text-sky-500 bg-sky-50/70 dark:bg-sky-950/30" };
        m4 = { label: "Status Terkirim", value: String(filteredAndSortedData.filter(r => {
          const mStr = String(r["Status Material"] || "").toLowerCase();
          return mStr.includes("received") || mStr.includes("diterima");
        }).length) + " PO", icon: "CheckCircle", color: "text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30" };
      } else {
        m2 = { label: "Total Surat Jalan", value: String(filteredAndSortedData.length) + " Record", icon: "FileText", color: "text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30" };
        m3 = { label: "Volume Mobilisasi", value: volSum.toLocaleString("id-ID") + " Unit", icon: "TrendingUp", color: "text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30" };
        m4 = { label: "Gudang Terlibat", value: String(new Set(filteredAndSortedData.map(r => r["Gudang"]).filter(Boolean)).size) + " Gudang", icon: "MapPin", color: "text-sky-500 bg-sky-50/70 dark:bg-sky-950/30" };
      }
    } else if (viewId.endsWith("-spk") || viewId.endsWith("-boq") || viewId.endsWith("-rekon")) {
      const isRekon = viewId.endsWith("-rekon");
      const isSpk = viewId.endsWith("-spk");
      const isSurge = viewId.startsWith("surge-") && isSpk;
      
      if (isSurge) {
        const totFO = filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["Total FO"]), 0);
        m2 = { label: "Total Realisasi FO", value: totFO.toLocaleString("id-ID") + " m", icon: "TrendingUp", color: "text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30" };
        m3 = { label: "Ext Pole Required", value: filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["BoQ Ext Pole"]), 0).toLocaleString("id-ID") + " Unit", icon: "AlertCircle", color: "text-amber-500 bg-amber-50/70 dark:bg-amber-950/30" };
        m4 = { label: "Alokasi Segmen", value: String(new Set(filteredAndSortedData.map(r => r["Segmen"]).filter(Boolean)).size) + " Segmen", icon: "MapPin", color: "text-sky-500 bg-sky-50/70 dark:bg-sky-950/30" };
      } else {
        const priceCol = isRekon ? "Total Nilai Rekon" : "Total Nilai BoQ";
        const sumVal = filteredAndSortedData.reduce((tot, r) => tot + parseNum(r[priceCol]), 0);
        const totalItems = filteredAndSortedData.length;
        m2 = { label: isRekon ? "Total Nilai Rekon" : "Total Nilai BoQ", value: "Rp " + formatCurrency(sumVal), icon: "Briefcase", color: "text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30" };
        m3 = { label: "Kategori Item", value: String(totalItems) + " Item Pekerjaan", icon: "List", color: "text-sky-500 bg-sky-50/70 dark:bg-sky-950/30" };
        m4 = { label: "Bobot Kumulatif", value: (filteredAndSortedData.reduce((tot, r) => tot + parseNum(r["Bobot"]), 0) * 100).toFixed(2) + "%", icon: "TrendingUp", color: "text-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30" };
      }
    }

    return [m1, m2, m3, m4];
  }, [viewId, filteredAndSortedData]);

  const selectMetricIcon = (iconName: string) => {
    switch (iconName) {
      case "Database": return <Database className="w-5 h-5 text-indigo-500" />;
      case "Briefcase": return <Briefcase className="w-5 h-5 text-sky-500" />;
      case "CheckCircle": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "AlertCircle": return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "Landmark": return <Landmark className="w-5 h-5 text-emerald-500" />;
      case "TrendingUp": return <TrendingUp className="w-5 h-5 text-indigo-500" />;
      case "Sparkles": return <Sparkles className="w-5 h-5 text-sky-500" />;
      case "FileText": return <FileText className="w-5 h-5 text-indigo-500" />;
      case "Users": return <Users className="w-5 h-5 text-indigo-500" />;
      case "MapPin": return <MapPin className="w-5 h-5 text-sky-500" />;
      case "FileSpreadsheet": return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case "Clock": return <Clock className="w-5 h-5 text-amber-500" />;
      case "HardHat": return <HardHat className="w-5 h-5 text-amber-500" />;
      case "List": return <List className="w-5 h-5 text-sky-500" />;
      default: return <Database className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Pane Dynamic Quick Metrics Grid - Bootstrap style cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeIn">
        {paneMetrics.map((met, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{met.label}</span>
              <h5 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{met.value}</h5>
            </div>
            <div className={`p-2 rounded ${met.color.replace("bg-indigo-50/70", "bg-blue-50/80").replace("bg-sky-50/70", "bg-cyan-50/60").replace("bg-emerald-50/70", "bg-green-50/70")}`}>
              {selectMetricIcon(met.icon)}
            </div>
          </div>
        ))}
      </div>

      {/* 2-Row Filter Bar - Bootstrap card style with gray background header */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm p-4 space-y-3">
        
        {/* Row 1: Direct Fields Filters depending on state */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          
          {/* Quick Search */}
          <div className="space-y-1 sm:col-span-2 relative">
            <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Cari Kata Kunci</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><Search className="w-3.5 h-3.5" /></span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                  setCurrentPage(1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Cari..."
                className="w-full pl-8 pr-7 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 transition-all font-semibold"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Suggestions Overlay */}
            {showSuggestions && stringSuggestions.length > 0 && (
              <div className="absolute top-[100%] left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded shadow-lg z-[40] max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 animate-fade">
                {stringSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onMouseDown={() => setSearchTerm(item)}
                    className="w-full text-left px-3 py-1.5 text-[10.5px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-all truncate block"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conditional Dropdown Filters with Bootstrap style label and select */}
          {filterParams.years.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Tahun SPK</span>
              <select
                value={filters.tahun}
                onChange={(e) => handleFilterChange("tahun", e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Semua Tahun">Semua Tahun</option>
                {filterParams.years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {filterParams.companies.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Perusahaan</span>
              <select
                value={filters.perusahaan}
                onChange={(e) => handleFilterChange("perusahaan", e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Semua Perusahaan">Semua Perusahaan</option>
                {filterParams.companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {filterParams.states.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Status Proyek</span>
              <select
                value={filters.statusProyek}
                onChange={(e) => handleFilterChange("statusProyek", e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Semua Status">Semua Status</option>
                {filterParams.states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {filterParams.suppliers.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Supplier</span>
              <select
                value={filters.supplier}
                onChange={(e) => handleFilterChange("supplier", e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Semua Supplier">Semua Supplier</option>
                {filterParams.suppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {filterParams.materials.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Material</span>
              <select
                value={filters.materialName}
                onChange={(e) => handleFilterChange("materialName", e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Semua Material">Semua Material</option>
                {filterParams.materials.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {filterParams.jabatans.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Jabatan</span>
              <select
                value={filters.jabatan}
                onChange={(e) => handleFilterChange("jabatan", e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Semua Jabatan">Semua Jabatan</option>
                {filterParams.jabatans.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          )}

          {filterParams.areas.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Area Kerja</span>
              <select
                value={filters.areaKerja}
                onChange={(e) => handleFilterChange("areaKerja", e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Semua Area Kerja">Semua Area Kerja</option>
                {filterParams.areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}

          {filterParams.daops.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">DAOP</span>
              <select
                value={filters.daop}
                onChange={(e) => handleFilterChange("daop", e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Semua DAOP">Semua DAOP</option>
                {filterParams.daops.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {filterParams.statuses.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Status</span>
              <select
                value={filters.hadir}
                onChange={(e) => handleFilterChange("hadir", e.target.value)}
                className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="Semua Hadir">Semua</option>
                {filterParams.statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Row limit page limit selection */}
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">Tampilkan</span>
            <select
              value={filters.entries}
              onChange={(e) => handleFilterChange("entries", e.target.value)}
              className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded border border-slate-300 dark:border-slate-700 outline-none"
            >
              <option value="Semua">Semua</option>
              <option value="5">5 Data</option>
              <option value="10">10 Data</option>
              <option value="25">25 Data</option>
              <option value="50">50 Data</option>
              <option value="100">100 Data</option>
            </select>
          </div>

        </div>

        {/* Row 2: Action Controllers (Export Buttons, Add Data, Reset Buttons) in standard Bootstrap button theme structure */}
        <div className="flex flex-wrap gap-2 items-center justify-between border-t border-slate-100 dark:border-slate-750 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {canWrite && (
              <button
                onClick={onAddNew}
                className="btn-bs-primary px-3 py-1.5 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-sm cursor-pointer transition-all flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Data</span>
              </button>
            )}
            <button
              onClick={handleResetFilters}
              className="btn-bs-secondary px-3 py-1.5 hover:bg-secondary text-white rounded transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportExcel}
              disabled={filteredAndSortedData.length === 0}
              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-300 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filteredAndSortedData.length === 0}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-300 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF Rekap</span>
            </button>
          </div>
        </div>

      </div>

      {/* Grid Table Container - Bootstrap panel border */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded overflow-hidden shadow-sm relative">
        <div className="overflow-x-auto min-h-[300px] relative">
          {loading ? (
            <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/80 backdrop-blur-xs flex items-center justify-center z-20">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-350">Data Kosong</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Silakan ubah kata kunci pencarian Anda.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs table-striped table-hover">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wide sticky top-0 z-[5]">
                  <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200 dark:border-slate-750">Aksi</th>
                  <th
                    onClick={() => requestSort("No")}
                    className="py-2.5 px-3 w-16 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 select-none whitespace-nowrap text-center transition-all border-r border-slate-200 dark:border-slate-750"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>No</span>
                      <ArrowUpDown className={`w-3 h-3 ${sortState.column === "No" ? "text-blue-500" : "text-slate-400"}`} />
                    </div>
                  </th>
                  {headers.map(h => {
                    const isSorted = sortState.column === h;
                    return (
                      <th
                        key={h}
                        onClick={() => requestSort(h)}
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 select-none whitespace-nowrap text-center transition-all border-r border-slate-200 dark:border-slate-750"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{h.replace(/_/g, " ")}</span>
                          <ArrowUpDown className={`w-3 h-3 ${isSorted ? "text-blue-500" : "text-slate-400"}`} />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {paginatedData.map((row, idx) => {
                  const numberIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-750/30 transition-all">
                      
                      {/* Action buttons styled with Bootstrap btn-warning / btn-secondary variants */}
                      <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700 align-middle">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit ? (
                            <button
                              onClick={() => onEdit(row)}
                              className="p-1 text-slate-700 hover:text-white hover:bg-amber-500 border border-amber-400 dark:text-amber-500 rounded cursor-pointer transition-all bg-amber-500/10"
                              title="Sunting"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {}}
                              className="p-1 border border-slate-200 text-slate-400 rounded bg-slate-50 opacity-40 cursor-not-allowed"
                              title="Hanya Lihat"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3 text-center font-bold text-slate-450 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap align-middle">{numberIndex}</td>

                      {/* Dynamic TD value loader */}
                      {headers.map(h => {
                        let val = row[h];
                        let contentToRender: React.ReactNode = String(val !== undefined && val !== null ? val : "-");
                        let cellStyle = "text-center";

                        // Apply standard mappings of keys
                        if (h.toLowerCase().includes("tanggal") || h === "Tanggal SJ") {
                          contentToRender = <span className="font-semibold text-slate-500 dark:text-slate-400">{formatDate(val)}</span>;
                          cellStyle = "text-center whitespace-nowrap";
                        } else if (h.toLowerCase().includes("nilai") || h.toLowerCase().includes("harga") || h.toLowerCase().includes("pembayaran") || h.toLowerCase().includes("total") || h === "HP BoQ") {
                          contentToRender = <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(val)}</span>;
                          cellStyle = "text-right whitespace-nowrap";
                        } else if (h === "Bobot") {
                          contentToRender = <span className="font-bold text-slate-800 dark:text-slate-200">{formatPercent(val)}</span>;
                          cellStyle = "text-right whitespace-nowrap";
                        } else if (h.startsWith("Status")) {
                          contentToRender = (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(val)}`}>
                              {val || "-"}
                            </span>
                          );
                          cellStyle = "text-center whitespace-nowrap";
                        } else if (h === "URL Dokumen" && val && val !== "-") {
                          contentToRender = (
                            <a
                              href={String(val)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 dark:hover:text-white border border-blue-200 dark:border-blue-900/30 rounded font-bold text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer mx-auto max-w-[120px]"
                            >
                              <span>Buka File</span>
                            </a>
                          );
                          cellStyle = "text-center";
                        } else if (h === "Alamat Lengkap" || h === "Keterangan") {
                          contentToRender = <p className="max-w-[200px] truncate text-slate-500 dark:text-slate-400 font-normal" title={String(val || "")}>{val || "-"}</p>;
                          cellStyle = "text-left";
                        } else {
                          // Standard strings
                          contentToRender = <span className="font-bold text-slate-800 dark:text-slate-200">{val !== undefined && val !== null ? String(val) : "-"}</span>;
                          cellStyle = h === "Nama Cluster" || h === "Item Pekerjaan" || h === "Nama Perusahaan" ? "text-left max-w-sm truncate" : "text-center";
                        }

                        return (
                          <td key={h} className={`py-2 px-3 text-xs border-r border-slate-200 dark:border-slate-700 align-middle whitespace-nowrap ${cellStyle}`}>
                            {contentToRender}
                          </td>
                        );
                      })}

                      {/* Trash Delete button */}
                      <td className="py-2 px-3 text-center align-middle">
                        {canWrite ? (
                          <button
                            onClick={() => onDelete(row.id)}
                            className="p-1 text-slate-700 hover:text-white hover:bg-red-500 border border-red-400 dark:text-red-500 rounded cursor-pointer transition-all bg-red-500/10"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-1 bg-slate-100 text-slate-400 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded opacity-30 cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>

              {/* Total calculations footer row */}
              {data.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-xs">
                    <td className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-700"></td>
                    <td className="py-2 px-3 text-center font-bold border-r border-slate-200 dark:border-slate-700">TOTAL</td>
                    {headers.map(h => {
                      let output: React.ReactNode = "";
                      let style = "text-center";
                      
                      const isCountable = tableFooters[h] !== undefined && tableFooters[h] !== 0;
                      if (isCountable) {
                        if (h === "Bobot") {
                          output = formatPercent(tableFooters[h]);
                        } else {
                          output = formatCurrency(tableFooters[h]);
                        }
                        style = "text-right text-blue-600 dark:text-blue-400 whitespace-nowrap";
                      }

                      return (
                        <td key={h} className={`py-2 px-3 border-r border-slate-200 dark:border-slate-700 ${style}`}>
                          {output}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-center"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Paginated Controller footer */}
        {filters.entries !== "Semua" && totalEntriesCount > 0 && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">
              Menampilkan {Math.min(filteredAndSortedData.length, (currentPage - 1) * itemsPerPage + 1)} s/d {Math.min(filteredAndSortedData.length, currentPage * itemsPerPage)} dari {filteredAndSortedData.length} baris data
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 rounded text-slate-600 disabled:opacity-40 select-none cursor-pointer transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 bg-blue-600 text-white font-extrabold rounded border border-blue-600 text-center">
                {currentPage}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 rounded text-slate-600 disabled:opacity-40 select-none cursor-pointer transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
