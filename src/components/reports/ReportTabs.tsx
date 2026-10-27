"use client";

import {
    ChartNoAxesCombined,
    Globe2,
    MessageSquareText,
    Tags,
    UsersRound,
    type LucideIcon,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type ReportSection = {
    id: string;
    label: string;
    content: ReactNode;
};

const sectionIcons: Record<string, LucideIcon> = {
    overview: ChartNoAxesCombined,
    competitors: UsersRound,
    keywords: Tags,
    sources: Globe2,
    answers: MessageSquareText,
};

export default function ReportTabs({
    sections,
}: {
    sections: ReportSection[];
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        let nextIndex: number | null = null;

        if (event.key === "ArrowRight") {
            nextIndex = (activeIndex + 1) % sections.length;
        } else if (event.key === "ArrowLeft") {
            nextIndex = (activeIndex - 1 + sections.length) % sections.length;
        } else if (event.key === "Home") {
            nextIndex = 0;
        } else if (event.key === "End") {
            nextIndex = sections.length - 1;
        }

        if (nextIndex !== null) {
            event.preventDefault();
            setActiveIndex(nextIndex);
            tabRefs.current[nextIndex]?.focus();
        }
    }

    return (
        <div className="space-y-6">
            <div className="no-print overflow-x-auto rounded-2xl bg-surface-1 p-1.5">
                <div
                    className="flex min-w-max gap-1"
                    role="tablist"
                    aria-label="Разделы отчёта"
                >
                    {sections.map((section, index) => {
                        const Icon = sectionIcons[section.id];
                        const isActive = activeIndex === index;

                        return (
                            <button
                                key={section.id}
                                ref={(element) => {
                                    tabRefs.current[index] = element;
                                }}
                                id={`report-tab-${section.id}`}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`report-panel-${section.id}`}
                                tabIndex={isActive ? 0 : -1}
                                onClick={() => setActiveIndex(index)}
                                onKeyDown={handleTabKeyDown}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2 ${
                                    isActive
                                        ? "bg-surface-2 text-accent-1 shadow-sm"
                                        : "text-content-secondary hover:bg-surface-2/70 hover:text-content-primary"
                                }`}
                            >
                                <Icon size={17} aria-hidden="true" />
                                {section.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {sections.map((section, index) => (
                <div
                    key={section.id}
                    id={`report-panel-${section.id}`}
                    role="tabpanel"
                    aria-labelledby={`report-tab-${section.id}`}
                    tabIndex={0}
                    className={`report-section-panel space-y-8 focus-visible:outline-none ${
                        activeIndex === index ? "block" : "hidden"
                    }`}
                >
                    {section.content}
                </div>
            ))}
        </div>
    );
}
