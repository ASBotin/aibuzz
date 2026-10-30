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
    disabled?: boolean;
};

type NativeButtonProps = SharedProps &
    Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        "children" | "className" | "size"
    > & {
        href?: never;
    };

type GradientButtonProps = LinkProps | NativeButtonProps;

const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-5 py-2.5 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-10 py-4 text-sm",
};

const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-accent-1 via-accent-2 to-accent-3 text-white font-medium transition-all hover:shadow-lg hover:shadow-accent-2/25 hover:-translate-y-0.5 cursor-pointer disabled:bg-none disabled:bg-surface-1 disabled:text-content-secondary disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed";

export default function GradientButton(props: GradientButtonProps) {
    const { href, size = "md", className, children, ...buttonProps } = props;
    const classes = cn(baseClasses, sizeClasses[size], className);

    if (href !== undefined) {
        if (props.disabled) {
            return (
                <span
                    aria-disabled="true"
                    className={cn(
                        classes,
                        "cursor-not-allowed opacity-60 hover:shadow-none hover:translate-y-0",
                    )}
                >
                    {children}
                </span>
            );
        }

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
