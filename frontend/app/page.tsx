"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";

type AgentStatus = "waiting" | "running" | "completed";

type Agent = {
  key: string;
  number: string;
  title: string;
  description: string;
};

const agents: Agent[] = [
  {
    key: "search",
    number: "01",
    title: "Search Agent",
    description: "Finds recent and reliable information from the web.",
  },
  {
    key: "reader",
    number: "02",
    title: "Reader Agent",
    description: "Reads and extracts useful information from sources.",
  },
  {
    key: "writer",
    number: "03",
    title: "Writer Agent",
    description: "Turns the collected research into a structured report.",
  },
  {
    key: "critic",
    number: "04",
    title: "Critic Agent",
    description: "Reviews the report and identifies weaknesses.",
  },
];

export default function Home() {
  const supabase = createClient();

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({
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

      setUserEmail(user?.email ?? null);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
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
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      return;
    }

    setUserEmail(null);
  };

  const updateAgentStatus = (
    stage: string,
    status: AgentStatus
  ) => {
    setStatuses((current) => ({
      ...current,
      [stage]: status,
    }));
  };

  const runResearch = async () => {
    if (!topic.trim() || loading) return;

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
        "http://127.0.0.1:8000/research/stream",
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

      if (!response.ok || !response.body) {
        throw new Error(
          "Could not connect to the research server."
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, {
          stream: true,
        });

        const events = buffer.split("\n\n");

        buffer = events.pop() || "";

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;

          const data = JSON.parse(event.slice(6));

          if (data.type === "status") {
            updateAgentStatus(
              data.stage,
              data.status
            );
          }

          if (data.type === "result") {
  const finalReport = data.data.report || "";
  const feedback = data.data.feedback || "";

  setReport(finalReport);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to save research.");
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
            throw new Error(data.message);
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

  return (
    <main className="min-h-screen bg-[#09090b] text-white">

      {/* Navbar */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white font-bold text-black">
              R
            </div>

            <span className="text-lg font-semibold tracking-tight">
              ResearchMind
            </span>
          </div>

          <div className="flex items-center gap-8 text-sm text-zinc-400">

            <button
              className="transition hover:text-white"
            >
              New Research
            </button>

            <button
              className="transition hover:text-white"
            >
              History
            </button>

            {userEmail ? (
              <div className="flex items-center gap-3">

                <span className="max-w-[220px] truncate text-sm text-zinc-400">
                  {userEmail}
                </span>

                <button
                  onClick={signOut}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  Logout
                </button>

              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
              >
                Continue with Google
              </button>
            )}

          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-24 text-center">

        <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400">
          AI-Powered Research System
        </div>

        <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
          Research deeper.
          <br />
          <span className="text-zinc-500">
            Understand faster.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-400">
          Give ResearchMind a topic and let multiple AI agents
          search, analyze, write and critique a detailed research
          report.
        </p>

        {/* Research Input */}
        <div className="mx-auto mt-12 max-w-3xl">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-2xl">

            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What would you like to research?"
              rows={4}
              disabled={loading}
              className="w-full resize-none bg-transparent px-4 py-3 text-base text-white outline-none placeholder:text-zinc-600"
            />

            <div className="flex items-center justify-between border-t border-white/10 pt-3">

              <span className="px-4 text-xs text-zinc-600">
                {loading
                  ? "Research agents are working..."
                  : "Powered by a multi-agent research pipeline"}
              </span>

              <button
                onClick={runResearch}
                disabled={!topic.trim() || loading}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading
                  ? "Researching..."
                  : "Run Research →"}
              </button>

            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

      </section>

      {/* Pipeline */}
      <section className="mx-auto max-w-5xl px-6 pb-16">

        <div className="mb-6">

          <h2 className="text-lg font-semibold">
            Research Pipeline
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Your research passes through multiple specialized agents.
          </p>

        </div>

        <div className="grid gap-4 md:grid-cols-4">

          {agents.map((agent) => (
            <AgentCard
              key={agent.key}
              agent={agent}
              status={statuses[agent.key]}
            />
          ))}

        </div>
      </section>

      {/* Report */}
      {report && (
        <section className="mx-auto max-w-5xl px-6 pb-24">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">

            <div className="mb-8">

              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Research Complete
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Research Report
              </h2>

            </div>

            <article className="text-sm leading-7 text-zinc-300">

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

                  li: ({ children }) => (
                    <li className="pl-1">
                      {children}
                    </li>
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
                      className="text-zinc-100 underline underline-offset-4 hover:text-white"
                    >
                      {children}
                    </a>
                  ),

                  blockquote: ({ children }) => (
                    <blockquote className="mb-5 border-l-2 border-white/20 pl-4 italic text-zinc-400">
                      {children}
                    </blockquote>
                  ),

                  code: ({ children }) => (
                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-zinc-200">
                      {children}
                    </code>
                  ),
                }}
              >
                {report}
              </ReactMarkdown>

            </article>
          </div>
        </section>
      )}

    </main>
  );
}

function AgentCard({
  agent,
  status,
}: {
  agent: Agent;
  status: AgentStatus;
}) {
  const statusText = {
    waiting: "Waiting",
    running: "Running",
    completed: "Done",
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        status === "running"
          ? "border-white/30 bg-white/[0.06]"
          : status === "completed"
            ? "border-emerald-500/30 bg-emerald-500/[0.03]"
            : "border-white/10 bg-white/[0.02]"
      }`}
    >

      <div className="mb-8 flex items-center justify-between">

        <span className="text-xs text-zinc-600">
          {agent.number}
        </span>

        <div className="flex items-center gap-2">

          <span
            className={`text-[10px] uppercase tracking-wider ${
              status === "running"
                ? "text-white"
                : status === "completed"
                  ? "text-emerald-400"
                  : "text-zinc-600"
            }`}
          >
            {statusText[status]}
          </span>

          <div
            className={`h-2 w-2 rounded-full ${
              status === "running"
                ? "animate-pulse bg-white"
                : status === "completed"
                  ? "bg-emerald-400"
                  : "bg-zinc-700"
            }`}
          />

        </div>
      </div>

      <h3 className="font-medium">
        {agent.title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {agent.description}
      </p>

    </div>
  );
}