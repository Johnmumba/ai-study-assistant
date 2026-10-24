
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type SubjectPerformance = {
  subject: string;
  average_percentage: number;
  attempts: number;
};

type RecentAttempt = {
  id: number;
  quiz_id: number;
  subject: string;
  topic: string;
  score: number;
  total_questions: number;
  percentage: number;
  created_at: string;
};

type LearningProgress = {
  total_attempts: number;
  total_questions_answered: number;
  average_percentage: number;
  best_percentage: number;
  recent_attempts: RecentAttempt[];
  subject_performance: SubjectPerformance[];
};

export default function ProgressPage() {
  const router = useRouter();

  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProgress() {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          router.replace("/login");
          return;
        }

        const response = await fetch(`${API_URL}/api/progress`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Could not load learning progress.");
        }

        const data: LearningProgress = await response.json();
        setProgress(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading progress."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-bold">Your learning progress</h1>
          <p className="mt-2 text-slate-600">
            Track your quiz results and see how you are improving.
          </p>
        </header>

        {loading && (
          <p className="mt-8 text-slate-600">Loading your progress...</p>
        )}

        {error && (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {progress && !loading && !error && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Quiz attempts"
                value={String(progress.total_attempts)}
              />
              <StatCard
                label="Questions answered"
                value={String(progress.total_questions_answered)}
              />
              <StatCard
                label="Average score"
                value={`${progress.average_percentage.toFixed(1)}%`}
              />
              <StatCard
                label="Best score"
                value={`${progress.best_percentage.toFixed(1)}%`}
              />
            </section>

            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold">Performance by subject</h2>

              {progress.subject_performance.length === 0 ? (
                <p className="mt-4 text-slate-600">
                  Complete a quiz to see your subject performance here.
                </p>
              ) : (
                <div className="mt-5 space-y-5">
                  {progress.subject_performance.map((item) => (
                    <div key={item.subject}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-semibold">{item.subject}</span>
                        <span className="text-slate-600">
                          {item.average_percentage.toFixed(1)}% average ·{" "}
                          {item.attempts} attempt(s)
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, item.average_percentage)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold">Recent quiz attempts</h2>

              {progress.recent_attempts.length === 0 ? (
                <p className="mt-4 text-slate-600">
                  Your quiz attempts will appear here after you submit a quiz.
                </p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {progress.recent_attempts.map((attempt) => (
                    <div key={attempt.id} className="py-4">
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {attempt.subject} — {attempt.topic}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {new Date(attempt.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold">
                            {attempt.percentage.toFixed(1)}%
                          </p>
                          <p className="text-sm text-slate-500">
                            {attempt.score}/{attempt.total_questions} correct
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-8">
              <Link
                href="/history"
                className="font-semibold text-blue-600 hover:underline"
              >
                View full quiz history →
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
