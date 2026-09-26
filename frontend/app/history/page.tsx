"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Research = {
  id: string;
  topic: string;
  report: string;
  feedback: string | null;
  created_at: string;
};

export default function HistoryPage() {
  const supabase = createClient();

  const [researches, setResearches] = useState<Research[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to view your research history.");
        setLoading(false);
        return;
      }

      const { data, error: historyError } = await supabase
        .from("researches")
        .select("id, topic, report, feedback, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (historyError) {
        setError(historyError.message);
        setLoading(false);
        return;
      }

      setResearches(data || []);
      setLoading(false);
    };

    loadHistory();
  }, [supabase]);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">

      {/* Navbar */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white font-bold text-black">
              R
            </div>

            <span className="text-lg font-semibold tracking-tight">
              ResearchMind
            </span>
          </Link>

          <Link
            href="/"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            New Research →
          </Link>

        </div>
      </nav>

      {/* Content */}
      <section className="mx-auto max-w-5xl px-6 py-16">

        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Your Research
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Research History
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            View the research reports you have generated with ResearchMind.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-500">
            Loading your research...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && researches.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">

            <h2 className="text-lg font-medium">
              No research yet
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Run your first research to see it appear here.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Start Research →
            </Link>

          </div>
        )}

        {/* Research list */}
        {!loading && !error && researches.length > 0 && (
          <div className="space-y-4">

            {researches.map((research) => (
              <Link
                key={research.id}
                href={`/history/${research.id}`}
                className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]"
              >

                <div className="flex items-start justify-between gap-6">

                  <div className="min-w-0">

                    <h2 className="text-lg font-medium text-white transition group-hover:text-zinc-200">
                      {research.topic}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      {research.report
                        .replace(/[#*_`]/g, "")
                        .slice(0, 180)}
                      {research.report.length > 180 && "..."}
                    </p>

                    <p className="mt-4 text-xs text-zinc-600">
                      {new Date(
                        research.created_at
                      ).toLocaleString()}
                    </p>

                  </div>

                  <span className="shrink-0 text-sm text-zinc-600 transition group-hover:text-white">
                    →
                  </span>

                </div>

              </Link>
            ))}

          </div>
        )}

      </section>
    </main>
  );
}