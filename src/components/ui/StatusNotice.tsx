import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/utils/cn";

type StatusNoticeProps = {
    children: ReactNode;
    variant?: "error" | "success" | "info";
    className?: string;
    compact?: boolean;
};

const variantStyles = {
    error: {
        icon: CircleAlert,
        className: "border-rose-500/25 bg-rose-500/8 text-rose-800",
        iconClassName: "text-rose-600",
        role: "alert",
    },
    success: {
        icon: CircleCheck,
        className: "border-emerald-500/25 bg-emerald-500/8 text-emerald-800",
        iconClassName: "text-emerald-600",
        role: "status",
    },
    info: {
        icon: Info,
        className: "border-accent-2/25 bg-accent-2/8 text-content-primary",
        iconClassName: "text-accent-2",
        role: "status",
    },
} as const;

export default function StatusNotice({
    children,
    variant = "info",
    className,
    compact = false,
}: StatusNoticeProps) {
    const styles = variantStyles[variant];
    const Icon = styles.icon;

    return (
        <div
            role={styles.role}
            className={cn(
                "flex items-start gap-3 rounded-2xl border text-sm leading-relaxed",
                compact ? "px-3 py-2" : "px-4 py-3",
                styles.className,
                className,
            )}
        >
            <Icon
                aria-hidden="true"
                className={cn(
                    "mt-0.5 shrink-0",
                    compact ? "h-4 w-4" : "h-[18px] w-[18px]",
                    styles.iconClassName,
                )}
            />
            <div className="min-w-0">{children}</div>
        </div>
    );
}
