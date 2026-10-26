"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusNotice from "@/components/ui/StatusNotice";

export default function DeleteProjectButton({
    projectId,
}: {
    projectId: string;
}) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function deleteProject() {
        if (
            isDeleting ||
            !window.confirm(
                "Удалить проект вместе со всеми отчётами и настройками? Это действие нельзя отменить.",
            )
        ) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/projects/${encodeURIComponent(projectId)}`,
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
                        : `Не удалось удалить проект (HTTP ${response.status}).`;
                throw new Error(message);
            }

            router.replace("/projects");
            router.refresh();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "Не удалось удалить проект.",
            );
            setIsDeleting(false);
        }
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={() => void deleteProject()}
                disabled={isDeleting}
                className="text-sm font-normal text-red-600/70 transition-colors hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
                {isDeleting ? "Удаление..." : "Удалить проект"}
            </button>
            {error && (
                <StatusNotice
                    variant="error"
                    compact
                    className="max-w-64 text-xs"
                >
                    {error}
                </StatusNotice>
            )}
        </div>
    );
}
