
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type StudyMaterial = {
  title: string;
  introduction: string;
  notes: string[];
  key_terms: string[];
  worked_examples: string[];
  summary: string[];
};

export default function StudyMaterialsPage() {
  const router = useRouter();

  const [subject, setSubject] = useState("Mathematics");
  const [grade, setGrade] = useState("6");
  const [topic, setTopic] = useState("");
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateMaterials(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMaterial(null);

    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/study-materials/generate`,
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
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }

        throw new Error(
          data.detail || "Could not generate study materials."
        );
      }

      setMaterial(data);
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
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-4 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-3xl font-bold text-blue-800">
            AI Study Materials
          </h1>

          <p className="mt-2 text-gray-600">
            Generate notes, definitions, worked examples, and revision
            summaries tailored to your grade.
          </p>
        </div>

        <form
          onSubmit={generateMaterials}
          className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label
              htmlFor="subject"
              className="mb-2 block text-sm font-medium"
            >
              Subject
            </label>

            <input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={100}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. Mathematics"
            />
          </div>

          <div>
            <label
              htmlFor="grade"
              className="mb-2 block text-sm font-medium"
            >
              Grade
            </label>

            <select
              id="grade"
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

          <div>
            <label
              htmlFor="topic"
              className="mb-2 block text-sm font-medium"
            >
              Topic
            </label>

            <input
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={200}
              required
              placeholder="e.g. Fractions"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !subject.trim() || !topic.trim()}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating materials..." : "Generate Study Materials"}
          </button>
        </form>

        {material && (
          <article className="mt-8 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <header className="border-b border-gray-200 pb-5">
              <p className="text-sm font-semibold text-blue-700">
                {subject} · Grade {grade}
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {material.title}
              </h2>

              <p className="mt-3 leading-7 text-gray-700">
                {material.introduction}
              </p>
            </header>

            <section>
              <h3 className="text-xl font-bold">Study Notes</h3>
              <ul className="mt-3 list-disc space-y-3 pl-6 leading-7 text-gray-700">
                {material.notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold">Key Terms</h3>
              <ul className="mt-3 space-y-3">
                {material.key_terms.map((term, index) => (
                  <li
                    key={index}
                    className="rounded-lg bg-blue-50 p-4 leading-7 text-gray-800"
                  >
                    {term}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold">Worked Examples</h3>
              <ol className="mt-3 list-decimal space-y-3 pl-6 leading-7 text-gray-700">
                {material.worked_examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-xl font-bold">Revision Summary</h3>
              <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-gray-700">
                {material.summary.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </section>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50"
            >
              Print Study Materials
            </button>
          </article>
        )}
      </div>
    </main>
  );
}
