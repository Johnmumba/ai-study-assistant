
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Question = {
  id: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

type Quiz = {
  id: number;
  subject: string;
  topic: string;
  grade: number;
  number_of_questions: number;
  questions: Question[];
};

type QuestionResult = {
  question_id: number;
  question: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
};

type QuizResult = {
  attempt_id: number;
  quiz_id: number;
  subject: string;
  topic: string;
  total_questions: number;
  score: number;
  percentage: number;
  submitted_at: string;
  results: QuestionResult[];
};

export default function QuizPage() {
  const router = useRouter();

  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState("");

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("5");
  const [difficulty, setDifficulty] = useState("easy");
  const [numberOfQuestions, setNumberOfQuestions] = useState("5");

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verifyStudent() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

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
          setAuthError("Could not verify your account. Please try again.");
          return;
        }
      } catch {
        setAuthError(
          "Could not connect to the server. Make sure the backend is running."
        );
      } finally {
        setAuthChecking(false);
      }
    }

    verifyStudent();
  }, [router]);

  function handleReturnToLogin() {
    localStorage.removeItem("access_token");
    router.replace("/login");
  }

  async function generateQuiz(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");
    setQuiz(null);
    setResult(null);
    setAnswers({});

    try {
      const response = await fetch(
        `${API_URL}/api/quizzes/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: subject.trim(),
            topic: topic.trim(),
            grade: Number(grade),
            difficulty,
            number_of_questions: Number(numberOfQuestions),
          }),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            `Quiz generation failed (${response.status}).`
        );
      }

      setQuiz(data as Quiz);
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

  async function submitAnswers(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!quiz) return;

    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const unanswered = quiz.questions.some(
      (question) => !answers[question.id]
    );

    if (unanswered) {
      setError("Please answer every question before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/quizzes/${quiz.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: quiz.questions.map((question) => ({
              question_id: question.id,
              selected_answer: answers[question.id],
            })),
          }),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            `Submission failed (${response.status}).`
        );
      }

      setResult(data as QuizResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit your answers. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function chooseAnswer(questionId: number, answer: string) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: answer,
    }));
  }

  function startAnotherQuiz() {
    setQuiz(null);
    setAnswers({});
    setResult(null);
    setError("");
  }

  if (authChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted">
        Verifying your account...
      </main>
    );
  }

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
          <p>{authError}</p>
          <button
            type="button"
            onClick={handleReturnToLogin}
            className="mt-4 rounded-lg bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="font-semibold text-primary hover:text-primary-hover"
        >
          ← Back to dashboard
        </Link>

        <header className="mb-8 mt-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            AI-powered learning
          </p>

          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            AI Quiz Generator
          </h1>

          <p className="mt-3 leading-7 text-muted">
            Choose a subject and topic. Generate a quiz, answer the
            questions, and check your results.
          </p>
        </header>

        <form
          onSubmit={generateQuiz}
          className="space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8"
        >
          <div>
            <label
              htmlFor="subject"
              className="mb-2 block font-semibold"
            >
              Subject or course
            </label>

            <input
              id="subject"
              type="text"
              required
              maxLength={100}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="e.g. Science, Mathematics, Biology"
              className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label
              htmlFor="topic"
              className="mb-2 block font-semibold"
            >
              Topic
            </label>

            <input
              id="topic"
              type="text"
              required
              maxLength={200}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Forces, Fractions, Photosynthesis"
              className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="grade"
                className="mb-2 block font-semibold"
              >
                Grade
              </label>

              <select
                id="grade"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3"
              >
                {Array.from(
                  { length: 12 },
                  (_, index) => index + 1
                ).map((number) => (
                  <option key={number} value={number}>
                    Grade {number}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="difficulty"
                className="mb-2 block font-semibold"
              >
                Difficulty
              </label>

              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="numberOfQuestions"
              className="mb-2 block font-semibold"
            >
              Number of questions
            </label>

            <input
              id="numberOfQuestions"
              type="number"
              required
              min={1}
              max={100}
              value={numberOfQuestions}
              onChange={(event) =>
                setNumberOfQuestions(event.target.value)
              }
              className="w-full rounded-xl border border-border px-4 py-3"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating quiz..." : "Generate Quiz"}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {loading && (
          <p
            className="mt-6 text-center text-muted"
            aria-live="polite"
          >
            Your AI assistant is preparing your questions. This may
            take a little while.
          </p>
        )}

        {quiz && (
          <section className="mt-10 space-y-6">
            <div className="rounded-2xl bg-primary/10 p-6">
              <p className="text-sm font-semibold text-primary">
                QUIZ GENERATED
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {quiz.subject}: {quiz.topic}
              </h2>

              <p className="mt-2 text-muted">
                Grade {quiz.grade} · {quiz.number_of_questions} questions
              </p>
            </div>

            {!result ? (
              <form onSubmit={submitAnswers} className="space-y-6">
                {quiz.questions.map((question, index) => {
                  const options = [
                    ["A", question.option_a],
                    ["B", question.option_b],
                    ["C", question.option_c],
                    ["D", question.option_d],
                  ] as const;

                  return (
                    <fieldset
                      key={question.id}
                      className="rounded-2xl border border-border bg-surface p-6"
                    >
                      <legend className="sr-only">
                        Question {index + 1}
                      </legend>

                      <p className="text-sm font-semibold text-primary">
                        QUESTION {index + 1} OF {quiz.questions.length}
                      </p>

                      <h3 className="mt-3 text-lg font-bold">
                        {question.text}
                      </h3>

                      <div className="mt-4 space-y-3">
                        {options.map(([letter, option]) => (
                          <label
                            key={letter}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                              answers[question.id] === letter
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-primary/5"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={letter}
                              checked={answers[question.id] === letter}
                              onChange={() =>
                                chooseAnswer(question.id, letter)
                              }
                              className="mt-1 accent-primary"
                            />

                            <span>
                              <strong className="mr-2">{letter}.</strong>
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? "Marking your answers..."
                    : "Submit Answers"}
                </button>
              </form>
            ) : (
              <section className="space-y-6">
                <div className="rounded-2xl border border-border bg-surface p-6 text-center">
                  <p className="font-semibold text-muted">
                    YOUR RESULT
                  </p>

                  <p className="mt-3 text-5xl font-bold text-primary">
                    {result.percentage}%
                  </p>

                  <h3 className="mt-3 text-xl font-bold">
                    {result.score} out of {result.total_questions} correct
                  </h3>

                  <p className="mt-2 text-sm text-muted">
                    Attempt ID: {result.attempt_id}
                  </p>
                </div>

                {result.results.map((item, index) => (
                  <article
                    key={item.question_id}
                    className="rounded-2xl border border-border bg-surface p-6"
                  >
                    <p
                      className={`font-semibold ${
                        item.is_correct
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {item.is_correct ? "Correct" : "Incorrect"} · Question{" "}
                      {index + 1}
                    </p>

                    <h3 className="mt-3 text-lg font-bold">
                      {item.question}
                    </h3>

                    <p className="mt-3 text-muted">
                      Your answer:{" "}
                      <strong>{item.selected_answer}</strong>
                    </p>
  
                    <div
                      className={`mt-3 rounded-xl p-3 ${
                        item.is_correct
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                     <p className="font-semibold">
                       {item.is_correct
                          ? "Well done! You understood this question."
                          : "Keep learning! Review the explanation below to understand how to solve this question."}
                      </p>
                    </div>

                    <p className="mt-1 text-muted">
                      Correct answer:{" "}
                      <strong>{item.correct_answer}</strong>
                    </p>

                    <div className="mt-4 rounded-xl bg-background p-4">
                      <p className="font-semibold">Explanation</p>
                      <p className="mt-2 leading-7 text-foreground">
                        {item.explanation}
                      </p>
                    </div>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={startAnotherQuiz}
                  className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
                >
                  Generate Another Quiz
                </button>
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
