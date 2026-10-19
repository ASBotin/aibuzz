"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";
import ProjectDetailsForm from "@/components/projects/ProjectDetailsForm";
import {
    createEmptyProjectFormData,
    type ProjectFormData,
} from "@/features/projects";

export default function NewProjectPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<ProjectFormData>(
        createEmptyProjectFormData,
    );
    const [competitors, setCompetitors] = useState<string[]>([]);

    const handleInputChange = (field: keyof ProjectFormData, value: string) => {
        setFormData((previous) => ({ ...previous, [field]: value }));
    };

    const handleNext = () => {
        if (!formData.brandName || !formData.niche) return;

        const projectData = {
            ...formData,
            competitors,
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
                onChange={handleInputChange}
                onCompetitorsChange={setCompetitors}
            />

            <div className="pt-6 flex justify-end">
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={!formData.brandName || !formData.niche}
                    className={cn(
                        "px-10 py-3 rounded-full font-medium transition-colors",
                        formData.brandName && formData.niche
                            ? "bg-accent-2 hover:bg-accent-2-hover text-white cursor-pointer shadow-sm"
                            : "bg-surface-1 text-content-light cursor-not-allowed",
                    )}
                >
                    Далее
                </button>
            </div>
        </div>
    );
}
