'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: string;
  createdAt: string;
}

const COLORS = ['#c9a227', '#7a9b8e', '#a85454', '#9aa3b0', '#0f4c3a', '#8b2e2e', '#5b6577', '#b8923f'];

function formatRupiah(amount: number) {
  return amount.toLocaleString('id-ID');
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    fetch('/api/transactions')
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data.transactions ?? []);
        setLoading(false);
      });
  }, []);

  async function handleGenerateInsight() {
    setInsightLoading(true);
    try {
      const res = await fetch('/api/transactions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Berikan insight singkat soal pola pengeluaran saya bulan ini.' }),
      });
      const data = await res.json();
      setInsight(data.answer);
    } finally {
      setInsightLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-800">
        <p className="text-paper/50 font-display italic">memuat…</p>
      </div>
    );
  }

  const expenses = transactions.filter((t) => t.type === 'expense');
  const income = transactions.filter((t) => t.type === 'income');

  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const categoryData = Object.entries(
    expenses.reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header gelap - saldo bersih jadi signature element utama */}
      <header className="bg-ink-800 text-paper">
        <div className="max-w-xl mx-auto px-6 pt-10 pb-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-gold/80 mb-1">Ringkasan</p>
              <h1 className="font-display text-3xl italic">Buku</h1>
            </div>
            <nav className="flex gap-5 text-sm text-paper/60 pt-1.5">
              <Link href="/" className="hover:text-gold transition-colors">
                Catat
              </Link>
              <Link href="/chat" className="hover:text-gold transition-colors">
                Tanya
              </Link>
            </nav>
          </div>

          <p className="text-[10px] tracking-[0.2em] uppercase text-paper/40 mb-2">Saldo Bersih</p>
          <p className={`font-display text-5xl tabular ${balance >= 0 ? 'text-gold' : 'text-brick'}`}>
            Rp{formatRupiah(Math.abs(balance))}
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto px-6 w-full -mt-6 pb-20">
        {/* Card neraca pemasukan/pengeluaran - mengambang */}
        <div className="grid grid-cols-2 bg-paper border border-ink-100 shadow-[0_8px_30px_-12px_rgba(28,35,48,0.25)] mb-10">
          <div className="px-6 py-5 border-r border-ink-100">
            <p className="text-[10px] tracking-[0.2em] uppercase text-ink-400 mb-2">Pemasukan</p>
            <p className="font-display text-2xl text-forest tabular">Rp{formatRupiah(totalIncome)}</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-[10px] tracking-[0.2em] uppercase text-ink-400 mb-2">Pengeluaran</p>
            <p className="font-display text-2xl text-brick tabular">Rp{formatRupiah(totalExpense)}</p>
          </div>
        </div>

        {/* Per kategori */}
        <section className="bg-white border border-ink-100 px-7 py-7 mb-8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-ink-400 mb-5">Pengeluaran per Kategori</p>

          {categoryData.length > 0 ? (
            <div className="grid grid-cols-[auto,1fr] gap-8 items-center">
              <ResponsiveContainer width={170} height={170}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={80}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => 'Rp' + formatRupiah(value)}
                    contentStyle={{ fontFamily: 'var(--font-inter)', fontSize: 13, border: '1px solid #e3e6ea' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <ul className="space-y-2.5">
                {categoryData.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5 text-ink-600">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      {c.name}
                    </span>
                    <span className="tabular text-ink-800 font-medium">Rp{formatRupiah(c.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-ink-400 italic font-display">Belum ada pengeluaran tercatat.</p>
          )}
        </section>

        {categoryData.length > 0 && (
          <section className="bg-white border border-ink-100 px-7 py-7 mb-8">
            <p className="text-[10px] tracking-[0.2em] uppercase text-ink-400 mb-5">Perbandingan</p>
            <ResponsiveContainer width="100%" height={Math.max(160, categoryData.length * 38)}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  fontSize={12}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#5b6577' }}
                />
                <Tooltip
                  formatter={(value: number) => 'Rp' + formatRupiah(value)}
                  contentStyle={{ fontFamily: 'var(--font-inter)', fontSize: 13, border: '1px solid #e3e6ea' }}
                />
                <Bar dataKey="value" fill="#1c2330" radius={[0, 2, 2, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Insight AI - dibedakan dengan aksen gold tebal */}
        <section className="bg-ink-800 text-paper px-7 py-7 mb-8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-gold/70 mb-3">Catatan dari Buku</p>
          {insight ? (
            <p className="font-display text-[18px] leading-relaxed italic">{insight}</p>
          ) : (
            <button
              onClick={handleGenerateInsight}
              disabled={insightLoading || transactions.length === 0}
              className="text-sm text-paper border border-paper/30 px-4 py-2 disabled:opacity-30 hover:border-gold hover:text-gold transition-colors"
            >
              {insightLoading ? 'Menyusun catatan…' : 'Minta catatan singkat →'}
            </button>
          )}
        </section>

        {/* Riwayat */}
        <section className="bg-white border border-ink-100 px-7 py-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-ink-400 pt-5 pb-2">Riwayat</p>
          <div>
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-baseline py-4 border-t border-ink-100"
              >
                <div>
                  <p className="text-sm text-ink-800">{t.description}</p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {t.category} ·{' '}
                    {new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <p className={`font-display text-base tabular ${t.type === 'income' ? 'text-forest' : 'text-brick'}`}>
                  {t.type === 'income' ? '+' : '−'}
                  {formatRupiah(t.amount)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
