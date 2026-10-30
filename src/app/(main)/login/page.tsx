import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import SignInForm from "./SignInForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
    if (await isAdmin()) redirect("/projects");

    return (
        <div className="mx-auto max-w-md px-4 py-16">
            <h1 className="mb-2 text-3xl font-bold text-content-primary">
                Вход администратора
            </h1>
            <p className="mb-8 text-sm text-content-secondary">
                Вход доступен только владельцу
            </p>
            <SignInForm />
        </div>
    );
}
