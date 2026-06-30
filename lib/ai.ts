import { GoogleGenerativeAI } from '@google/generative-ai';

// Pakai Gemini API (gratis untuk model Flash, tanpa kartu kredit)
// Dapatkan API key gratis di: https://aistudio.google.com/app/apikey
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// gemini-2.5-flash: cepat, gratis, cukup kuat untuk parsing & query sederhana
const MODEL_NAME = 'gemini-2.5-flash';

// Daftar kategori FIXED — dipakai AI Parser supaya hasil klasifikasi konsisten
// dan bisa diagregasi/divisualisasikan dengan rapi di dashboard.
export const CATEGORIES = [
  'Makanan',
  'Transport',
  'Belanja',
  'Hiburan',
  'Tagihan',
  'Kesehatan',
  'Pendapatan',
  'Lainnya',
] as const;

export type Category = (typeof CATEGORIES)[number];

// ============================================================
// TIPE DATA
// ============================================================

export interface ParsedTransaction {
  description: string;
  amount: number; // dalam Rupiah, angka bulat (contoh: 25000)
  category: Category;
  type: 'expense' | 'income';
}

export interface QueryAnswer {
  answer: string;
}

export interface InsightResult {
  insightText: string;
}

// Helper kecil: bersihkan response Gemini dari markdown code block (```json ... ```)
function cleanJsonResponse(text: string): string {
  return text.replace(/```json|```/g, '').trim();
}

// ============================================================
// FUNGSI 1: TRANSACTION PARSER
// Mengubah teks bebas ("beli kopi 25rb") jadi data terstruktur.
// ============================================================

const PARSER_SYSTEM_PROMPT = `Kamu adalah parser transaksi keuangan. Tugasmu mengubah teks bebas berbahasa Indonesia tentang transaksi keuangan menjadi data terstruktur.

ATURAN PARSING NOMINAL:
- "25rb" / "25ribu" / "25k" = 25000
- "1jt" / "1 juta" = 1000000
- "350rb" = 350000
- Kalau ada angka tanpa satuan jelas dan konteksnya masuk akal sebagai rupiah penuh, pakai apa adanya.

ATURAN KATEGORI (pilih SALAH SATU dari daftar ini, tidak boleh di luar daftar):
${CATEGORIES.join(', ')}

ATURAN TIPE:
- "type": "income" kalau ini pendapatan/uang masuk (gaji, dapat THR, jual barang, dll)
- "type": "expense" kalau ini pengeluaran/uang keluar (selain di atas)

ATURAN DESCRIPTION:
- Ringkas jadi 1-4 kata, judul kasus normal (bukan semua huruf besar/kecil)
- Contoh: "beli kopi di starbucks 35rb" -> description: "Kopi Starbucks"

Balas HANYA dalam format JSON berikut, tanpa teks lain, tanpa markdown code block:
{"description": "...", "amount": number, "category": "...", "type": "expense|income"}`;

export async function parseTransaction(rawText: string): Promise<ParsedTransaction> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: PARSER_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(rawText);
  const rawResponse = result.response.text();

  try {
    const cleaned = cleanJsonResponse(rawResponse);
    const parsed = JSON.parse(cleaned);

    // Validasi kategori — fallback ke "Lainnya" kalau AI keluarkan sesuatu
    // di luar daftar fixed (jaga konsistensi data untuk dashboard).
    const category: Category = CATEGORIES.includes(parsed.category) ? parsed.category : 'Lainnya';

    return {
      description: parsed.description ?? rawText,
      amount: typeof parsed.amount === 'number' ? parsed.amount : 0,
      category,
      type: parsed.type === 'income' ? 'income' : 'expense',
    };
  } catch (err) {
    console.error('Gagal parsing transaction response:', rawResponse, err);
    return { description: rawText, amount: 0, category: 'Lainnya', type: 'expense' };
  }
}

// ============================================================
// FUNGSI 2: QUERY ASSISTANT
// Menjawab pertanyaan natural language berdasarkan data transaksi yang
// sudah tersimpan. Semua angka sudah dihitung di kode (lihat route handler),
// AI hanya merangkai jawabannya jadi kalimat natural.
// ============================================================

const QUERY_SYSTEM_PROMPT = `Kamu adalah asisten keuangan pribadi. Kamu akan diberi data ringkasan transaksi user dan pertanyaan dari user.

ATURAN PENTING:
- HANYA gunakan angka yang ada di data yang diberikan. JANGAN mengarang atau menghitung ulang dengan asumsi sendiri.
- Jawab dengan ringkas, ramah, dan langsung ke poin (maksimal 3-4 kalimat).
- Gunakan format Rupiah yang mudah dibaca, contoh: "Rp150.000" bukan "150000".
- Kalau data tidak cukup untuk menjawab pertanyaan, katakan dengan jujur bahwa datanya belum ada/cukup.
- Boleh kasih 1 komentar ringan/saran praktis di akhir kalau relevan, tapi jangan menghakimi kebiasaan belanja user.`;

export async function answerQuery(question: string, dataSummary: string): Promise<QueryAnswer> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: QUERY_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(`Data transaksi:\n${dataSummary}\n\nPertanyaan user: ${question}`);
  const answer = result.response.text() || 'Maaf, tidak bisa menjawab saat ini.';

  return { answer };
}

// ============================================================
// FUNGSI 3 (OPSIONAL): INSIGHT GENERATOR
// ============================================================

const INSIGHT_SYSTEM_PROMPT = `Kamu adalah asisten keuangan yang membuat insight singkat dari ringkasan pengeluaran.

ATURAN PENTING:
- HANYA gunakan angka dari data yang diberikan, jangan mengarang.
- Fokus ke pola: kategori paling boros, tren dibanding biasanya kalau datanya ada, satu saran praktis.
- Nada suportif, bukan menghakimi.
- Maksimal 3-4 kalimat.

Balas dalam bentuk teks naratif biasa (bukan JSON), dalam Bahasa Indonesia.`;

export async function generateInsight(dataSummary: string): Promise<InsightResult> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: INSIGHT_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(`Ringkasan pengeluaran:\n${dataSummary}`);
  const insightText = result.response.text() || 'Insight tidak tersedia.';

  return { insightText };
}
