"use client";

export default function ExportPdfButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            title="Откроется окно печати — выберите «Сохранить как PDF»"
            aria-label="Экспортировать отчёт в PDF"
        >
            <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 shrink-0"
            >
                <path
                    d="M12 3v11m0 0 4-4m-4 4-4-4M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            Экспорт в PDF
        </button>
    );
}
