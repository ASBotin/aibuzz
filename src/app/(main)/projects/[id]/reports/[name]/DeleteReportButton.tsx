"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteReportButton({
    projectId,
    reportId,
}: {
    projectId: string;
    reportId: string;
}) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function deleteReport() {
        if (
            isDeleting ||
            !window.confirm(
                "Удалить этот отчёт? Это действие нельзя отменить.",
            )
        ) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/projects/${encodeURIComponent(projectId)}/reports/${encodeURIComponent(reportId)}`,
                {
                    method: "DELETE",
                    headers: { Accept: "application/json" },
                    credentials: "same-origin",
                },
            );

            if (!response.ok) {
                const result: unknown = await response.json();
                const message =
                    typeof result === "object" &&
                    result !== null &&
                    "error" in result &&
                    typeof result.error === "string"
                        ? result.error
                        : `Не удалось удалить отчёт (HTTP ${response.status}).`;
                throw new Error(message);
            }

            router.replace(`/projects/${encodeURIComponent(projectId)}/reports`);
            router.refresh();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "Не удалось удалить отчёт.",
            );
            setIsDeleting(false);
        }
    }

    return (
        <div className="flex flex-col items-stretch gap-1">
            <button
                type="button"
                onClick={() => void deleteReport()}
                disabled={isDeleting}
                className="no-print inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-wait disabled:opacity-60"
                aria-label="Удалить отчёт"
            >
                <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 shrink-0"
                >
                    <path
                        d="M4 7h16m-10 4v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                {isDeleting ? "Удаление..." : "Удалить отчёт"}
            </button>
            {error && (
                <p
                    className="max-w-52 text-xs text-white"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
