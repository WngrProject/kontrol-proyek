import React, { useMemo, useState, useEffect } from "react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid
} from "recharts";
import { 
  Briefcase, CheckCircle, Clock, FileSpreadsheet, FileText, 
  TrendingUp, Scale, Wallet, ArrowUpRight
} from "lucide-react";

interface DashboardOverviewProps {
  proyek: any[];
  pembayaran: any[];
  tagihan: any[];
  onSelectView: (viewId: string, title: string, isSub: boolean) => void;
}

// Custom Tooltip component for Recharts
const CustomChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    const titleText = payload[0]?.payload?.fullName || label;
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-100 dark:border-slate-800 p-3.5 shadow-xl rounded-xl space-y-1.5 backdrop-blur-md max-w-xs sm:max-w-sm md:max-w-md break-words">
        <p className="text-slate-900 dark:text-slate-100 font-bold text-xs">{titleText}</p>
        <div className="space-y-0.5">
          {payload.map((item: any, idx: number) => (
            <p key={idx} className="text-xs font-semibold flex items-center gap-1.5" style={{ color: item.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.name}:</span>
              <span>{formatter ? formatter(item.value) : item.value}</span>
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (v: number) => string;
}

const AnimatedCounter = ({ value, duration = 1000, formatter }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animFrameId: number;
    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(ease * value);
      if (progress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };
    animFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameId);
  }, [value, duration]);

  return <span>{formatter ? formatter(count) : Math.round(count).toLocaleString("id-ID")}</span>;
};

