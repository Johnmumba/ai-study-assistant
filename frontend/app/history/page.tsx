
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QuizAttempt = {
  id: number;
  quiz_id: number;
  subject: string;
  topic: string;
  score: number;
  total_questions: number;
  percentage: number;
  created_at: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function HistoryPage() {
  const router = useRouter();

  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/quiz-attempts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail || "Could not load quiz history."
          );
        }

        setAttempts(data as QuizAttempt[]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading history."
        );
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <a
          href="/"
          className="font-semibold text-indigo-700 hover:text-indigo-900"
        >
          ← Back to dashboard
        </a>

        <header className="mb-8 mt-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Your learning journey
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Quiz History
          </h1>
          <p className="mt-3 text-slate-600">
            Review your previous attempts and track your results.
          </p>
        </header>

        {loading && (
          <p className="rounded-xl bg-white p-6 text-slate-600">
            Loading your quiz history...
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {!loading && !error && attempts.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-bold">No attempts yet</h2>
            <p className="mt-2 text-slate-600">
              Generate a quiz and submit your answers. Your results will
              appear here.
            </p>
            <a
              href="/quiz"
              className="mt-5 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Start a quiz
            </a>
          </div>
        )}

        {!loading && !error && attempts.length > 0 && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Total attempts</p>
                <p className="mt-2 text-3xl font-bold">
                  {attempts.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Average score</p>
                <p className="mt-2 text-3xl font-bold">
                  {(
                    attempts.reduce(
                      (sum, attempt) => sum + attempt.percentage,
                      0
                    ) / attempts.length
                  ).toFixed(1)}
                  %
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">
                  Questions answered
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {attempts.reduce(
                    (sum, attempt) => sum + attempt.total_questions,
                    0
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {attempts.map((attempt) => (
                <article
                  key={attempt.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm text-slate-500">
                        Attempt #{attempt.id}
                      </p>
                      <h2 className="mt-1 text-xl font-bold">
                        Quiz #{attempt.quiz_id}
                      </h2>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">
                          {attempt.subject}
                        </span>
                        {" — "}
                        <span>{attempt.topic}</span>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-2xl font-bold text-indigo-700">
                        {attempt.percentage.toFixed(1)}%
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {attempt.score} / {attempt.total_questions} correct
                      </p>
                      <p className="text-sm text-gray-500">
                        Attempt date:{" "}
                        {new Date(attempt.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, attempt.percentage)
                        )}%`,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <a
          href="/quiz"
          className="mt-8 inline-block font-semibold text-indigo-700 hover:text-indigo-900"
        >
          + Generate another quiz
        </a>
      </div>
    </main>
  );
}
