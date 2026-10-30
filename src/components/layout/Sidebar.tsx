import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

type Project = {
    id: string;
    name: string;
};

export default async function Sidebar() {
    const admin = await isAdmin();
    const supabase = await createSupabaseServerClient();
    const { data: projects, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(
            `Не удалось загрузить список проектов: ${error.message}`,
        );
    }

    return (
        <aside className="app-sidebar sticky top-0 h-screen shrink-0 overflow-y-auto border-r border-surface-3 bg-surface-2 px-3 py-6 sm:px-4">
            <nav aria-label="Основная навигация">
                <Link
                    href="/projects"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-content-primary transition-colors hover:bg-surface-1"
                >
                    <span className="app-sidebar-label">Проекты</span>
                </Link>
                {admin ? (
                    <SignOutButton />
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center rounded-xl px-3 py-2 text-xs text-content-secondary transition-colors hover:bg-surface-1 hover:text-content-primary"
                    >
                        Вход администратора
                    </Link>
                )}

                <ul className="mt-2 space-y-1">
                    {(projects as Project[]).map((project) => (
                        <li key={project.id}>
                            <Link
                                href={`/projects/${project.id}`}
                                title={project.name}
                                className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-sm text-content-secondary transition-colors hover:bg-surface-1 hover:text-content-primary"
                            >
                                <span
                                    aria-hidden="true"
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-1 text-[10px] font-semibold uppercase text-content-secondary"
                                >
                                    {project.name.slice(0, 2)}
                                </span>
                                <span className="app-sidebar-label truncate">
                                    {project.name}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
