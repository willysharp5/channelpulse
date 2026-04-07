"use client";

import { useEffect, useRef, useState } from "react";

const TESTIMONIALS = [
  {
    quote: "ChannelPulse replaced three spreadsheets and two dashboards. Having Shopify, Amazon, and TikTok Shop revenue in one view with real profit numbers saved us hours every week. Setup took literally 2 minutes.",
    name: "Emma Chen",
    role: "Founder, Pinewood Commerce",
    initial: "E",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  {
    quote: "I never really knew if my Etsy store was profitable after fees. ChannelPulse shows me exactly what I keep after marketplace fees and shipping on every order. It changed how I price everything.",
    name: "Marcus Webb",
    role: "Seller, Handmade by Webb",
    initial: "M",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  {
    quote: "We run Shopify and Amazon at the same time and I could never tell which channel was actually making money. ChannelPulse makes it obvious one dashboard, both channels, real numbers. I wish I had this two years ago.",
    name: "Priya Nair",
    role: "Co-founder, Nair & Co. Goods",
    initial: "P",
    color: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  },
  {
    quote: "I had two years of order history sitting in spreadsheets that I never looked at. I uploaded them into ChannelPulse and within minutes everything was right there next to my live sales. I finally feel like I actually know my business.",
    name: "Jake Torres",
    role: "Owner, Torres Outdoor Supply",
    initial: "J",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  {
    quote: "As someone who sells on TikTok Shop and Amazon, keeping track of fees was a nightmare. Now I see my net profit by channel every morning before I even open my laptop. It's the first thing I check.",
    name: "Sofia Andersson",
    role: "Full-time Seller, Stockholm",
    initial: "S",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  },
];

const INTERVAL_MS = 8000;

export function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % TESTIMONIALS.length);
    }, INTERVAL_MS);
  }

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimer();
  }

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function goTo(i: number) {
    setCurrent(i);
    resetTimer();
  }

  const t = TESTIMONIALS[current];

  return (
    <section className="relative z-10 overflow-hidden border-y border-gray-200/60 bg-white/50 py-24 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/30">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/[0.06] blur-3xl" />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <div className="overflow-hidden">
          <blockquote
            key={current}
            className="animate-fade-in rounded-3xl border border-gray-200 bg-white p-10 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-14"
            style={{ animation: "fadeSlide 0.4s ease forwards" }}
          >
            <p className="text-lg font-medium leading-relaxed text-gray-700 dark:text-gray-300 sm:text-xl">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${t.color}`}>
                {t.initial}
              </div>
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.role}</p>
              </div>
            </div>
          </blockquote>
        </div>

        {/* Dots */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 bg-amber-500"
                  : "w-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-500"
              }`}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
