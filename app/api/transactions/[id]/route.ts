import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CATEGORIES } from '@/lib/ai';

// PATCH /api/transactions/[id]
// Body: { description?, amount?, category?, type? }
// Dipakai untuk koreksi manual kalau hasil parsing AI kurang tepat.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (typeof body.description === 'string') data.description = body.description;
    if (typeof body.amount === 'number') data.amount = body.amount;
    if (typeof body.category === 'string' && CATEGORIES.includes(body.category)) {
      data.category = body.category;
    }
    if (body.type === 'income' || body.type === 'expense') data.type = body.type;

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ transaction });
  } catch (err) {
    console.error('Error updating transaction:', err);
    return NextResponse.json({ error: 'Gagal memperbarui transaksi.' }, { status: 500 });
  }
}

// DELETE /api/transactions/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.transaction.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    return NextResponse.json({ error: 'Gagal menghapus transaksi.' }, { status: 500 });
  }
}
