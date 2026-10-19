import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type TagTone =
    | "default"
    | "accent"
    | "transparent"
    | "positive"
    | "negative"
    | "warning";

type TagProps = {
    children: ReactNode;
    tone?: TagTone;
    className?: string;
};

const toneClasses: Record<TagTone, string> = {
    default: "bg-surface-3 text-content-secondary",
    accent: "bg-accent-2/10 text-accent-2 border border-accent-2/20",
    positive: "bg-emerald-500/10 text-emerald-400",
    negative: "bg-red-500/10 text-red-400",
    warning: "bg-amber-500/10 text-amber-400",
    transparent: "bg-surface-2/10 text-white/80",
};

export default function Tag({
    children,
    tone = "default",
    className,
}: TagProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                toneClasses[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}
