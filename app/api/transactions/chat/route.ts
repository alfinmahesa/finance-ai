import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { answerQuery } from '@/lib/ai';
import { startOfMonth, startOfWeek, subDays } from 'date-fns';

// POST /api/transactions/chat
// Body: { question: string }
//
// DESAIN PENTING: AI TIDAK diminta menghitung total dari data mentah.
// Semua agregasi (total per kategori, per bulan, dst) dihitung di kode
// TypeScript biasa terlebih dahulu, baru hasil agregat itu yang dikirim
// ke AI sebagai konteks. AI hanya bertugas merangkai angka yang SUDAH
// BENAR itu jadi kalimat natural. Ini mencegah AI "berhalusinasi" angka
// yang salah saat menjawab pertanyaan keuangan.

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Pertanyaan tidak boleh kosong.' }, { status: 400 });
    }

    const allTransactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (allTransactions.length === 0) {
      return NextResponse.json({
        answer: 'Belum ada data transaksi sama sekali. Coba tambahkan beberapa transaksi dulu lewat form di halaman utama.',
      });
    }

    // --- Hitung agregat di kode (bukan di prompt AI) ---
    const now = new Date();
    const monthStart = startOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const last30Days = subDays(now, 30);

    function sumByPeriod(since: Date, type: 'expense' | 'income') {
      return allTransactions
        .filter((t) => t.createdAt >= since && t.type === type)
        .reduce((sum, t) => sum + t.amount, 0);
    }

    function sumByCategory(since: Date) {
      const result: Record<string, number> = {};
      allTransactions
        .filter((t) => t.createdAt >= since && t.type === 'expense')
        .forEach((t) => {
          result[t.category] = (result[t.category] ?? 0) + t.amount;
        });
      return result;
    }

    const categoryThisMonth = sumByCategory(monthStart);
    const categoryLast30Days = sumByCategory(last30Days);

    const dataSummary = `
Total pengeluaran bulan ini: Rp${sumByPeriod(monthStart, 'expense').toLocaleString('id-ID')}
Total pemasukan bulan ini: Rp${sumByPeriod(monthStart, 'income').toLocaleString('id-ID')}
Total pengeluaran minggu ini: Rp${sumByPeriod(weekStart, 'expense').toLocaleString('id-ID')}

Pengeluaran per kategori (bulan ini):
${Object.entries(categoryThisMonth)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, amt]) => `- ${cat}: Rp${amt.toLocaleString('id-ID')}`)
  .join('\n') || '(belum ada data bulan ini)'}

Pengeluaran per kategori (30 hari terakhir):
${Object.entries(categoryLast30Days)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, amt]) => `- ${cat}: Rp${amt.toLocaleString('id-ID')}`)
  .join('\n') || '(belum ada data)'}

Jumlah total transaksi tercatat: ${allTransactions.length}
Transaksi 5 terakhir:
${allTransactions
  .slice(0, 5)
  .map((t) => `- ${t.description}: Rp${t.amount.toLocaleString('id-ID')} (${t.category}, ${t.type})`)
  .join('\n')}
    `.trim();

    const result = await answerQuery(question, dataSummary);

    return NextResponse.json({ answer: result.answer });
  } catch (err) {
    console.error('Error processing chat query:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memproses pertanyaan.' }, { status: 500 });
  }
}
