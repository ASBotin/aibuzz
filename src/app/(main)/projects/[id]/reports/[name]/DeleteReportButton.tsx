"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusNotice from "@/components/ui/StatusNotice";

export default function DeleteReportButton({
    projectId,
    reportId,
    variant = "header",
    disabled = false,
}: {
    projectId: string;
    reportId: string;
    variant?: "header" | "list";
    disabled?: boolean;
}) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isListVariant = variant === "list";

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
                disabled={isDeleting || disabled}
                className={`no-print inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isListVariant
                        ? "border border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/20 focus-visible:ring-red-500/50"
                        : "border border-white/40 text-white hover:bg-white/15 focus-visible:ring-white/80"
                }`}
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
                <StatusNotice
                    variant="error"
                    compact
                    className={`max-w-52 text-xs ${isListVariant ? "" : "border-white/25 bg-white/90"}`}
                >
                    {error}
                </StatusNotice>
            )}
        </div>
    );
}
