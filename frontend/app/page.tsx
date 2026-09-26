"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";

type AgentStatus = "waiting" | "running" | "completed";

export default function Home() {
  const supabase = createClient();

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const reportRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (report && !loading) {
      setTimeout(() => {
        reportRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    }
  }, [report, loading]);

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
    setFeedback("");

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
              const finalFeedback = data.data.feedback || "";

              setReport(finalReport);
              setFeedback(finalFeedback);

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
                  feedback: finalFeedback,
                });

              if (saveError) {
                throw new Error(
                  `Research completed, but could not be saved: ${saveError.message}`
                );
              }
            }

            if (data.type === "error") {
              throw new Error(
                data.message || "Research failed."
              );
            }
          } catch (eventError) {
            if (
              eventError instanceof Error &&
              eventError.message !==
                "Unexpected end of JSON input"
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
    <main className="min-h-screen overflow-x-hidden bg-[#09090b] text-white">
      {/* Navbar */}
      <nav className="border-b border-zinc-800/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight sm:text-xl"
          >
            ResearchMind
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-7">
            {userName ? (
              <>
                <Link
                  href="/history"
                  className="text-sm text-zinc-300 transition hover:text-white"
                >
                  History
                </Link>

                <span className="max-w-[120px] truncate text-sm text-zinc-300 sm:max-w-none">
                  {userName}
                </span>

                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium transition hover:border-zinc-500 hover:bg-zinc-800 sm:px-4"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 sm:px-4"
              >
                Continue with Google
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-10 pt-14 text-center sm:px-6 sm:pb-12 sm:pt-20">
        <div className="mb-5 inline-flex rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-400 sm:px-4 sm:text-sm">
          AI-powered research assistant
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Research deeper.
          <br />
          <span className="text-zinc-400">
            Understand faster.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-zinc-400 sm:mt-6 sm:text-base sm:leading-7">
          ResearchMind searches the web, reads relevant sources,
          writes a structured report, and reviews the result for you.
        </p>
      </section>

      {/* Research Input */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl shadow-black/20 sm:p-5">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to research?"
            rows={5}
            disabled={loading}
            className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-zinc-600 sm:text-base sm:leading-7"
          />

          <div className="mt-4 flex flex-col gap-4 border-t border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <p className="text-xs text-zinc-600">
              ResearchMind will use multiple AI agents.
            </p>

            <button
              onClick={runResearch}
              disabled={loading}
              className="w-full rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {loading ? "Researching..." : "Run Research"}
            </button>
          </div>
        </div>
      </section>

      {/* Agent Status */}
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {agents.map((agent) => {
            const status = statuses[agent.key];

            return (
              <div
                key={agent.key}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5"
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
        <section className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-4 text-sm text-red-300 sm:px-5">
            {error}
          </div>
        </section>
      )}

      {/* Research Report */}
      {report && (
        <section
          ref={reportRef}
          className="mx-auto max-w-4xl scroll-mt-4 px-4 pb-8 sm:scroll-mt-6 sm:px-6 sm:pb-10"
        >
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
            <div className="mb-7 border-b border-zinc-800 pb-5 sm:mb-8 sm:pb-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
                Research Report
              </p>

              <h2 className="mt-3 break-words text-xl font-semibold leading-tight text-white sm:text-2xl">
                {topic}
              </h2>
            </div>

            <article className="max-w-none overflow-hidden">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-5 mt-2 break-words text-2xl font-bold leading-tight text-white sm:mb-6 sm:text-3xl">
                      {children}
                    </h1>
                  ),

                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-8 break-words text-xl font-semibold leading-tight text-white sm:mb-4 sm:mt-10 sm:text-2xl">
                      {children}
                    </h2>
                  ),

                  h3: ({ children }) => (
                    <h3 className="mb-3 mt-7 break-words text-lg font-semibold leading-tight text-zinc-100 sm:mt-8 sm:text-xl">
                      {children}
                    </h3>
                  ),

                  p: ({ children }) => (
                    <p className="mb-5 break-words text-sm leading-7 text-zinc-300 sm:text-[15px] sm:leading-8">
                      {children}
                    </p>
                  ),

                  strong: ({ children }) => (
                    <strong className="font-semibold text-white">
                      {children}
                    </strong>
                  ),

                  em: ({ children }) => (
                    <em className="text-zinc-200">
                      {children}
                    </em>
                  ),

                  ul: ({ children }) => (
                    <ul className="mb-6 ml-5 list-disc space-y-2 text-sm leading-7 text-zinc-300 sm:ml-6 sm:text-[15px]">
                      {children}
                    </ul>
                  ),

                  ol: ({ children }) => (
                    <ol className="mb-6 ml-5 list-decimal space-y-2 text-sm leading-7 text-zinc-300 sm:ml-6 sm:text-[15px]">
                      {children}
                    </ol>
                  ),

                  li: ({ children }) => (
                    <li className="pl-1 break-words">
                      {children}
                    </li>
                  ),

                  blockquote: ({ children }) => (
                    <blockquote className="my-6 border-l-2 border-zinc-600 pl-4 text-zinc-400 sm:pl-5">
                      {children}
                    </blockquote>
                  ),

                  code: ({ children }) => (
                    <code className="break-all rounded-md bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-200 sm:text-sm">
                      {children}
                    </code>
                  ),

                  hr: () => (
                    <hr className="my-7 border-zinc-800 sm:my-8" />
                  ),

                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="break-words text-zinc-100 underline underline-offset-4 hover:text-white"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {report}
              </ReactMarkdown>
            </article>
          </div>
        </section>
      )}

      {/* Critic Review */}
      {feedback && (
        <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 sm:pb-20">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7">
            <div className="mb-7 border-b border-zinc-800 pb-5 sm:mb-8 sm:pb-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
                Critic Review
              </p>

              <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
                Review of the Research
              </h2>
            </div>

            <article className="max-w-none overflow-hidden">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-5 mt-2 break-words text-2xl font-bold text-white sm:mb-6 sm:text-3xl">
                      {children}
                    </h1>
                  ),

                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-7 break-words text-xl font-semibold text-white sm:mb-4 sm:mt-8 sm:text-2xl">
                      {children}
                    </h2>
                  ),

                  h3: ({ children }) => (
                    <h3 className="mb-3 mt-6 break-words text-lg font-semibold text-zinc-100 sm:mt-7 sm:text-xl">
                      {children}
                    </h3>
                  ),

                  p: ({ children }) => (
                    <p className="mb-5 break-words text-sm leading-7 text-zinc-300 sm:text-[15px] sm:leading-8">
                      {children}
                    </p>
                  ),

                  strong: ({ children }) => (
                    <strong className="font-semibold text-white">
                      {children}
                    </strong>
                  ),

                  ul: ({ children }) => (
                    <ul className="mb-6 ml-5 list-disc space-y-2 text-sm leading-7 text-zinc-300 sm:ml-6 sm:text-[15px]">
                      {children}
                    </ul>
                  ),

                  ol: ({ children }) => (
                    <ol className="mb-6 ml-5 list-decimal space-y-2 text-sm leading-7 text-zinc-300 sm:ml-6 sm:text-[15px]">
                      {children}
                    </ol>
                  ),

                  li: ({ children }) => (
                    <li className="break-words pl-1">
                      {children}
                    </li>
                  ),

                  blockquote: ({ children }) => (
                    <blockquote className="my-6 border-l-2 border-zinc-600 pl-4 text-zinc-400 sm:pl-5">
                      {children}
                    </blockquote>
                  ),

                  hr: () => (
                    <hr className="my-7 border-zinc-800 sm:my-8" />
                  ),
                }}
              >
                {feedback}
              </ReactMarkdown>
            </article>
          </div>
        </section>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm sm:px-6">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111113] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white sm:text-xl">
                  Log out?
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Are you sure you want to log out of ResearchMind?
                </p>
              </div>

              <button
                onClick={() => setShowLogoutModal(false)}
                className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white sm:w-auto"
              >
                Cancel
              </button>

              <button
                onClick={signOut}
                className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 sm:w-auto"
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