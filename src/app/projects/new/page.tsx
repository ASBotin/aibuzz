"use client";

import { useState, KeyboardEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/cn";

export default function NewProjectPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        brandName: "",
        niche: "",
        country: "",
        city: "",
        description: "",
    });

    const [competitors, setCompetitors] = useState<string[]>([]);
    const [competitorInput, setCompetitorInput] = useState("");

    const MAX_DESCRIPTION_LENGTH = 500;
    const MAX_COMPETITORS = 10;

    const handleInputChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        if (name === "description" && value.length > MAX_DESCRIPTION_LENGTH) {
            return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddCompetitor = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const value = competitorInput.trim().replace(/,$/, "");

            if (
                value &&
                !competitors.includes(value) &&
                competitors.length < MAX_COMPETITORS
            ) {
                setCompetitors([...competitors, value]);
            }
            setCompetitorInput("");
        }
    };

    const removeCompetitor = (competitorToRemove: string) => {
        setCompetitors(competitors.filter((c) => c !== competitorToRemove));
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

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-content-secondary">
                            Название бренда/компании*
                        </label>
                        <input
                            type="text"
                            name="brandName"
                            value={formData.brandName}
                            onChange={handleInputChange}
                            placeholder="Название вашего бренда"
                            className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors mt-1"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-content-secondary">
                            Сфера деятельности*
                        </label>
                        <input
                            type="text"
                            name="niche"
                            value={formData.niche}
                            onChange={handleInputChange}
                            placeholder="Например, онлайн-образование"
                            className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors mt-1"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-content-secondary">
                            Конкуренты
                        </label>
                        <span className="text-xs text-content-light">
                            {competitors.length} / {MAX_COMPETITORS}
                        </span>
                    </div>
                    <div
                        className="flex flex-wrap items-center gap-2 w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2 min-h-[48px] focus-within:border-accent-2 focus-within:ring-1 focus-within:ring-accent-2 transition-colors mt-1 cursor-text"
                        onClick={() =>
                            document.getElementById("competitor-input")?.focus()
                        }
                    >
                        {competitors.map((competitor) => (
                            <span
                                key={competitor}
                                className="flex items-center gap-1.5 bg-surface-1 text-content-primary px-3 py-1 rounded-full text-sm select-none border border-content-light/20"
                            >
                                {competitor}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeCompetitor(competitor);
                                    }}
                                    className="text-content-light hover:text-content-secondary focus:outline-none"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line
                                            x1="18"
                                            y1="6"
                                            x2="6"
                                            y2="18"
                                        ></line>
                                        <line
                                            x1="6"
                                            y1="6"
                                            x2="18"
                                            y2="18"
                                        ></line>
                                    </svg>
                                </button>
                            </span>
                        ))}
                        <input
                            id="competitor-input"
                            type="text"
                            value={competitorInput}
                            onChange={(e) => setCompetitorInput(e.target.value)}
                            onKeyDown={handleAddCompetitor}
                            disabled={competitors.length >= MAX_COMPETITORS}
                            placeholder={
                                competitors.length === 0
                                    ? "Перечислите основных конкурентов"
                                    : ""
                            }
                            className="flex-1 min-w-[200px] bg-transparent outline-none text-content-primary placeholder:text-content-light disabled:cursor-not-allowed"
                        />
                    </div>
                    <p className="text-xs text-content-secondary mt-1 select-none">
                        Нажмите Enter или запятую, чтобы добавить конкурента
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-content-secondary">
                            Страна
                        </label>
                        <input
                            type="text"
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            placeholder="Например, Россия"
                            className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors mt-1"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-content-secondary">
                            Город
                        </label>
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="Например, Москва"
                            className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-2.5 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors mt-1"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-content-secondary">
                            Краткое описание
                        </label>
                        <span className="text-xs text-content-light">
                            Ещё{" "}
                            {MAX_DESCRIPTION_LENGTH -
                                formData.description.length}{" "}
                        </span>
                    </div>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Чем занимается компания, ключевые продукты или особенности для более точной генерации промптов..."
                        rows={4}
                        className="w-full bg-surface-2 border border-content-light rounded-2xl px-4 py-3 text-content-primary focus:outline-none focus:border-accent-2 focus:ring-1 focus:ring-accent-2 transition-colors mt-1 resize-none h-48"
                    />
                </div>

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
        </div>
    );
}
