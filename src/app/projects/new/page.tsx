"use client";

import { useState, KeyboardEvent } from "react";
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

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddCompetitor = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const value = competitorInput.trim().replace(/,$/, "");

            if (value && !competitors.includes(value)) {
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
            <h1 className="text-3xl font-bold mb-8 text-slate-100">
                Создание проекта
            </h1>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            Название бренда/компании*
                        </label>
                        <input
                            type="text"
                            name="brandName"
                            value={formData.brandName}
                            onChange={handleInputChange}
                            placeholder="Например, Яндекс Практикум"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            Сфера деятельности*
                        </label>
                        <input
                            type="text"
                            name="niche"
                            value={formData.niche}
                            onChange={handleInputChange}
                            placeholder="Например, EdTech, онлайн-образование"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                        Конкуренты
                    </label>
                    <div
                        className="flex flex-wrap items-center gap-2 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors cursor-text"
                        onClick={() =>
                            document.getElementById("competitor-input")?.focus()
                        }
                    >
                        {competitors.map((competitor) => (
                            <span
                                key={competitor}
                                className="flex items-center gap-1.5 bg-slate-800 text-slate-200 px-3 py-1 rounded-full text-sm select-none"
                            >
                                {competitor}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeCompetitor(competitor);
                                    }}
                                    className="text-slate-400 hover:text-slate-100 focus:outline-none"
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
                            placeholder={
                                competitors.length === 0
                                    ? "Введите название и нажмите Enter"
                                    : ""
                            }
                            className="flex-1 min-w-[200px] bg-transparent outline-none text-slate-100 placeholder:text-slate-500"
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        Нажмите Enter или запятую, чтобы добавить конкурента
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            Страна
                        </label>
                        <input
                            type="text"
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            placeholder="Например, Россия"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">
                            Город
                        </label>
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="Например, Москва"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                        Краткое описание (опционально)
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Чем занимается компания, ключевые продукты или особенности для более точной генерации промптов..."
                        rows={4}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y"
                    />
                </div>

                <div className="pt-6 flex justify-end">
                    <button
                        onClick={handleNext}
                        disabled={!formData.brandName || !formData.niche}
                        className={cn(
                            "px-6 py-2.5 rounded-lg font-medium transition-colors",
                            formData.brandName && formData.niche
                                ? "bg-blue-600 hover:bg-blue-500 text-white"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed",
                        )}
                    >
                        Далее
                    </button>
                </div>
            </div>
        </div>
    );
}
