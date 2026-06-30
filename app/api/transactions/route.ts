import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseTransaction } from '@/lib/ai';

// POST /api/transactions
// Body: { rawText: string }
// Flow: terima teks bebas -> parse via AI -> simpan ke DB -> kembalikan hasil parsing
export async function POST(req: NextRequest) {
  try {
    const { rawText } = await req.json();

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return NextResponse.json({ error: 'Teks transaksi tidak boleh kosong.' }, { status: 400 });
    }

    const parsed = await parseTransaction(rawText);

    const transaction = await prisma.transaction.create({
      data: {
        rawText,
        description: parsed.description,
        amount: parsed.amount,
        category: parsed.category,
        type: parsed.type,
      },
    });

    return NextResponse.json({ transaction });
  } catch (err) {
    console.error('Error processing transaction:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memproses transaksi.' }, { status: 500 });
  }
}

// GET /api/transactions
// Mengambil semua transaksi, urut dari terbaru
export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ transactions });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return NextResponse.json({ error: 'Gagal mengambil data transaksi.' }, { status: 500 });
  }
}
