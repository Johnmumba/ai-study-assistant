
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const features = [
  {
    icon: "✦",
    title: "AI Quiz Generator",
    description: "Create quizzes for any subject or topic.",
  },
  {
    icon: "◉",
    title: "AI Tutor",
    description: "Get explanations when a topic feels difficult.",
  },
  {
  icon: "▤",
  title: "AI Study Materials",
  description: "Generate notes, definitions, worked examples, and revision summaries.",
  },
  {
    icon: "✓",
    title: "Practice & Results",
    description: "Answer questions and review your results.",
  },
];

type Student = {
  id: number;
  email: string;
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


type SavedStudyMaterial = {
  id: number;
  subject: string;
  topic: string;
  grade: number;
  title: string;
  created_at: string;
};


type SubjectPerformance = {
  subject: string;
  average_percentage: number;
  attempts: number;
};

type Progress = {
  total_attempts: number;
  total_questions_answered: number;
  average_percentage: number;
  best_percentage: number;
  recent_attempts: RecentAttempt[];
  subject_performance: SubjectPerformance[];
};

export default function Home() {
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState("");
  const [savedMaterials, setSavedMaterials] = useState<SavedStudyMaterial[]>([]);
  const [savedMaterialsLoading, setSavedMaterialsLoading] = useState(true);
  const [savedMaterialsError, setSavedMaterialsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!isRefresh) {
      setLoading(true);
    }

    setProgressLoading(true);
    setSavedMaterialsLoading(true);
    setProgressError("");
    setSavedMaterialsError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
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
        throw new Error("Could not verify your account.");
      }

      const studentData: Student = await response.json();
      setStudent(studentData);
    } catch {
      if (isRefresh) {
        setProgressError(
          "Could not refresh your dashboard. Check your connection and try again."
        );
      } else {
        setStudent(null);
      }

      setProgressLoading(false);
      setSavedMaterialsLoading(false);
      setLoading(false);
      return;
    }

    setLoading(false);

    try {
      const progressResponse = await fetch(`${API_URL}/api/progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (progressResponse.status === 401) {
        localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }

      if (!progressResponse.ok) {
        throw new Error("Could not load learning statistics.");
      }

      const progressData: Progress = await progressResponse.json();
      setProgress(progressData);
    } catch {
      setProgressError(
        "We couldn't update your learning statistics. Check your internet connection and try refreshing."
      );
    } finally {
      setProgressLoading(false);
    }

    try {
      const materialsResponse = await fetch(`${API_URL}/api/study-materials`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (materialsResponse.status === 401) {
        localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }

      if (!materialsResponse.ok) {
        throw new Error("Could not load saved study materials.");
      }

      const materialsData: SavedStudyMaterial[] =
        await materialsResponse.json();

      setSavedMaterials(materialsData);
    } catch {
      setSavedMaterialsError(
        "Your saved study materials could not be loaded. Please try again."
      );
    } finally {
      setSavedMaterialsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function handleSignOut() {
    localStorage.removeItem("access_token");
    router.replace("/login");
  }

  if (loading || !student) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        {loading ? (
          "Loading your dashboard..."
        ) : (
          <div className="text-center">
            <p>Could not verify your account.</p>
            <button
              onClick={handleSignOut}
              className="mt-4 rounded-lg bg-primary px-5 py-2 font-semibold text-white transition hover:bg-primary-hover"
            >
              Return to Login
            </button>
          </div>
        )}
      </main>
    );
  }

  const studentName = student.email.split("@")[0];

  
  const recentLearningActivity = [
    ...(progress?.recent_attempts ?? []).map((attempt) => ({
      id: `quiz-${attempt.id}`,
      type: "quiz" as const,
      created_at: attempt.created_at,
      title: attempt.subject,
      detail: attempt.topic,
      result: `${attempt.percentage}% · ${attempt.score} / ${attempt.total_questions} correct`,
      href: "/history",
    })),

    ...savedMaterials.map((material) => ({
      id: `material-${material.id}`,
      type: "material" as const,
      created_at: material.created_at,
      title: material.title,
      detail: `${material.subject} · Grade ${material.grade} · ${material.topic}`,
      result: "Study material generated",
      href: `/saved-materials/${material.id}`,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 5);


  const statistics = [
    {
      label: "Quizzes Completed",
      value: progress?.total_attempts ?? "—",
      icon: "✓",
    },
    {
      label: "Questions Answered",
      value: progress?.total_questions_answered ?? "—",
      icon: "▤",
    },
    {
      label: "Average Score",
      value:
        progress !== null
          ? `${progress.average_percentage}%`
          : "—",
      icon: "↗",
    },
    {
      label: "Best Score",
      value:
        progress !== null
          ? `${progress.best_percentage}%`
          : "—",
      icon: "★",
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface p-6 md:block">
          <div className="mb-10">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
              A
            </div>
            <h1 className="text-lg font-bold">
              AI Study Assistant
            </h1>
            <p className="mt-1 text-sm text-muted">
              Learn smarter, every day.
            </p>
          </div>

          <nav className="space-y-2">
            <a
              href="#dashboard"
              className="block rounded-xl bg-primary/10 px-4 py-3 font-semibold text-primary"
            >
              ◫ Dashboard
            </a>
            <a
              href="#features"
              className="block rounded-xl px-4 py-3 text-muted transition hover:bg-primary/10 hover:text-primary"
            >
              ✦ Learning tools
            </a>
            <a
              href="#progress"
              className="block rounded-xl px-4 py-3 text-muted transition hover:bg-primary/10 hover:text-primary"
            >
              ↗ My progress
            </a>
            <Link
              href="/history"
              className="block rounded-xl px-4 py-3 text-muted transition hover:bg-primary/10 hover:text-primary"
            >
              ◷ Quiz history
            </Link>
          </nav>

          <div className="mt-12 rounded-2xl bg-primary p-4 text-white">
            <p className="font-semibold">Keep learning!</p>
            <p className="mt-2 text-sm text-white/85">
              Every question you practise is a step forward.
            </p>
          </div>
        </aside>

        <section
          id="dashboard"
          className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10"
        >
          <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted">
                YOUR LEARNING SPACE
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Welcome, {studentName}!
              </h2>
              <p className="mt-2 text-muted">
                What would you like to learn today?
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {studentName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">
                  {student.email}
                </span>
              </div>

              <button
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    await loadDashboard(true);
                  } finally {
                    setRefreshing(false);
                  }
                }}
                disabled={refreshing}
               className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh Dashboard"}
              </button>

              <button
                onClick={handleSignOut}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-primary/10"
              >
                Sign Out
              </button>

              
            </div>
          </header>
          
          <section className="relative mb-8 overflow-hidden rounded-3xl bg-primary p-6 text-white shadow-lg sm:p-9">
            <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-accent-coral opacity-90 sm:h-56 sm:w-56" />
            <div className="pointer-events-none absolute right-24 top-28 h-16 w-16 rounded-full bg-accent-yellow sm:right-40 sm:top-36 sm:h-20 sm:w-20" />

            <div className="relative z-10">
              <p className="text-sm font-semibold uppercase tracking-wider text-white/80">
                Your personal learning assistant
              </p>

              <h3 className="mt-4 max-w-xl text-3xl font-bold sm:text-4xl">
                Understand more. Practise more. Achieve more.
              </h3>

              <p className="mt-4 max-w-xl leading-7 text-white/90">
                Explore school subjects, generate practice quizzes
                and build your confidence one lesson at a time.
              </p>

              <Link
                href="/quiz"
                className="mt-6 inline-block rounded-xl bg-accent-yellow px-5 py-3 font-bold text-foreground shadow-sm transition hover:brightness-95"
              >
                Create a quiz →
              </Link>
            </div>
          </section>

         

          <section className="mb-10">
            <div className="mb-5">
              <h3 className="text-xl font-bold">
                Your learning overview
              </h3>
              <p className="mt-1 text-sm text-muted">
                Your statistics update from your saved quiz attempts.
              </p>
            </div>

            {progressError && (
              <div
                role="alert"
                className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
              >
                <p>{progressError}</p>

                <button
                  onClick={() => {
                    void loadDashboard(true);
                  }}
                  disabled={refreshing}
                  className="rounded-lg border border-amber-300 px-3 py-2 font-semibold hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? "Retrying..." : "Try Again"}
                </button>
              </div>
            )}

            {progressLoading && (
              <p className="mb-4 text-sm text-muted">
                Loading your statistics...
              </p>
            )}

            
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statistics.map((stat, index) => (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted">
                      {stat.label}
                    </p>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${
                        index % 3 === 0
                          ? "bg-primary/10 text-primary"
                          : index % 3 === 1
                            ? "bg-accent-coral/15 text-foreground"
                            : "bg-accent-yellow/30 text-foreground"
                      }`}
                    >
                      {stat.icon}
                    </span>
                  </div>

                  <p className="mt-4 text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </article>
              ))}
            </div>
            </section>


          <section id="features" className="mb-10">
            <div className="mb-5">
              <h3 className="text-xl font-bold">
                Your learning tools
              </h3>
              <p className="mt-1 text-sm text-muted">
                Choose a tool to get started.
              </p>
            </div>

            
            <div className="grid gap-5 sm:grid-cols-2">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-border bg-surface p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                      index % 3 === 0
                        ? "bg-primary/10 text-primary"
                        : index % 3 === 1
                          ? "bg-accent-coral/15 text-foreground"
                          : "bg-accent-yellow/30 text-foreground"
                    }`}
                  >
                    {feature.icon}
                  </div>

                  <h4 className="text-lg font-bold text-foreground">
                    {feature.title}
                  </h4>

                  <p className="mt-2 leading-6 text-muted">
                    {feature.description}
                  </p>

                  <Link
                    href={
                      feature.title === "AI Quiz Generator"
                        ? "/quiz"
                        : feature.title === "Practice & Results"
                          ? "/history"
                          : feature.title === "AI Tutor"
                            ? "/tutor"
                            : feature.title === "AI Study Materials"
                              ? "/study-materials"
                              : "/progress"
                    }
                    className="mt-5 inline-block font-semibold text-primary transition hover:text-primary-hover"
                  >
                    {feature.title === "AI Quiz Generator"
                      ? "Create a quiz →"
                      : feature.title === "AI Tutor"
                        ? "Ask a question →"
                        : feature.title === "AI Study Materials"
                          ? "Study now →"
                          : "Explore →"}
                  </Link>
                </article>
              ))}
            </div>

          </section>

          <section
            id="progress"
            className="mb-10 rounded-2xl border border-border bg-surface p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  Your learning journey
                </h3>
                <p className="mt-2 text-muted">
                  Review your recent quiz attempts and see how
                  you're performing in different subjects.
                </p>
              </div>
              <Link
                href="/progress"
                className="rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover"
              >
                View My Progress
              </Link>
            </div>
          </section>


          
          <section className="mb-10">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">
                  Recent learning activity
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Your latest quizzes and saved study materials, newest first.
                </p>
              </div>

              <Link
                href="/history"
                className="font-semibold text-primary hover:underline"
              >
                View quiz history →
              </Link>
            </div>

            {progressLoading || savedMaterialsLoading ? (
              <p className="text-sm text-muted">
                Loading your recent learning activity...
              </p>
            ) : recentLearningActivity.length > 0 ? (
              <div className="space-y-3">
                {recentLearningActivity.map((activity) => (
                  <Link
                    key={activity.id}
                    href={activity.href}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:shadow-md"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary">
                        {activity.type === "quiz" ? "✓" : "▤"}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {activity.type === "quiz"
                            ? "Quiz completed"
                            : "Study material"}
                        </p>

                        <h4 className="mt-1 font-semibold">
                          {activity.title}
                        </h4>

                        <p className="mt-1 text-sm text-muted">
                          {activity.detail}
                        </p>

                        <p className="mt-2 text-xs text-muted">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="ml-14 text-sm font-semibold text-primary sm:ml-0">
                      {activity.result} →
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
                <p className="font-semibold">
                  No learning activity yet
                </p>

                <p className="mt-2 text-sm text-muted">
                  Generate study notes or complete a quiz to start your learning history.
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/study-materials"
                    className="rounded-lg bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
                  >
                    Generate study materials
                  </Link>

                  <Link
                    href="/quiz"
                    className="rounded-lg border border-border px-5 py-3 font-semibold hover:bg-background"
                  >
                    Create a quiz
                  </Link>
                </div>
              </div>
            )}
          </section>


          
          <section className="mb-10">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">
                  My saved study materials
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Continue learning from notes you've already generated.
                </p>
              </div>

              <Link
                href="/saved-materials"
                className="font-semibold text-primary hover:underline"
              >
                View all materials →
              </Link>
            </div>

            {savedMaterialsLoading ? (
              <p className="text-sm text-muted">
                Loading saved materials...
             </p>
             ) : savedMaterialsError ? (
               <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
              >
                <p>{savedMaterialsError}</p>

                <button
                  onClick={() => {
                    void loadDashboard(true);
                  }}
                  disabled={refreshing}
                  className="rounded-lg border border-amber-300 px-3 py-2 font-semibold hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? "Retrying..." : "Try Again"}
                </button>
              </div>
            ) : savedMaterials.length > 0 ? (
              <>
                <p className="mb-4 text-sm text-muted">
                  {savedMaterials.length} saved{" "}
                  {savedMaterials.length === 1 ? "material" : "materials"}
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {savedMaterials.slice(0, 4).map((material) => (
                    <Link
                      key={material.id}
                      href={`/saved-materials/${material.id}`}
                      className="rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <p className="text-sm font-medium text-primary">
                        {material.subject} · Grade {material.grade}
                      </p>

                      <h4 className="mt-2 font-bold">
                        {material.title}
                      </h4>

                      <p className="mt-2 text-sm text-muted">
                        Topic: {material.topic}
                      </p>

                      <p className="mt-4 text-xs text-muted">
                        Saved{" "}
                        {new Date(material.created_at).toLocaleDateString()}
                      </p>

                      <p className="mt-4 font-semibold text-primary">
                        Open study notes →
                      </p>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
                <p className="font-semibold">
                  No saved materials yet
                </p>

                <p className="mt-2 text-sm text-muted">
                  Generate your first set of notes to see it here.
                </p>

                <Link
                  href="/study-materials"
                  className="mt-4 inline-block rounded-lg bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover"
                >
                  Generate study materials
                </Link>
              </div>
            )}
          </section>


          <section className="mb-10">
            <div className="mb-5">
              <h3 className="text-xl font-bold">
                Performance by subject
              </h3>
              <p className="mt-1 text-sm text-muted">
                Your average results in each subject you've practised.
              </p>
            </div>

            {!progressLoading &&
              progress &&
              progress.subject_performance.length > 0 && (
                <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
                  {progress.subject_performance.map((subject) => (
                    <div key={subject.subject}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-semibold">
                          {subject.subject}
                        </span>
                        <span className="text-muted">
                          {subject.average_percentage}% · {subject.attempts}{" "}
                          {subject.attempts === 1 ? "attempt" : "attempts"}
                        </span>
                      </div>
                      <div
                        className="h-3 overflow-hidden rounded-full bg-border"
                        role="progressbar"
                        aria-label={`${subject.subject} average score`}
                        aria-valuenow={Math.max(
                          0,
                          Math.min(100, subject.average_percentage)
                        )}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, subject.average_percentage)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {!progressLoading &&
              progress &&
              progress.subject_performance.length === 0 && (
                <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
                  Complete a quiz to see your subject performance here.
                </p>
              )}
          </section>

          <footer className="mt-10 border-t border-border py-6 text-center text-sm text-muted">
            AI Study Assistant · Built to help you learn.
          </footer>
        </section>
      </div>
    </main>
  );
}