export default function DashboardOverview({ proyek, pembayaran, tagihan, onSelectView }: DashboardOverviewProps) {
  
  // Helper to parse rates or string numbers
  const parseNum = (v: any): number => {
    if (v === undefined || v === null || v === "-") return 0;
    return parseFloat(String(v).replace(/,/g, "")) || 0;
  };

  // Helper formatting to Rupiah
  const formatRp = (n: number) => {
    if (n >= 1e12) return "Rp " + (n / 1e12).toFixed(2) + " T";
    if (n >= 1e9) return "Rp " + (n / 1e9).toFixed(2) + " M";
    if (n >= 1e6) return "Rp " + (n / 1e6).toFixed(1) + " Jt";
    return "Rp " + n.toLocaleString("id-ID");
  };

  const formatFullRp = (n: number) => {
    return "Rp " + n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const totalProj = proyek.length;
    const lunas = proyek.filter(p => String(p["Status Proyek"] || "").toLowerCase().includes("lunas")).length;
    const berjalan = proyek.filter(p => String(p["Status Proyek"] || "").toLowerCase().includes("progress")).length;
    const invCount = proyek.filter(p => {
      const s = String(p["Status Proyek"] || "").toLowerCase();
      return s.includes("invoice") && !s.includes("progress");
    }).length;

    const spkSum = proyek.reduce((sum, p) => sum + parseNum(p["Nilai SPK"]), 0);
    const terbayarSum = proyek.reduce((sum, p) => sum + parseNum(p["Nilai Terbayar"]), 0);
    const tagihanSum = tagihan.reduce((sum, t) => sum + parseNum(t["Nilai Invoice"]), 0);
    const pembayaranSum = pembayaran.reduce((sum, p) => sum + parseNum(p["Nilai Pembayaran"]), 0);

    return {
      totalProj,
      lunas,
      berjalan,
      invCount,
      spkSum,
      terbayarSum,
      tagihanSum,
      pembayaranSum,
      lunasPct: totalProj > 0 ? (lunas / totalProj) * 100 : 0,
      berjalanPct: totalProj > 0 ? (berjalan / totalProj) * 100 : 0,
      terbayarPct: spkSum > 0 ? (terbayarSum / spkSum) * 100 : 0,
    };
  }, [proyek, pembayaran, tagihan]);

  // Chart Data 1: Top 10 Nilai SPK
  const chartSPKData = useMemo(() => {
    return [...proyek]
      .sort((a, b) => parseNum(b["Nilai SPK"]) - parseNum(a["Nilai SPK"]))
      .slice(0, 10)
      .map(p => {
        const title = p["Nama SPK"] || p["Nama Perusahaan"] || "N/A";
        return {
          shortName: title.length > 20 ? title.substring(0, 17) + "..." : title,
          fullName: title,
          "Nilai SPK": parseNum(p["Nilai SPK"])
        };
      });
  }, [proyek]);

  // Chart Data 2: Status Proyek (Pie)
  const chartStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    proyek.forEach(p => {
      let s = String(p["Status Proyek"] || "Tanpa Status").trim();
      if (s.toLowerCase().includes("lunas")) s = "Lunas";
      else if (s.toLowerCase().includes("progress")) s = "In Progress";
      else if (s.toLowerCase().includes("invoice")) s = "Invoice";
      counts[s] = (counts[s] || 0) + 1;
    });

    const colorsMap: Record<string, string> = {
      "Lunas": "#10b981",    // Emerald
      "Invoice": "#6366f1",  // Indigo
      "In Progress": "#f59e0b" // Amber
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: colorsMap[name] || "#0ea5e9"
    }));
  }, [proyek]);

  // Chart Data 3: Trend Pembayaran Bulanan (Line)
  const chartTrendData = useMemo(() => {
    const monthly: Record<string, number> = {};
    pembayaran.forEach(p => {
      const dateVal = p["Tanggal Pembayaran"];
      if (!dateVal) return;
      let date: Date;
      if (dateVal.seconds) date = new Date(dateVal.seconds * 1000);
      else date = new Date(dateVal);
      
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = (monthly[key] || 0) + parseNum(p["Nilai Pembayaran"]);
    });

    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, value]) => {
        const [year, mStr] = key.split("-");
        const monthIndex = parseInt(mStr) - 1;
        return {
          label: `${monthNamesShort[monthIndex]} ${year.substring(2)}`,
          Pembayaran: value
        };
      });
  }, [pembayaran]);

  // Chart Data 4: Nilai Invoice vs Terbayar (Grouped Bar)
  const chartCompareData = useMemo(() => {
    return [...proyek]
      .sort((a, b) => parseNum(b["Nilai SPK"]) - parseNum(a["Nilai SPK"]))
      .slice(0, 8)
      .map(p => {
        const title = p["Nama SPK"] || "N/A";
        return {
          name: title.length > 15 ? title.substring(0, 12) + "..." : title,
          fullName: title,
          "Nilai Invoice": parseNum(p["Nilai Invoice"]),
          "Nilai Terbayar": parseNum(p["Nilai Terbayar"])
        };
      });
  }, [proyek]);

  // Recent 7 transactions
  const recentTransactions = useMemo(() => {
    return [...pembayaran]
      .map(p => {
        let date: Date | null = null;
        if (p["Tanggal Pembayaran"]) {
          date = p["Tanggal Pembayaran"].seconds 
            ? new Date(p["Tanggal Pembayaran"].seconds * 1000) 
            : new Date(p["Tanggal Pembayaran"]);
        }
        return { ...p, _date: date };
      })
      .filter(p => p._date !== null && !isNaN(p._date.getTime()))
      .sort((a, b) => b._date!.getTime() - a._date!.getTime())
      .slice(0, 7);
  }, [pembayaran]);

  return (
    <div className="space-y-4 lg:pb-12 animate-fade">
      
      {/* KPI Section 1 - Operations Count in Bootstrap Card deck style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1 - Primary Border Left */}
        <div className="bg-white dark:bg-slate-800 border-l-[4px] border-l-[#0d6efd] border border-y-slate-200 border-r-slate-200 dark:border-y-slate-700 dark:border-r-slate-700 p-4 rounded shadow-sm hover:shadow transition-all">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-[#0d6efd] uppercase">TOTAL PROYEK</span>
              <h4 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
                <AnimatedCounter value={kpis.totalProj} />
              </h4>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-[#0d6efd]">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">Proyek terdaftar dalam sistem monitoring</p>
        </div>

        {/* KPI 2 - Success Border Left */}
        <div className="bg-white dark:bg-slate-800 border-l-[4px] border-l-[#198754] border border-y-slate-200 border-r-slate-200 dark:border-y-slate-700 dark:border-r-slate-700 p-4 rounded shadow-sm hover:shadow transition-all">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-[#198754] uppercase">PROYEK SELESAI</span>
              <h4 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
                <AnimatedCounter value={kpis.lunas} />
              </h4>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded text-[#198754]">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">
            <AnimatedCounter value={kpis.lunasPct} formatter={v => v.toFixed(1) + "%"} /> Rasio penyelesaian selesai
          </p>
        </div>

        {/* KPI 3 - Warning Border Left */}
        <div className="bg-white dark:bg-slate-800 border-l-[4px] border-l-[#ffc107] border border-y-slate-200 border-r-slate-200 dark:border-y-slate-700 dark:border-r-slate-700 p-4 rounded shadow-sm hover:shadow transition-all">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-amber-500 uppercase">PROYEK BERJALAN</span>
              <h4 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
                <AnimatedCounter value={kpis.berjalan} />
              </h4>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">
            <AnimatedCounter value={kpis.berjalanPct} formatter={v => v.toFixed(1) + "%"} /> Aktif dalam pembangunan fisik
          </p>
        </div>

        {/* KPI 4 - Info Border Left */}
        <div className="bg-white dark:bg-slate-800 border-l-[4px] border-l-[#0dcaf0] border border-y-slate-200 border-r-slate-200 dark:border-y-slate-700 dark:border-r-slate-700 p-4 rounded shadow-sm hover:shadow transition-all">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-cyan-600 dark:text-cyan-400 uppercase">PROYEK INVOICE</span>
              <h4 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
                <AnimatedCounter value={kpis.invCount} />
              </h4>
            </div>
            <div className="p-2 bg-cyan-55/10 rounded text-cyan-500">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">Proses penagihan &amp; kelengkapan administrasi</p>
        </div>
      </div>

      {/* KPI Section 2 - Financial Stats with Grey Background / Flat Border Header typical of Bootstrap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 5 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded shadow-sm">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Nilai SPK</span>
              <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-none">
                <AnimatedCounter value={kpis.spkSum} formatter={formatRp} />
              </h4>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-750 rounded text-slate-600 dark:text-slate-350">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">{proyek.length} Dokumen kontrak resmi</p>
        </div>

        {/* KPI 6 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded shadow-sm">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Terbayar</span>
              <h4 className="text-lg font-bold text-[#198754] leading-none">
                <AnimatedCounter value={kpis.terbayarSum} formatter={formatRp} />
              </h4>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded text-[#198754]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">
            <AnimatedCounter value={kpis.terbayarPct} formatter={v => v.toFixed(1) + "%"} /> Realisasi terbayar
          </p>
        </div>

        {/* KPI 7 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded shadow-sm">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Tagihan</span>
              <h4 className="text-lg font-bold text-[#0d6efd] leading-none">
                <AnimatedCounter value={kpis.tagihanSum} formatter={formatRp} />
              </h4>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-[#0d6efd]">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">{tagihan.length} Invoice diterbitkan</p>
        </div>

        {/* KPI 8 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded shadow-sm">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Pembayaran</span>
              <h4 className="text-lg font-bold text-amber-500 leading-none">
                <AnimatedCounter value={kpis.pembayaranSum} formatter={formatRp} />
              </h4>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-amber-500">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5">{pembayaran.length} Bukti transfer tersimpan</p>
        </div>
      </div>

      {/* Visual Charts Layout - Bento Box Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Horizontal Bar Chart (Nilai SPK) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-blue-500" />
              <span>Nilai SPK per Proyek (Top 10)</span>
            </h3>
            <button 
              onClick={() => onSelectView("semua-proyek", "Semua Proyek", false)} 
              className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1 rounded border border-blue-200 dark:border-slate-650 cursor-pointer transition-all"
            >
              <span>Lihat Semua</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-72 w-full mt-auto">
            {chartSPKData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                Belum ada data proyek
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSPKData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" tickFormatter={(v) => formatRp(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomChartTooltip formatter={formatFullRp} />} cursor={{ fill: "rgba(13, 110, 253, 0.05)" }} />
                  <Bar dataKey="Nilai SPK" fill="#0d6efd" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {chartSPKData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={["#0d6efd", "#247bfd", "#3b88fd", "#5295fe", "#6aa2fe", "#247bfd", "#0d6efd", "#495057", "#6c757d", "#adb5bd"][index % 10]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Doughnut status allocation key */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <CheckCircle className="w-4 h-4 text-[#198754]" />
            <span>Alokasi Status Proyek</span>
          </h3>
          <div className="h-72 w-full relative flex items-center justify-center">
            {chartStatusData.length === 0 ? (
              <p className="text-slate-400 text-xs font-medium">Belum ada data status</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={105}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color === "#10b981" ? "#198754" : entry.color === "#6366f1" ? "#0d6efd" : entry.color === "#f59e0b" ? "#ffc107" : entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: any) => `${v} Proyek`} />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none">
                    {kpis.totalProj}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Total</span>
                </div>
              </>
            )}
          </div>
          {/* Custom Legends in Bootstrap style */}
          <div className="flex flex-wrap gap-2 justify-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            {chartStatusData.map((item, idx) => {
              const bootstrapColorHex = item.color === "#10b981" ? "#198754" : item.color === "#6366f1" ? "#0d6efd" : item.color === "#f59e0b" ? "#ffc107" : item.color;
              return (
                <div key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-750">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bootstrapColorHex }} />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{item.name}</span>
                  <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-400">({item.value})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Line Chart (Monthly trend) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Trend Pembayaran Bulanan (12 Bulan Terakhir)</span>
          </h3>
          <div className="h-64 w-full mt-auto">
            {chartTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                Belum ada data pembayaran
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#198754" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#198754" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatRp(v)} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip formatter={formatFullRp} />} />
                  <Area type="monotone" dataKey="Pembayaran" stroke="#198754" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTrend)" dot={{ r: 4, strokeWidth: 1.5, stroke: "#198754", fill: "#fff" }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Grouped Bar Chart (Invoice vs Terbayar) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Scale className="w-4 h-4 text-blue-500" />
            <span>Invoice vs Terbayar per Proyek</span>
          </h3>
          <div className="h-64 w-full mt-auto">
            {chartCompareData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                Belum ada data perbandingan
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartCompareData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatRp(v)} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip formatter={formatFullRp} />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 650, color: "#495057", pt: 10 }} />
                  <Bar dataKey="Nilai Invoice" fill="#0d6efd" radius={[3, 3, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="Nilai Terbayar" fill="#198754" radius={[3, 3, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Recent Payments Section in Bootstrap style Card */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
            <span>Daftar Transaksi Pembayaran Terbaru</span>
          </h3>
          <button 
            onClick={() => onSelectView("daftar-pembayaran", "Daftar Pembayaran", true)}
            className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1 rounded border border-blue-200 dark:border-slate-650 cursor-pointer transition-all"
          >
            <span>Selengkapnya</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-semibold">
            Belum ada transaksi pembayaran
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Perusahaan / SPK</th>
                  <th className="py-3 px-4 text-right">Nilai Pembayaran</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {recentTransactions.map((tx, idx) => {
                  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
                  const dateStr = tx._date 
                    ? `${String(tx._date.getDate()).padStart(2, "0")} ${months[tx._date.getMonth()]} ${tx._date.getFullYear()}`
                    : "-";
                  const status = String(tx["Status"] || "").trim().toUpperCase();
                  const isOk = status === "OK" || status === "LUNAS" || status === "SELESAI";

                  return (
                    <tr key={idx} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white max-w-xs truncate">
                        {tx["Nama SPK"] || tx["Nama Perusahaan"] || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatFullRp(parseNum(tx["Nilai Pembayaran"]))}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isOk 
                            ? "bg-emerald-55 dark:bg-emerald-900/20 text-emerald-600" 
                            : "bg-amber-55 dark:bg-amber-900/20 text-amber-600"
                        }`}>
                          {tx["Status"] || "-"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {tx["Keterangan"] || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
