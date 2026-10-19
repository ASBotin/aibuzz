import Link from "next/link";
import type { ReactNode } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type ButtonSize = "sm" | "md" | "lg";

type SharedProps = {
    children: ReactNode;
    size?: ButtonSize;
    className?: string;
};

type LinkProps = SharedProps & {
    href: string;
};

type NativeButtonProps = SharedProps &
    Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        "children" | "className" | "size"
    > & {
        href?: never;
    };

type AccentButtonProps = LinkProps | NativeButtonProps;

const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-10 py-3 text-sm",
};

const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-accent-2 text-white font-medium transition-colors hover:bg-accent-2-hover cursor-pointer disabled:bg-surface-1 disabled:text-content-light disabled:hover:bg-surface-1 disabled:cursor-not-allowed";

export default function AccentButton(props: AccentButtonProps) {
    const { href, size = "md", className, children, ...buttonProps } = props;
    const classes = cn(baseClasses, sizeClasses[size], className);

    if (href !== undefined) {
        return (
            <Link href={href} className={classes}>
                {children}
            </Link>
        );
    }

    return (
        <button {...buttonProps} className={classes}>
            {children}
        </button>
    );
}
