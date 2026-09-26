"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";

type AgentStatus = "waiting" | "running" | "completed";

export default function Home() {
  const supabase = createClient();

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [userName, setUserName] = useState<string | null>(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [statuses, setStatuses] = useState<{
    search: AgentStatus;
    reader: AgentStatus;
    writer: AgentStatus;
    critic: AgentStatus;
  }>({
    search: "waiting",
    reader: "waiting",
    writer: "waiting",
    critic: "waiting",
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserName(
        user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          "User"
      );
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;

      setUserName(
        user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          "User"
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = async () => {
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  const signOut = async () => {
    setError("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      return;
    }

    setUserName(null);
    setShowLogoutModal(false);
  };

  const updateStatus = (
    stage: "search" | "reader" | "writer" | "critic",
    status: AgentStatus
  ) => {
    setStatuses((prev) => ({
      ...prev,
      [stage]: status,
    }));
  };

  const runResearch = async () => {
    if (!topic.trim()) {
      setError("Please enter a research topic.");
      return;
    }

    setLoading(true);
    setError("");
    setReport("");

    setStatuses({
      search: "waiting",
      reader: "waiting",
      writer: "waiting",
      critic: "waiting",
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/research/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: topic.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response stream received from the server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event
            .split("\n")
            .find((line) => line.startsWith("data: "));

          if (!line) continue;

          try {
            const data = JSON.parse(line.replace("data: ", ""));

            if (data.type === "status") {
              updateStatus(data.stage, data.status);
            }

            if (data.type === "result") {
              const finalReport = data.data.report || "";
              const feedback = data.data.feedback || "";

              setReport(finalReport);

              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) {
                throw new Error(
                  "You must be logged in to save research."
                );
              }

              const { error: saveError } = await supabase
                .from("researches")
                .insert({
                  user_id: user.id,
                  topic: topic.trim(),
                  report: finalReport,
                  feedback: feedback,
                });

              if (saveError) {
                throw new Error(
                  `Research completed, but could not be saved: ${saveError.message}`
                );
              }
            }

            if (data.type === "error") {
              throw new Error(data.message || "Research failed.");
            }
          } catch (eventError) {
            if (
              eventError instanceof Error &&
              eventError.message !== "Unexpected end of JSON input"
            ) {
              throw eventError;
            }
          }
        }
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while running the research."
      );
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status: AgentStatus) => {
    if (status === "running") return "Working...";
    if (status === "completed") return "Completed";
    return "Waiting";
  };

  const statusDot = (status: AgentStatus) => {
    if (status === "completed") {
      return "bg-green-400";
    }

    if (status === "running") {
      return "bg-blue-400 animate-pulse";
    }

    return "bg-zinc-600";
  };

  const agents = [
    {
      key: "search" as const,
      name: "Search Agent",
      description: "Finds recent and reliable sources",
      icon: "🔎",
    },
    {
      key: "reader" as const,
      name: "Reader Agent",
      description: "Reads and extracts useful information",
      icon: "📖",
    },
    {
      key: "writer" as const,
      name: "Writer Agent",
      description: "Creates the research report",
      icon: "✍️",
    },
    {
      key: "critic" as const,
      name: "Critic Agent",
      description: "Reviews the generated report",
      icon: "🧠",
    },
  ];

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* Navbar */}
      <nav className="border-b border-zinc-800/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight"
          >
            ResearchMind
          </Link>

          <div className="flex items-center gap-7">
            {userName ? (
              <>
                <Link
                  href="/history"
                  className="text-sm text-zinc-300 transition hover:text-white"
                >
                  History
                </Link>

                <span className="text-sm text-zinc-300">
                  {userName}
                </span>

                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium transition hover:border-zinc-500 hover:bg-zinc-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
              >
                Continue with Google
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-12 pt-20 text-center">
        <div className="mb-5 inline-flex rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-400">
          AI-powered research assistant
        </div>

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Research deeper.
          <br />
          <span className="text-zinc-400">Understand faster.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-400">
          ResearchMind searches the web, reads relevant sources,
          writes a structured report, and reviews the result for you.
        </p>
      </section>

      {/* Research Input */}
      <section className="mx-auto max-w-4xl px-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/20">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to research?"
            rows={5}
            disabled={loading}
            className="w-full resize-none bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
          />

          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-600">
              ResearchMind will use multiple AI agents.
            </p>

            <button
              onClick={runResearch}
              disabled={loading}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Researching..." : "Run Research"}
            </button>
          </div>
        </div>
      </section>

      {/* Agent Status */}
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {agents.map((agent) => {
            const status = statuses[agent.key];

            return (
              <div
                key={agent.key}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xl">{agent.icon}</span>

                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusDot(
                      status
                    )}`}
                  />
                </div>

                <h3 className="mt-4 font-medium">
                  {agent.name}
                </h3>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {agent.description}
                </p>

                <p className="mt-4 text-xs text-zinc-400">
                  {statusLabel(status)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Error */}
      {error && (
        <section className="mx-auto max-w-4xl px-6 pb-8">
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        </section>
      )}

      {/* Report */}
      {report && (
        <section className="mx-auto max-w-4xl px-6 pb-20">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-7">
            <div className="mb-7 border-b border-zinc-800 pb-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Research Report
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {topic}
              </h2>
            </div>

            <article className="prose prose-invert max-w-none prose-headings:font-semibold prose-p:text-zinc-300 prose-p:leading-7 prose-li:text-zinc-300 prose-strong:text-white">
              <ReactMarkdown>{report}</ReactMarkdown>
            </article>
          </div>
        </section>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111113] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Log out?
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Are you sure you want to log out of ResearchMind?
                </p>
              </div>

              <button
                onClick={() => setShowLogoutModal(false)}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={signOut}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}