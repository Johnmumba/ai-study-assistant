"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function TutorPage() {
  const router = useRouter();

  const [subject, setSubject] = useState("Mathematics");
  const [grade, setGrade] = useState("8");
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState<
    { role: "user" | "model"; text: string }[]
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) {
          localStorage.removeItem("access_token");
          router.replace("/login");
        }
      })
      .catch(() => setError("Could not connect to the server."));
  }, [router]);

  async function askTutor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const currentQuestion = question.trim();
    if (!currentQuestion) return;

    setLoading(true);
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/tutor/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          grade: Number(grade),
          question: currentQuestion,
          conversation_history: conversation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }
        throw new Error(
          data.detail || "The tutor could not answer your question."
        );
      }

      setConversation((previous) => [
        ...previous,
        { role: "user", text: currentQuestion },
        { role: "model", text: data.answer },
      ]);
      setQuestion("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 pb-[24rem] pt-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-hover"
        >
          <span aria-hidden="true">←</span> Back to Dashboard
        </Link>

        <header className="mb-8 mt-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-sm">
            <span className="h-2 w-2 rounded-full bg-accent-coral" />
            Solar Learning · AI Study Assistant
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Your AI Tutor
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            Ask questions about your school subjects and get clear,
            grade-appropriate explanations to help you understand each topic.
          </p>
        </header>

        <section
          aria-labelledby="tutor-settings-title"
          className="space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
        >
          <div>
            <h2 id="tutor-settings-title" className="text-lg font-bold">
              Personalise your lesson
            </h2>
            <p className="mt-1 text-sm text-muted">
              Choose the subject and grade so your tutor can tailor its answer.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="subject" className="mb-2 block text-sm font-semibold">
                School subject
              </label>
              <input
                id="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={100}
                required
                placeholder="e.g. Mathematics"
                className="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label htmlFor="grade" className="mb-2 block text-sm font-semibold">
                Your grade
              </label>
              <select
                id="grade"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (number) => (
                    <option key={number} value={number}>
                      Grade {number}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        {conversation.length > 0 && (
          <section
            aria-live="polite"
            aria-labelledby="conversation-title"
            className="mt-6 space-y-5 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-coral">
                  Learning session
                </p>
                <h2 id="conversation-title" className="mt-1 text-xl font-extrabold">
                  Tutor conversation
                </h2>
              </div>
              <span className="rounded-full bg-accent-yellow/30 px-3 py-1 text-xs font-bold">
                {conversation.length / 2} {conversation.length === 2 ? "question" : "question pairs"}
              </span>
            </div>

            <div className="space-y-4">
              {conversation.map((message, index) => (
                <div
                  key={index}
                  className={`rounded-2xl border p-4 sm:p-5 ${
                    message.role === "user"
                      ? "ml-3 border-primary/10 bg-primary/5 sm:ml-8"
                      : "mr-3 border-border bg-background sm:mr-8"
                  }`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${
                        message.role === "user"
                          ? "bg-primary text-white"
                          : "bg-accent-yellow text-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {message.role === "user" ? "Y" : "✦"}
                    </span>
                    <p className="text-sm font-bold">
                      {message.role === "user" ? "You" : "AI Tutor"}
                    </p>
                  </div>
                  <div className="whitespace-pre-wrap leading-7">
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setConversation([]);
                setQuestion("");
                setError("");
              }}
              disabled={loading}
              className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-primary/30 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start a new conversation
            </button>
          </section>
        )}
      </div>

      <form
        onSubmit={askTutor}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl space-y-3 border-t border-border bg-surface/95 p-4 shadow-[0_-8px_30px_rgba(32,36,58,0.08)] backdrop-blur sm:rounded-t-2xl sm:border-x sm:p-6"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label htmlFor="question" className="block text-sm font-bold">
              What would you like help with?
            </label>
            <span className="rounded-full bg-accent-yellow/30 px-2.5 py-1 text-xs font-semibold">
              Ask anything
            </span>
          </div>

          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={2000}
            required
            rows={3}
            placeholder="For example: Explain how to solve 2x + 5 = 15."
            className="w-full resize-y rounded-xl border border-border bg-white px-4 py-3 leading-6 outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
          />

          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Tailored to {subject || "your subject"} · Grade {grade}
            </p>
            <p className="shrink-0 text-xs tabular-nums text-muted">
              {question.length}/2000
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !question.trim() || !subject.trim()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-primary-hover focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
                Tutor is thinking...
              </>
            ) : (
              <>Ask AI Tutor <span aria-hidden="true">→</span></>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
