// ReviewStep.jsx
import React, { useState, useEffect } from "react";
import { ChevronLeft, Loader2, CheckCircle2, FileText, Eye, X, Paperclip } from "lucide-react";

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

const COLOR_THEMES = {
    food: {
        bg: "bg-blue-50/50",
        border: "border-blue-100",
        text: "text-blue-700",
        pill: "bg-blue-100 text-blue-800"
    },
    transport: {
        bg: "bg-emerald-50/50",
        border: "border-emerald-100",
        text: "text-emerald-700",
        pill: "bg-emerald-100 text-emerald-800"
    },
    misc: {
        bg: "bg-amber-50/50",
        border: "border-amber-100",
        text: "text-amber-700",
        pill: "bg-amber-100 text-amber-800"
    }
};

export default function ReviewStep({ allDays, startDate, onBack, onSubmit, submitting }) {
    // Modal preview states
    const [previewFile, setPreviewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");

    // Hook to safely create and clean up object URLs for previewing local file objects
    useEffect(() => {
        if (!previewFile) {
            setPreviewUrl("");
            return;
        }
        const url = URL.createObjectURL(previewFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [previewFile]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5">
                {allDays.map((dayUploads, dayIndex) => {
                    const dateStr = addDays(startDate, dayIndex);
                    
                    const foodList = dayUploads.food || [];
                    const transportList = dayUploads.transport || [];
                    const miscList = dayUploads.misc || [];

                    const dayHasFiles = foodList.length > 0 || transportList.length > 0 || miscList.length > 0;
                    if (!dayHasFiles) return null;

                    return (
                        <div key={dayIndex} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            {/* Day Header */}
                            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                    Day {dayIndex + 1}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                    {formatDate(dateStr)}
                                </span>
                            </div>

                            <div className="p-5 flex flex-col gap-5">
                                
                                {/* A. Food Category Review (Dual File Slots) */}
                                {foodList.length > 0 && (
                                    <div className={`p-4 rounded-xl border ${COLOR_THEMES.food.border} ${COLOR_THEMES.food.bg}`}>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${COLOR_THEMES.food.text}`}>
                                            Food Expenses
                                        </span>
                                        <div className="mt-3 flex flex-col gap-3">
                                            {foodList.map((slot, i) => (
                                                <div key={i} className="bg-white border border-slate-100 rounded-lg p-3 shadow-2xs">
                                                    <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase">Meal Slot #{i + 1}</span>
                                                    
                                                    {/* Dual file displays */}
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        {/* Receipt Display */}
                                                        {slot.receipt && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewFile(slot.receipt)}
                                                                className="flex-1 flex items-center justify-between border border-slate-200 rounded-lg p-2 hover:border-blue-400 hover:bg-blue-50/5 text-left text-xs transition group"
                                                            >
                                                                <div className="flex items-center gap-2 truncate max-w-[80%]">
                                                                    <FileText size={14} className="text-blue-500 shrink-0" />
                                                                    <span className="truncate text-slate-600 font-medium group-hover:text-blue-600">{slot.receipt.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0 text-[10px] text-slate-400 group-hover:text-blue-600">
                                                                    <span className="font-semibold text-blue-500 mr-1 bg-blue-50 px-1 rounded">Receipt</span>
                                                                    <Eye size={12} />
                                                                </div>
                                                            </button>
                                                        )}

                                                        {/* Bill Display (Optional) */}
                                                        {slot.bill ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewFile(slot.bill)}
                                                                className="flex-1 flex items-center justify-between border border-slate-200 rounded-lg p-2 hover:border-emerald-400 hover:bg-emerald-50/5 text-left text-xs transition group"
                                                            >
                                                                <div className="flex items-center gap-2 truncate max-w-[80%]">
                                                                    <FileText size={14} className="text-emerald-500 shrink-0" />
                                                                    <span className="truncate text-slate-600 font-medium group-hover:text-emerald-600">{slot.bill.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0 text-[10px] text-slate-400 group-hover:text-emerald-600">
                                                                    <span className="font-medium text-slate-400 mr-1 bg-slate-100 px-1 rounded">Bill</span>
                                                                    <Eye size={12} />
                                                                </div>
                                                            </button>
                                                        ) : (
                                                            <div className="flex-1 border border-slate-100 border-dashed rounded-lg p-2 flex items-center justify-center text-[11px] text-slate-400 bg-slate-50/30">
                                                                No Optional Bill Uploaded
                                                            </div>
                                                        )}
                                                    </div>

                                                    {slot.description && (
                                                        <div className="mt-2.5 flex gap-1 bg-slate-50 border border-slate-100 rounded-md p-1.5 text-xs text-slate-500">
                                                            <span className="font-semibold shrink-0 text-slate-600">Note:</span>
                                                            <p className="break-all">{slot.description}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* B. Local Transport Review (Standard Layout) */}
                                {transportList.length > 0 && (
                                    <div className={`p-4 rounded-xl border ${COLOR_THEMES.transport.border} ${COLOR_THEMES.transport.bg}`}>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${COLOR_THEMES.transport.text}`}>
                                            Local Transport
                                        </span>
                                        <div className="mt-2.5 flex flex-col gap-2">
                                            {transportList.map((item, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setPreviewFile(item.file)}
                                                    className="w-full flex items-center justify-between border border-slate-200 bg-white rounded-lg p-2.5 hover:border-emerald-400 hover:bg-emerald-50/5 text-left text-xs transition group shadow-2xs"
                                                >
                                                    <div className="flex items-center gap-2 truncate max-w-[85%]">
                                                        <FileText size={14} className="text-emerald-500 shrink-0" />
                                                        <span className="truncate text-slate-600 font-medium group-hover:text-emerald-600">{item.file.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-600 shrink-0">
                                                        <span className="text-[10px]">Preview</span>
                                                        <Eye size={13} />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* C. Miscellaneous Review (Standard Layout with Description) */}
                                {miscList.length > 0 && (
                                    <div className={`p-4 rounded-xl border ${COLOR_THEMES.misc.border} ${COLOR_THEMES.misc.bg}`}>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${COLOR_THEMES.misc.text}`}>
                                            Miscellaneous Expenses
                                        </span>
                                        <div className="mt-2.5 flex flex-col gap-3">
                                            {miscList.map((item, i) => (
                                                <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewFile(item.file)}
                                                        className="w-full flex items-center justify-between border border-slate-100 bg-slate-50/30 rounded-md p-2 hover:border-amber-400 hover:bg-amber-50/5 text-left text-xs transition group"
                                                    >
                                                        <div className="flex items-center gap-2 truncate max-w-[85%]">
                                                            <FileText size={14} className="text-amber-500 shrink-0" />
                                                            <span className="truncate text-slate-600 font-semibold group-hover:text-amber-600">{item.file.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-slate-400 group-hover:text-amber-600 shrink-0">
                                                            <span className="text-[10px]">Preview</span>
                                                            <Eye size={13} />
                                                        </div>
                                                    </button>
                                                    {item.description && (
                                                        <div className="mt-2 flex gap-1.5 border border-amber-100 rounded-md p-2 text-xs text-amber-700 bg-amber-50/40">
                                                            <Paperclip size={12} className="shrink-0 mt-0.5" />
                                                            <div>
                                                                <span className="font-bold">Description:</span>
                                                                <p className="break-all mt-0.5 text-slate-600 leading-relaxed">{item.description}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Navigation buttons */}
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

            {/* ── MODAL FILE PREVIEW ── */}
            {previewFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        onClick={() => setPreviewFile(null)}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
                    />

                    {/* Modal body */}
                    <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col z-10 max-h-[85vh] overflow-hidden border border-slate-100 animate-in fade-in-50 zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
                            <div className="flex items-center gap-2 truncate max-w-[85%]">
                                <FileText size={16} className="text-violet-600 shrink-0" />
                                <span className="text-sm font-bold text-slate-800 truncate">{previewFile.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewFile(null)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* File Body Content */}
                        <div className="flex-1 p-5 overflow-auto flex items-center justify-center bg-slate-50/50">
                            {previewFile.type.startsWith("image/") ? (
                                <img
                                    src={previewUrl}
                                    alt="Receipt Preview"
                                    className="max-w-full max-h-[50vh] object-contain rounded-lg border border-slate-200"
                                />
                            ) : (
                                <div className="text-center p-8">
                                    <FileText size={48} className="text-slate-300 mx-auto mb-3" />
                                    <p className="text-xs text-slate-500 font-medium">No inline image preview available for this file type.</p>
                                    <span className="text-[10px] text-slate-400 mt-1 block">({previewFile.type})</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end text-xs text-slate-400">
                            File Size: {(previewFile.size / 1024).toFixed(1)} KB
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}