import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import ProjectSettingsForm from "./ProjectSettingsForm";

export default async function ProjectSettingsPage() {
    if (!(await isAdmin())) redirect("/projects");
    return <ProjectSettingsForm />;
}
