'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: string;
  rawText: string;
  createdAt: string;
}

const CATEGORIES = [
  'Makanan',
  'Transport',
  'Belanja',
  'Hiburan',
  'Tagihan',
  'Kesehatan',
  'Pendapatan',
  'Lainnya',
];

function formatRupiah(amount: number) {
  return amount.toLocaleString('id-ID');
}

export default function TransactionForm() {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Catatan tidak berhasil disimpan.');
        return;
      }

      setLastResult(data.transaction);
      setRawText('');
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError('Tidak bisa terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!lastResult) return;

    try {
      const res = await fetch(`/api/transactions/${lastResult.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: lastResult.description,
          amount: lastResult.amount,
          category: lastResult.category,
          type: lastResult.type,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setLastResult(data.transaction);
        setEditing(false);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header gelap - jadi anchor visual utama, beda dari body yang terang */}
      <header className="bg-ink-800 text-paper">
        <div className="max-w-xl mx-auto px-6 pt-10 pb-8">
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-gold/80 mb-1">Buku Kas Pribadi</p>
              <h1 className="font-display text-3xl italic">Buku</h1>
            </div>
            <nav className="flex gap-5 text-sm text-paper/60 pt-1.5">
              <Link href="/chat" className="hover:text-gold transition-colors">
                Tanya
              </Link>
              <Link href="/dashboard" className="hover:text-gold transition-colors">
                Ringkasan
              </Link>
            </nav>
          </div>
          <p className="text-xs text-paper/40 tracking-wide">{today}</p>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto px-6 w-full -mt-6 pb-20">
        {/* Card input - mengambang di atas header gelap */}
        <div className="bg-paper border border-ink-100 shadow-[0_8px_30px_-12px_rgba(28,35,48,0.25)] px-7 py-7">
          <p className="text-[10px] tracking-[0.2em] uppercase text-ink-400 mb-4">Catat transaksi baru</p>

          <form onSubmit={handleSubmit}>
            <div className="border-b-2 border-ink-800 pb-3 mb-5">
              <input
                type="text"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="beli kopi 25rb, gajian 5jt…"
                className="w-full bg-transparent text-lg font-body text-ink-800 placeholder:text-ink-400/50 focus:outline-none"
                disabled={loading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !rawText.trim()}
              className="w-full py-3.5 bg-ink-800 text-paper font-body text-sm tracking-wide disabled:opacity-30 hover:bg-gold hover:text-ink-900 transition-colors"
            >
              {loading ? 'Mencatat…' : 'Catat'}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-brick border-l-2 border-brick pl-3">{error}</p>
          )}
        </div>

        {lastResult && (
          <div className="mt-8">
            <div className="flex justify-between items-baseline mb-3 px-1">
              <p className="text-[10px] tracking-[0.2em] uppercase text-ink-400">Baru tercatat</p>
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs text-ink-400 hover:text-gold transition-colors underline underline-offset-2"
              >
                {editing ? 'Batalkan' : 'Perbaiki'}
              </button>
            </div>

            {!editing ? (
              <div className="bg-white border border-ink-100 px-7 py-6 relative overflow-hidden">
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    lastResult.type === 'income' ? 'bg-forest' : 'bg-brick'
                  }`}
                />
                <div className="flex justify-between items-start pl-3">
                  <div>
                    <p className="font-display text-xl text-ink-800 mb-2">{lastResult.description}</p>
                    <span className="text-[11px] tracking-wide uppercase text-ink-400 border border-ink-100 px-2 py-0.5">
                      {lastResult.category}
                    </span>
                  </div>
                  <p
                    className={`font-display text-3xl tabular ${
                      lastResult.type === 'income' ? 'text-forest' : 'text-brick'
                    }`}
                  >
                    {lastResult.type === 'income' ? '+' : '−'}
                    {formatRupiah(lastResult.amount)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-ink-100 px-7 py-6 space-y-3.5">
                <input
                  type="text"
                  value={lastResult.description}
                  onChange={(e) => setLastResult({ ...lastResult, description: e.target.value })}
                  className="w-full border-b border-ink-100 bg-transparent py-1.5 text-sm focus:outline-none focus:border-gold"
                  placeholder="Deskripsi"
                />
                <input
                  type="number"
                  value={lastResult.amount}
                  onChange={(e) => setLastResult({ ...lastResult, amount: Number(e.target.value) })}
                  className="w-full border-b border-ink-100 bg-transparent py-1.5 text-sm tabular focus:outline-none focus:border-gold"
                  placeholder="Jumlah"
                />
                <select
                  value={lastResult.category}
                  onChange={(e) => setLastResult({ ...lastResult, category: e.target.value })}
                  className="w-full border-b border-ink-100 bg-transparent py-1.5 text-sm focus:outline-none focus:border-gold"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={lastResult.type}
                  onChange={(e) => setLastResult({ ...lastResult, type: e.target.value })}
                  className="w-full border-b border-ink-100 bg-transparent py-1.5 text-sm focus:outline-none focus:border-gold"
                >
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                </select>
                <button
                  onClick={handleSaveEdit}
                  className="w-full py-2.5 bg-ink-800 text-paper text-sm mt-2 hover:bg-gold hover:text-ink-900 transition-colors"
                >
                  Simpan perbaikan
                </button>
              </div>
            )}
          </div>
        )}

        {!lastResult && (
          <p className="text-center text-sm text-ink-400 italic font-display mt-10">
            Belum ada catatan hari ini — mulai dengan mengetik di atas.
          </p>
        )}
      </main>

      <footer className="border-t border-ink-100 py-5 bg-paper-dim/40">
        <p className="max-w-xl mx-auto px-6 text-xs text-ink-400">
          Pembacaan otomatis dapat meleset — periksa sebelum dianggap final.
        </p>
      </footer>
    </div>
  );
}
