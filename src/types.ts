export interface UserSession {
  "Nama Pengguna": string;
  Password?: string | number;
  "Nama Lengkap"?: string;
  Role?: "Super Admin" | "Admin" | "Guest";
  "Nomor Telepon"?: string;
  Email?: string;
  "URL Dokumen"?: string;
}

export interface MenuItem {
  id: string;
  title: string;
  type: "table" | "map" | "overview";
  path: string;
}

export interface MenuSection {
  title: string;
  icon: string;
  id: string;
  items?: MenuItem[];
  subsections?: {
    title: string;
    items: MenuItem[];
    id: string;
  }[];
}

export interface FilterState {
  search: string;
  tahun: string;
  perusahaan: string;
  namaSPK: string;
  statusProyek: string;
  tipe: string;
  zona: string;
  tahunPO: string;
  supplier: string;
  materialName: string;
  statusMaterial: string;
  entries: string;
  tahunInvoice: string;
  bulanInvoice: string;
  tahunPembayaran: string;
  bulanPembayaran: string;
  statusInvoice: string;
  statusPembayaran: string;
  jabatan: string;
  areaKerja: string;
  tahunSJ: string;
  daop: string;
  bulan: string;
  namaPM: string;
  lokasiKerja: string;
  project: string;
  hadir: string;
}

export interface SortState {
  column: string;
  direction: "asc" | "desc";
}
