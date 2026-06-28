// ReviewStep.jsx
import React from "react";
import { ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import Thumbnail from "./Thumbnail";
import { COLOR } from "./CategorySection";
import { CATEGORIES } from "./DayForm";

// Shared Date Helpers
export function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function addDays(dateStr, n) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
}

export default function ReviewStep({ allDays, startDate, onBack, onSubmit, submitting }) {
    return (
        <div className="flex flex-col gap-6">
            {allDays.map((dayUploads, dayIndex) => {
                const dateStr = addDays(startDate, dayIndex);
                const dayHasFiles = CATEGORIES.some(cat => (dayUploads[cat.key] || []).length > 0);
                if (!dayHasFiles) return null;
                return (
                    <div key={dayIndex} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Day {dayIndex + 1} — {formatDate(dateStr)}
                            </span>
                        </div>
                        <div className="p-5 flex flex-col gap-5">
                            {CATEGORIES.map(cat => {
                                const uploads = dayUploads[cat.key] || [];
                                if (!uploads.length) return null;
                                const c = COLOR[cat.color];
                                return (
                                    <div key={cat.key}>
                                        <span className={`text-xs font-semibold ${c.text} uppercase tracking-wide`}>{cat.label}</span>
                                        <div className="flex flex-wrap gap-3 mt-3">
                                            {uploads.map((u, i) => (
                                                <div key={i} className="flex flex-col gap-1.5">
                                                    <Thumbnail file={u.file} onRemove={null} />
                                                    <span className="text-[9px] text-slate-400 w-20 truncate">{u.file.name}</span>
                                                    {cat.key === "misc" && u.description && (
                                                        <span className="text-[9px] text-amber-600 w-20 leading-tight break-words">{u.description}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <div className="flex justify-between pt-2">
                <button
                    onClick={onBack}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 transition disabled:opacity-50"
                >
                    <ChevronLeft size={15} /> Back
                </button>
                <button
                    onClick={onSubmit}
                    disabled={submitting}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition
                        ${submitting ? "bg-violet-300 cursor-not-allowed" : "bg-violet-600 hover:bg-violet-700"}`}
                >
                    {submitting ? (
                        <>
                            <Loader2 size={15} className="animate-spin" /> Submitting…
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={15} /> Submit Claim
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}