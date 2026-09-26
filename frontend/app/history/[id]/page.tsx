"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";

type Research = {
  id: string;
  topic: string;
  report: string;
  feedback: string | null;
  created_at: string;
};

export default function ResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = createClient();

  const [research, setResearch] = useState<Research | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResearch = async () => {
      const { id } = await params;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to view this research.");
        setLoading(false);
        return;
      }

      const { data, error: researchError } = await supabase
        .from("researches")
        .select("id, topic, report, feedback, created_at")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (researchError) {
        setError("Research not found.");
        setLoading(false);
        return;
      }

      setResearch(data);
      setLoading(false);
    };

    loadResearch();
  }, [supabase, params]);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">

      {/* Navbar */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white font-bold text-black">
              R
            </div>

            <span className="text-lg font-semibold">
              ResearchMind
            </span>
          </Link>

          <Link
            href="/history"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            ← History
          </Link>

        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-16">

        {loading && (
          <div className="text-sm text-zinc-500">
            Loading research...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && research && (
          <>

            <div className="mb-10">

              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Saved Research
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {research.topic}
              </h1>

              <p className="mt-3 text-sm text-zinc-600">
                {new Date(
                  research.created_at
                ).toLocaleString()}
              </p>

            </div>

            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">

              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-6 mt-8 text-3xl font-semibold text-white">
                      {children}
                    </h1>
                  ),

                  h2: ({ children }) => (
                    <h2 className="mb-4 mt-8 text-2xl font-semibold text-white">
                      {children}
                    </h2>
                  ),

                  h3: ({ children }) => (
                    <h3 className="mb-3 mt-6 text-xl font-semibold text-white">
                      {children}
                    </h3>
                  ),

                  p: ({ children }) => (
                    <p className="mb-5 leading-7 text-zinc-300">
                      {children}
                    </p>
                  ),

                  ul: ({ children }) => (
                    <ul className="mb-5 ml-6 list-disc space-y-2 text-zinc-300">
                      {children}
                    </ul>
                  ),

                  ol: ({ children }) => (
                    <ol className="mb-5 ml-6 list-decimal space-y-2 text-zinc-300">
                      {children}
                    </ol>
                  ),

                  strong: ({ children }) => (
                    <strong className="font-semibold text-white">
                      {children}
                    </strong>
                  ),

                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:text-white"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {research.report}
              </ReactMarkdown>

            </article>

            {research.feedback && (
              <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">

                <p className="text-xs uppercase tracking-widest text-zinc-600">
                  Critic Feedback
                </p>

                <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                  {research.feedback}
                </div>

              </section>
            )}

          </>
        )}

      </section>
    </main>
  );
}