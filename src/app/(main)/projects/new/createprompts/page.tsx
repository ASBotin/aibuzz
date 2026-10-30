import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import CreatePromptsForm from "./CreatePromptsForm";

export const dynamic = "force-dynamic";

export default async function CreatePromptsPage() {
    if (!(await isAdmin())) redirect("/projects");
    return <CreatePromptsForm />;
}
