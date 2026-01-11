# Sistem Log Transaksi Terdistribusi (Sister Server)

Program ini adalah simulasi sistem terdistribusi sederhana menggunakan **Node.js** dan **Supabase**.
Fitur utama:
- Replikasi data (melalui Supabase Realtime).
- Log waktu kirim (Sent At) dan waktu terima (Received At).
- Konsistensi data (semua node melihat data yang sama).

## Persiapan

1.  **Instalasi Node.js**: Pastikan Node.js sudah terinstall.
2.  **Setup Supabase**:
    - Buat project baru di [Supabase](https://supabase.com/).
    - Buka SQL Editor di dashboard Supabase.
    - Copy isi file `setup.sql` dan jalankan.
    - Pergi ke Project Settings -> API, copy `URL` dan `anon` Key.
3.  **Konfigurasi Environment**:
    - Buka file `.env`.
    - Isi `SUPABASE_URL` dan `SUPABASE_KEY` dengan data dari langkah 2.

## Cara Menjalankan

1.  Install dependencies (jika belum):
    ```bash
    npm install
    ```
2.  Jalankan server:
    ```bash
    npm start
    ```
3.  Buka browser dan akses:
    - Node A: `http://localhost:3000/?user=Node_A`
    - Node B: `http://localhost:3000/?user=Node_B`

Coba kirim pesan dari Node A, dan lihat log di Node B. Waktu terima akan tercatat otomatis.
