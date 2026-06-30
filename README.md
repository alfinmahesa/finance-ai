# Finance AI Assistant

Asisten keuangan pribadi: catat transaksi dengan bahasa natural, tanya-jawab analisis pengeluaran lewat chat, dan lihat ringkasan visual di dashboard.

## Arsitektur

```
[Halaman Catat] --teks bebas--> [1] Transaction Parser (AI)
                                       |
                                       v
                                 Data terstruktur tersimpan di DB
                                       |
        +------------------------------+------------------------------+
        |                                                             |
        v                                                             v
[Halaman Chat] --pertanyaan--> hitung agregat di KODE --> [2] Query   [Dashboard]
                                (bukan di prompt AI)        Assistant   grafik dari
                                       |                    (AI)        data mentah
                                       v
                                jawaban natural language
```

Tiga fungsi LLM (lihat `lib/ai.ts`):
1. **Transaction Parser** — ubah teks bebas ("beli kopi 25rb") jadi data terstruktur (deskripsi, jumlah, kategori, tipe)
2. **Query Assistant** — jawab pertanyaan user dalam bahasa natural
3. **Insight Generator** — analisis pola pengeluaran, dipanggil dari dashboard

## Keputusan Desain yang Penting Dijelaskan di Laporan/Presentasi

### 1. AI tidak pernah menghitung angka sendiri
Lihat `app/api/transactions/chat/route.ts` — semua agregasi (total per kategori, per bulan, per minggu) dihitung dengan kode TypeScript biasa **sebelum** dikirim ke AI. AI hanya menerima angka yang sudah benar dan bertugas merangkainya jadi kalimat natural.

**Kenapa ini penting:** LLM tidak reliable untuk aritmatika pada data yang panjang/kompleks. Kalau AI diminta "hitung total dari daftar 50 transaksi ini", ada risiko salah hitung (halusinasi numerik). Dengan memisahkan "penghitungan" (kode, deterministik, selalu benar) dari "perangkaian kalimat" (AI, fleksibel), aplikasi ini dapat manfaat AI (bahasa natural) tanpa mengorbankan akurasi angka.

Ini juga jadi poin diskusi yang bagus di presentasi: AI yang baik bukan AI yang "melakukan semuanya", tapi AI yang dipakai tepat di bagian yang memang butuh fleksibilitas bahasa, sementara logika yang butuh presisi tetap pakai kode biasa.

### 2. Hasil parsing AI selalu bisa dikoreksi manual
Lihat tombol "Koreksi" di `components/TransactionForm.tsx`. AI parsing nominal dari teks bebas bisa salah (misal salah baca "25rb" jadi 2500 atau 250000). Karena ini app finansial, akurasi data penting — jadi user selalu punya kesempatan mengoreksi sebelum data difinalisasi.

### 3. Kategori fixed, bukan bebas
Daftar kategori (`CATEGORIES` di `lib/ai.ts`) dibatasi 8 pilihan, bukan AI bebas membuat kategori baru setiap kali. Ini supaya data konsisten dan bisa diagregasi dengan rapi untuk grafik dashboard — kalau AI bebas membuat kategori (`"kopi"`, `"ngafe"`, `"minuman"` untuk hal yang sama), dashboard jadi tidak berguna.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Siapkan environment variables
```bash
cp .env.example .env
```
Isi `GEMINI_API_KEY` di file `.env`. Dapatkan API key **gratis** (tanpa kartu kredit) di [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — klik "Create API Key", lalu copy ke file `.env`.

Project ini pakai model `gemini-2.5-flash`, gratis dengan limit harian yang jauh lebih dari cukup untuk testing dan demo (ribuan request/hari).

**PENTING — Keamanan API Key:** jangan pernah membagikan API key lewat chat, pesan, atau commit ke Git. File `.env` sudah ada di `.gitignore`. Kalau key pernah tidak sengaja terekspos, langsung revoke/hapus di Google AI Studio dan buat key baru.

### 3. Setup database
```bash
npx prisma generate
npx prisma db push
```

### 4. Jalankan
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000)

## Struktur Folder

```
app/
  page.tsx                          -> halaman catat transaksi (/)
  chat/page.tsx                     -> halaman chat tanya-jawab (/chat)
  dashboard/page.tsx                -> halaman dashboard grafik (/dashboard)
  api/transactions/route.ts         -> POST (catat baru) & GET (riwayat)
  api/transactions/[id]/route.ts    -> PATCH (koreksi) & DELETE
  api/transactions/chat/route.ts    -> POST (tanya-jawab, hitung agregat di kode)
components/
  TransactionForm.tsx               -> form catat + koreksi manual
  ChatPage.tsx                      -> UI chat
lib/
  ai.ts                             -> 3 fungsi LLM (Parser, Query, Insight) + daftar kategori
  prisma.ts                         -> Prisma client singleton
prisma/
  schema.prisma                     -> schema database (1 tabel: Transaction)
```

## Untuk Demo / Presentasi

Skenario yang baik untuk ditunjukkan:

1. **Catat beberapa transaksi santai** lewat halaman utama — coba variasi format: "beli kopi 25rb", "makan siang di warteg 15ribu", "gajian bulan ini 5jt", "bayar listrik 350rb" — tunjukkan AI bisa parsing format penulisan yang berbeda-beda.
2. **Tunjukkan fitur koreksi** — sengaja masukkan transaksi yang ambigu (misal nominal tanpa satuan jelas) untuk menunjukkan AI bisa salah, dan sistem punya cara menanganinya (bukan blindly percaya AI).
3. **Pindah ke halaman chat**, tanya: "berapa pengeluaran saya bulan ini?", "kategori apa yang paling boros?" — tunjukkan AI menjawab dengan angka yang akurat.
4. **Dashboard** — tunjukkan grafik otomatis terbentuk dari data yang sudah dicatat, lalu generate insight.

Poin diskusi untuk sesi tanya-jawab:
- Kenapa agregasi dihitung di kode, bukan diserahkan ke AI (lihat penjelasan desain di atas) — ini sering jadi pertanyaan bagus dari dosen soal "trust" pada output AI.
- Limitasi: parsing nominal dari teks bebas Bahasa Indonesia (slang, singkatan daerah) tidak akan 100% akurat — itu sebabnya ada fitur koreksi manual.
- Potential future work: dukung multi-currency, OCR struk belanja, kategori custom oleh user.

## Catatan Privasi

Data keuangan adalah informasi sensitif. Untuk keperluan demo/kelas ini disimpan lokal di SQLite tanpa enkripsi — kalau dikembangkan ke produk nyata, enkripsi at-rest dan autentikasi user jadi prioritas berikutnya (saat ini app belum punya sistem login/multi-user).

**Catatan tambahan soal Gemini API tier gratis:** pada tier gratis, Google dapat menggunakan teks yang dikirim ke API untuk meningkatkan model mereka (berbeda dari tier berbayar). Untuk demo/kelas ini wajar dipakai, tapi ini poin jujur untuk disebut di laporan sebagai limitasi privasi kalau ditanya — terutama karena data finansial cukup sensitif.
