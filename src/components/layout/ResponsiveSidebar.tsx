"use client";

import { Menu, X } from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";

export default function ResponsiveSidebar({
    children,
}: {
    children: ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);

    function handleNavigation(event: MouseEvent<HTMLDivElement>) {
        if (event.target instanceof Element && event.target.closest("a")) {
            setIsOpen(false);
        }
    }

    return (
        <div className="app-sidebar-responsive" onClick={handleNavigation}>
            <button
                type="button"
                className="app-sidebar-toggle cursor-pointer"
                aria-controls="main-sidebar"
                aria-expanded={isOpen}
                aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
                onClick={() => setIsOpen((open) => !open)}
            >
                {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>

            {isOpen && (
                <button
                    type="button"
                    className="app-sidebar-backdrop"
                    aria-label="Закрыть меню"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div
                className={`app-sidebar-container${isOpen ? " is-open" : ""}`}
            >
                {children}
            </div>
        </div>
    );
}
