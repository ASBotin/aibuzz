import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminUserResult =
    | { userId: string; response: null }
    | { userId: null; response: NextResponse };

// В текущей демо-версии регистрация пользователей отсутствует; предусмотрены только администратор и анонимный посетитель.
export async function getAdminUser(): Promise<AdminUserResult> {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLocaleLowerCase("en-US");
    if (!adminEmail) {
        return {
            userId: null,
            response: NextResponse.json(
                { error: "Администратор не настроен на сервере." },
                { status: 503 },
            ),
        };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error && error.name !== "AuthSessionMissingError") {
        console.error("[Admin Auth Error]:", error);
        return {
            userId: null,
            response: NextResponse.json(
                { error: "Не удалось проверить вход. Попробуйте позже." },
                { status: 503 },
            ),
        };
    }
    if (!data.user) {
        return {
            userId: null,
            response: NextResponse.json(
                { error: "Требуется вход администратора." },
                { status: 401 },
            ),
        };
    }

    if (
        data.user.email?.trim().toLocaleLowerCase("en-US") !== adminEmail
    ) {
        return {
            userId: null,
            response: NextResponse.json(
                { error: "Недостаточно прав для этого действия." },
                { status: 403 },
            ),
        };
    }

    return { userId: data.user.id, response: null };
}

export async function requireAdmin(): Promise<NextResponse | null> {
    return (await getAdminUser()).response;
}

export async function isAdmin(): Promise<boolean> {
    return (await getAdminUser()).response === null;
}
