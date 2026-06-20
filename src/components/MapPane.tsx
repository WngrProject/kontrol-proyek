import React from "react";
import { MapPin, Globe, Loader2, AlertTriangle, Settings } from "lucide-react";

interface MapPaneProps {
  data: any[];
  loading: boolean;
  isAdmin: boolean;
  onEditMapUrl: (id: string, currentUrl: string) => void;
}

export default function MapPane({ data, loading, isAdmin, onEditMapUrl }: MapPaneProps) {
  
  const getMapData = () => {
    if (!data || data.length === 0) return null;
    
    const doc = data[0];
    const docId = doc.id || "";
    
    // Search fields for a URL
    let url = "";
    if (typeof doc === "string") {
      url = doc;
    } else {
      url = doc.url || doc.link || doc.URL || doc["URL Maps"] || doc["Link Maps"] || "";
      if (!url) {
        // Fallback: look for any field containing http
        const values = Object.values(doc);
        const mapUrl = values.find(v => typeof v === "string" && v.startsWith("http"));
        if (mapUrl) url = mapUrl as string;
      }
    }
    
    return { id: docId, url };
  };

  const mapData = getMapData();

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded h-[calc(100vh-12rem)] shadow-sm">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase">Memuat Peta...</p>
      </div>
    );
  }

  if (!mapData || !mapData.url) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded h-[calc(100vh-12rem)] shadow-sm text-center space-y-3">
        <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Koordinat Peta Belum Tersedia</h4>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
            URL Peta tidak ditemukan di database. Pastikan terdapat dokumen berisi URL Peta Google Maps.
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => onEditMapUrl("", "")}
            className="btn-bs-primary px-3 py-1.5 hover:bg-blue-700 text-white font-bold text-xs rounded cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span>Set URL Peta Baru</span>
          </button>
        )}
      </div>
    );
  }

  // Check if it's a valid link
  const isValidUrl = mapData.url.startsWith("http");

  if (!isValidUrl) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded h-[calc(100vh-12rem)] shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-amber-500">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Format URL Tidak Valid</h4>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Link peta yang ditemukan di database adalah: <span className="font-mono text-red-500">{mapData.url}</span>
          </p>
        </div>
      </div>
    );
  }

  // Standardize Google Maps embed link if user entered a standard maps link
  let embedUrl = mapData.url;
  if (embedUrl.includes("google.com/maps") && !embedUrl.includes("embed") && !embedUrl.includes("staticmap")) {
    // If it's a direct Google Maps URL, we might want to guide them to use embed URL or render an iframe anyway
    // For many google maps URLs, directly loading them in iframe is blocked unless they are embed links.
    // Try to convert standard search coordinates to embed link or just load.
  }

  return (
    <div className="flex-grow bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded h-[calc(100vh-12rem)] overflow-hidden relative shadow-sm">
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-4 z-10 px-3 py-2 rounded bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center gap-2">
        <Globe className="w-4 h-4 text-blue-400" />
        <span className="text-[11px] font-bold text-slate-200 tracking-wide uppercase">Satelit &amp; Routing Live</span>
        {isAdmin && (
          <button
            onClick={() => onEditMapUrl(mapData.id, mapData.url)}
            className="ml-3 p-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Update URL</span>
          </button>
        )}
      </div>

      <iframe 
        src={embedUrl} 
        width="100%" 
        height="100%" 
        className="w-full h-full border-0"
        allowFullScreen={true}
        loading="lazy" 
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
