import { isAdmin } from "@/lib/auth";
import ProjectSettingsForm from "./ProjectSettingsForm";

export default async function ProjectSettingsPage() {
    const editable = await isAdmin();
    return <ProjectSettingsForm editable={editable} />;
}
