import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import NewProjectForm from "./NewProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
    if (!(await isAdmin())) redirect("/projects");
    return <NewProjectForm />;
}
