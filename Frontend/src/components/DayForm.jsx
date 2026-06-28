// DayForm.jsx
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CategorySection from "./CategorySection";

export const CATEGORIES = [
    { key: "food",      label: "Food",            color: "blue",   hint: "Meals, beverages, restaurant bills" },
    { key: "transport", label: "Local Transport",  color: "emerald", hint: "Cab, auto, metro, fuel receipts" },
    { key: "misc",      label: "Miscellaneous",    color: "amber",  hint: "Any other claimable expense — description required" },
];

export default function DayForm({ dayIndex, dateStr, dayUploads, onAddFiles, onRemoveFile, onDescChange, onNext, onBack, isLastDay }) {
    const currentUploads = dayUploads || {};
    const hasAnyFile = CATEGORIES.some(cat => (currentUploads[cat.key] || []).length > 0);

    // Validate misc descriptions
    const miscUploads = currentUploads["misc"] || [];
    const miscMissingDesc = miscUploads.some(u => u.description.trim().length < 5);

    const canProceed = hasAnyFile && !miscMissingDesc;

    return (
        <div className="flex flex-col gap-5">
            {CATEGORIES.map(cat => (
                <CategorySection
                    key={cat.key}
                    cat={cat}
                    dayUploads={currentUploads}
                    onAddFiles={onAddFiles}
                    onRemoveFile={onRemoveFile}
                    onDescChange={onDescChange}
                />
            ))}

            {miscMissingDesc && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    Each miscellaneous upload needs a description (at least 5 characters).
                </p>
            )}

            {!hasAnyFile && (
                <p className="text-xs text-slate-400 text-center">Upload at least one receipt to continue.</p>
            )}

            <div className="flex justify-between pt-2">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
                >
                    <ChevronLeft size={15} /> Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!canProceed}
                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition
                        ${canProceed ? "bg-violet-600 hover:bg-violet-700" : "bg-violet-300 cursor-not-allowed"}`}
                >
                    {isLastDay ? "Review Claim" : "Next Day"} <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
}