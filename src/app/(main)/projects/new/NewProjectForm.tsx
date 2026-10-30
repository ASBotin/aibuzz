"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AccentButton from "@/components/ui/AccentButton";
import ProjectDetailsForm from "@/components/projects/ProjectDetailsForm";
import {
    createEmptyProjectFormData,
    type ProjectFormData,
} from "@/features/projects";

export default function NewProjectForm() {
    const router = useRouter();
    const [formData, setFormData] = useState<ProjectFormData>(
        createEmptyProjectFormData,
    );
    const [competitors, setCompetitors] = useState<string[]>([]);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [pages, setPages] = useState<string[]>([""]);

    const handleInputChange = (field: keyof ProjectFormData, value: string) => {
        setFormData((previous) => ({ ...previous, [field]: value }));
    };

    const handleNext = () => {
        if (!formData.brandName || !formData.niche) return;

        const projectData = {
            ...formData,
            competitors,
            keywords,
            pages: pages.map((page) => page.trim()).filter(Boolean),
        };

        sessionStorage.setItem("pendingProject", JSON.stringify(projectData));
        router.push("/projects/new/createprompts");
    };

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-8 text-content-primary">
                Создание проекта
            </h1>

            <ProjectDetailsForm
                value={formData}
                competitors={competitors}
                keywords={keywords}
                pages={pages}
                onChange={handleInputChange}
                onCompetitorsChange={setCompetitors}
                onKeywordsChange={setKeywords}
                onPagesChange={setPages}
            />

            <div className="pt-6 flex justify-end">
                <AccentButton
                    size="lg"
                    onClick={handleNext}
                    disabled={!formData.brandName || !formData.niche}
                >
                    Далее
                </AccentButton>
            </div>
        </div>
    );
}
