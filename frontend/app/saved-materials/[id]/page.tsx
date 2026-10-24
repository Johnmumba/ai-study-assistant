
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function SavedMaterialDetailPage({ params }: PageProps) {
  const [materialId, setMaterialId] = useState("");
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    params.then(({ id }) => {
      if (!cancelled) {
        setMaterialId(id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!materialId) return;

    let cancelled = false;

    async function loadMaterial() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/study-materials/${materialId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (response.status === 404) {
          if (!cancelled) {
            setError("This study material was not found.");
          }
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load study material.");
        }

        const data: StudyMaterial = await response.json();

        if (!cancelled) {
          setMaterial(data);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load the study material. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMaterial();

    return () => {
      cancelled = true;
    };
  }, [materialId]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/saved-materials"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to saved materials
        </Link>

        <button
          onClick={() => window.print()}
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          Print notes
        </button>
      </div>

      {loading && (
        <p className="mt-8">Loading your study notes...</p>
      )}

      {error && (
        <p className="mt-8 text-red-600">{error}</p>
      )}

      {!loading && !error && material && (
        <article className="mt-8 space-y-8">
          <header>
            <h1 className="text-3xl font-bold">{material.title}</h1>
            <p className="mt-4 text-gray-700">
              {material.introduction}
            </p>
          </header>

          <section>
            <h2 className="text-2xl font-semibold">Study Notes</h2>
            <div className="mt-3 space-y-3">
              {material.notes.map((note, index) => (
                <p key={index} className="leading-7 text-gray-700">
                  {note}
                </p>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Key Terms</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              {material.key_terms.map((term, index) => (
                <li key={index} className="text-gray-700">
                  {term}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Worked Examples</h2>
            <div className="mt-3 space-y-4">
              {material.worked_examples.map((example, index) => (
                <div
                  key={index}
                  className="whitespace-pre-wrap rounded-xl border p-4 leading-7"
                >
                  {example}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Summary</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              {material.summary.map((point, index) => (
                <li key={index} className="text-gray-700">
                  {point}
                </li>
              ))}
            </ul>
          </section>
        </article>
      )}
    </main>
  );
}
