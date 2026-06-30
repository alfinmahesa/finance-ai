'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'Berapa pengeluaran bulan ini?',
  'Kategori apa yang paling boros?',
  'Bagaimana minggu ini dibanding biasanya?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Tanyakan apa saja soal keuanganmu — misalnya, berapa yang sudah kamu habiskan untuk makan bulan ini.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/transactions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer ?? data.error ?? 'Terjadi kendala saat menjawab.' },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Tidak bisa terhubung ke server.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-ink-800 text-paper">
        <div className="max-w-xl mx-auto px-6 pt-10 pb-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-gold/80 mb-1">Tanya Jawab</p>
              <h1 className="font-display text-3xl italic">Buku</h1>
            </div>
            <nav className="flex gap-5 text-sm text-paper/60 pt-1.5">
              <Link href="/" className="hover:text-gold transition-colors">
                Catat
              </Link>
              <Link href="/dashboard" className="hover:text-gold transition-colors">
                Ringkasan
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto px-6 w-full -mt-6 pb-8 flex flex-col">
        <div className="bg-paper border border-ink-100 shadow-[0_8px_30px_-12px_rgba(28,35,48,0.25)] flex-1 flex flex-col min-h-[60vh]">
          <div className="flex-1 overflow-y-auto px-7 py-7 space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'pl-10' : ''}>
                <p className="text-[10px] tracking-[0.2em] uppercase text-ink-400 mb-1.5">
                  {m.role === 'user' ? 'Kamu' : 'Buku'}
                </p>
                <p
                  className={`text-[15px] leading-relaxed ${
                    m.role === 'assistant' ? 'font-display text-ink-800' : 'text-ink-600'
                  }`}
                >
                  {m.content}
                </p>
              </div>
            ))}
            {loading && (
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-ink-400 mb-1.5">Buku</p>
                <p className="text-[15px] text-ink-400 italic font-display">menghitung…</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length === 1 && (
            <div className="flex flex-col gap-2 px-7 pb-5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm text-ink-600 border border-ink-100 px-4 py-2.5 hover:border-gold hover:bg-gold-50/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="border-t-2 border-ink-800 px-7 py-4 flex items-end gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaanmu…"
              className="flex-1 bg-transparent text-[15px] py-1 focus:outline-none placeholder:text-ink-400/60"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="text-sm text-ink-800 disabled:opacity-30 hover:text-gold transition-colors pb-1 font-medium"
            >
              Kirim →
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
