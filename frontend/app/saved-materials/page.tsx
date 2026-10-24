"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type SavedStudyMaterial = {
  id: number;
  subject: string;
  topic: string;
  grade: number;
  title: string;
  created_at: string;
};

export default function SavedMaterialsPage() {
  const [materials, setMaterials] = useState<SavedStudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMaterials() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/study-materials`,
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

        if (!response.ok) {
          throw new Error("Could not load saved study materials.");
        }

        const data: SavedStudyMaterial[] = await response.json();
        setMaterials(data);
      } catch {
        setError("Unable to load your saved materials. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadMaterials();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <Link
        href="/study-materials"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Generate study materials
      </Link>

      <h1 className="mt-6 text-3xl font-bold">
        My Saved Study Materials
      </h1>

      <p className="mt-2 text-gray-600">
        Revisit the study notes you have generated.
      </p>

      {loading && (
        <p className="mt-8">Loading your saved materials...</p>
      )}

      {error && (
        <p className="mt-8 text-red-600">{error}</p>
      )}

      {!loading && !error && materials.length === 0 && (
        <div className="mt-8 rounded-xl border p-6">
          <p>You have no saved study materials yet.</p>
          <Link
            href="/study-materials"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Generate your first study material →
          </Link>
        </div>
      )}

      {!loading && !error && materials.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {materials.map((material) => (
            <Link
               key={material.id}
               href={`/saved-materials/${material.id}`}
               className="block rounded-xl border p-5 shadow-sm transition hover:shadow-md"
            >
              <p className="text-sm font-medium text-blue-600">
                {material.subject} · Grade {material.grade}
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                {material.title}
              </h2>

              <p className="mt-2 text-gray-600">
                Topic: {material.topic}
              </p>

              <p className="mt-3 text-sm text-gray-500">
                Saved on{" "}
                {new Date(material.created_at).toLocaleDateString()}
              </p>

              <p className="mt-4 text-sm text-gray-500">
                Material ID: {material.id}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}