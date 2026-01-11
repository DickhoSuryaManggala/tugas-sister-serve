# Sistem Informasi Harga Terdistribusi (Eventual Consistency)

Proyek ini adalah implementasi tugas **Sistem Terdistribusi** yang mendemonstrasikan konsep **Strong Consistency** dan **Eventual Consistency** menggunakan arsitektur cloud.

## 📋 Ringkasan Proyek
Aplikasi ini mensimulasikan sistem distribusi harga (Price Monitor) dimana:
1.  **Server A (Jakarta)**: Mengupdate harga (Strong Consistency).
2.  **Server B (Bandung) & C (Surabaya)**: Menerima update secara bertahap (Eventual Consistency).

### Teknologi yang Digunakan
*   **Backend**: Node.js (Express)
*   **Database**: Supabase (PostgreSQL + Realtime)
*   **Frontend**: HTML/JS Native (Simulasi Client)
*   **Hosting**: Vercel

---

## 🏛️ Arsitektur Sistem

### 1. Topologi
Sistem mensimulasikan 3 node terpisah yang saling berkomunikasi:
| Node / Server | Peran | Fungsi |
| :--- | :--- | :--- |
| **Server Jakarta** | Master Node | Sumber data utama (Write) |
| **Server Bandung** | Replica Node | Menerima replikasi data (Read) |
| **Server Surabaya** | Replica Node | Menerima replikasi data (Read) |

### 2. Pola Konsistensi (Consistency Models)

#### a. Strong Consistency (Update Langsung)
*   **Kasus**: Harga Emas / Saham.
*   **Perilaku**: Saat data diinput, data langsung dikirim ke database pusat dan dipublish ke semua node secara realtime.
*   **Hasil**: Semua user melihat data yang sama di detik yang sama.

#### b. Eventual Consistency (Update Bertahap)
*   **Kasus**: Ongkos Kirim / Katalog Barang.
*   **Perilaku**: Data disimpan di buffer lokal node terlebih dahulu. Setelah interval waktu tertentu (misal: 30 detik), service replikasi mengirim data ke node lain.
*   **Hasil**: Data mungkin berbeda sementara antar server, tapi **pasti sama** pada akhirnya.

---

## 🔄 Alur Kerja Sistem (Workflow)

### 1. Skenario Input Data (Strong)
1.  User input harga "Emas Antam" di Server Jakarta.
2.  Sistem memilih mode **Immediate Update**.
3.  Data masuk ke tabel `item_prices` di Supabase.
4.  Supabase memicu event `INSERT`.
5.  Server Bandung & Surabaya menerima notifikasi realtime.
6.  UI di semua server terupdate instan.

### 2. Skenario Input Data (Eventual)
1.  User input "Ongkir JNE" di Server Jakarta.
2.  Sistem memilih mode **Eventual Update**.
3.  Data masuk ke array lokal `pendingData[]`.
4.  User di Jakarta melihat data, user di Bandung **belum melihat**.
5.  **Background Service** (Interval 30s) berjalan.
6.  Service mengambil data dari buffer dan mengirim ke Supabase.
7.  Server Bandung & Surabaya baru menerima data.

---

## 🗄️ Desain Database

### Tabel `item_prices`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `item_name` | VARCHAR | Nama Barang |
| `price` | NUMERIC | Harga Barang |
| `source_node` | VARCHAR | Asal Server (Jakarta/Bandung/dll) |
| `consistency_type`| VARCHAR | 'strong' atau 'eventual' |
| `created_at` | TIMESTAMP | Waktu pembuatan |

---

## 🚀 Cara Menjalankan (Deployment)

Aplikasi ini sudah dideploy di cloud (Vercel) dan bisa diakses via browser.

1.  **Akses Link Utama**: `https://tugas-sister-serve.vercel.app/`
2.  **Simulasi Node Berbeda**:
    *   **Node A**: `/?user=Server_Jakarta`
    *   **Node B**: `/?user=Server_Bandung`
    *   **Node C**: `/?user=Server_Surabaya`

---

## 🧪 Skenario Pengujian (Demo Dosen)

| Langkah | Aksi User | Ekspektasi Hasil | Analisa |
| :--- | :--- | :--- | :--- |
| **1** | Buka 3 Browser (Jakarta, Bandung, Surabaya) | Semua node aktif | Sistem Terdistribusi Siap |
| **2** | Input "Emas" di Jakarta (Mode: Strong) | Muncul di Bandung & Surabaya **DETIK ITU JUGA** | Membuktikan Strong Consistency |
| **3** | Input "Ongkir" di Bandung (Mode: Eventual) | **TIDAK MUNCUL** di Jakarta & Surabaya | Membuktikan Data Belum Konsisten (Local Write) |
| **4** | Tunggu 30 Detik (Lihat Timer) | Data "Ongkir" tiba-tiba muncul di semua node | Membuktikan Eventual Consistency |

---

## 📝 Kesimpulan
Sistem ini berhasil membuktikan bahwa **Eventual Consistency** memberikan performa input yang cepat (karena tidak menunggu semua server sync), namun memiliki konsekuensi data tidak langsung seragam. Sebaliknya, **Strong Consistency** menjamin kesamaan data tapi membutuhkan koneksi stabil ke pusat.

---
*Tugas Sistem Terdistribusi - [Nama Kelompok]*
