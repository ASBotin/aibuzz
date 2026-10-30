import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import PromptsEditor from "./PromptsEditor";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
    if (!(await isAdmin())) redirect("/projects");
    return <PromptsEditor />;
}
