import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RunAuditForm from "./RunAuditForm";

export default async function RunAuditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: project, error } = await supabase
        .from("projects")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (error || !project) notFound();
    if (!(await isAdmin())) redirect(`/projects/${id}`);

    return <RunAuditForm />;
}
