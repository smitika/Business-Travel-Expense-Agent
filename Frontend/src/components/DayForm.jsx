// DayForm.jsx
import React from "react";
import { ChevronLeft, ChevronRight, Upload, X, FileText, Plus, AlertCircle } from "lucide-react";

export const CATEGORIES = [
    { key: "food",      label: "Food",            color: "blue",     hint: "Meals, beverages, restaurant bills (Max 4 entries per day)" },
    { key: "transport", label: "Local Transport",  color: "emerald",  hint: "Cab, auto, metro, fuel receipts (Max 5 per day)" },
    { key: "misc",      label: "Miscellaneous",    color: "amber",    hint: "Any other claimable expense — description required (Max 3 per trip)" },
];

export default function DayForm({
    dayIndex,
    dateStr,
    dayUploads,
    totalMiscCount,
    
    // Standard handlers
    onAddFiles,
    onRemoveFile,
    onDescChange,

    // Food handlers
    onAddFoodSlot,
    onUploadFoodFile,
    onRemoveFoodFile,
    onRemoveFoodSlot,
    onFoodDescChange,

    onNext,
    onBack,
    isLastDay
}) {
    const currentUploads = dayUploads || {};

    // Standard Category Helpers
    const transportList = currentUploads.transport || [];
    const miscList = currentUploads.misc || [];
    const foodList = currentUploads.food || [];

    // Verification check to proceed
    const hasAnyFile = foodList.some(f => f.receipt) || transportList.length > 0 || miscList.length > 0;
    const miscMissingDesc = miscList.some(u => !u.description || u.description.trim().length < 5);
    const foodMissingReceipt = foodList.some(f => !f.receipt);

    const canProceed = hasAnyFile && !miscMissingDesc && !foodMissingReceipt;

    return (
        <div className="flex flex-col gap-6">

            {/* 1. FOOD CATEGORY SECTION */}
            <div className="border border-slate-200 rounded-xl p-5 bg-blue-50/10">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Food</span>
                        <p className="text-xs text-slate-400 mt-0.5">{CATEGORIES[0].hint}</p>
                    </div>
                    {foodList.length < 4 && (
                        <button
                            type="button"
                            onClick={onAddFoodSlot}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition rounded-lg"
                        >
                            <Plus size={14} /> Add Meal Slot
                        </button>
                    )}
                </div>

                {foodList.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-white mt-3">
                        <p className="text-xs text-slate-400">No meals logged for today. Click "Add Meal Slot" to log an expense.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 mt-3">
                        {foodList.map((slot, index) => (
                            <div key={index} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm relative">
                                <button
                                    type="button"
                                    onClick={() => onRemoveFoodSlot(index)}
                                    className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition"
                                    title="Delete this meal slot"
                                >
                                    <X size={15} />
                                </button>

                                <span className="text-xs font-semibold text-slate-500">Meal Slot #{index + 1}</span>

                                {/* Inner Receipt and Bill containers */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                    
                                    {/* Slot A: Mandatory Receipt */}
                                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-slate-700">Mandatory Receipt</span>
                                            {!slot.receipt && (
                                                <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200 font-medium">Required</span>
                                            )}
                                        </div>

                                        {slot.receipt ? (
                                            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm text-xs">
                                                <div className="flex items-center gap-2 truncate max-w-[80%]">
                                                    <FileText size={15} className="text-blue-500 shrink-0" />
                                                    <span className="truncate font-medium text-slate-600">{slot.receipt.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveFoodFile(index, "receipt")}
                                                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg p-4 bg-white hover:border-blue-400 hover:bg-blue-50/5 cursor-pointer transition">
                                                <Upload size={16} className="text-slate-400 mb-1" />
                                                <span className="text-[11px] text-slate-500 font-medium">Upload Receipt</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            onUploadFoodFile(index, "receipt", e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>

                                    {/* Slot B: Optional Bill */}
                                    <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-slate-700">Optional Bill</span>
                                            <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                                        </div>

                                        {slot.bill ? (
                                            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm text-xs">
                                                <div className="flex items-center gap-2 truncate max-w-[80%]">
                                                    <FileText size={15} className="text-emerald-500 shrink-0" />
                                                    <span className="truncate font-medium text-slate-600">{slot.bill.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveFoodFile(index, "bill")}
                                                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg p-4 bg-white hover:border-emerald-400 hover:bg-emerald-50/5 cursor-pointer transition">
                                                <Upload size={16} className="text-slate-400 mb-1" />
                                                <span className="text-[11px] text-slate-500 font-medium">Upload Bill</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            onUploadFoodFile(index, "bill", e.target.files[0]);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>

                                </div>

                                {/* Optional Description */}
                                <div className="mt-3.5">
                                    <input
                                        type="text"
                                        placeholder="Optional description (e.g., Dinner with client)"
                                        value={slot.description}
                                        onChange={(e) => onFoodDescChange(index, e.target.value)}
                                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. LOCAL TRANSPORT SECTION */}
            <div className="border border-slate-200 rounded-xl p-5 bg-emerald-50/10">
                <div>
                    <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Local Transport</span>
                    <p className="text-xs text-slate-400 mt-0.5">{CATEGORIES[1].hint}</p>
                </div>

                {transportList.length < 5 && (
                    <label className="mt-3 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-5 bg-white hover:border-emerald-400 hover:bg-emerald-50/5 cursor-pointer transition">
                        <Upload size={18} className="text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500 font-medium">Upload Local Transport Receipt</span>
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files) {
                                    onAddFiles("transport", Array.from(e.target.files));
                                }
                            }}
                        />
                    </label>
                )}

                {/* Plain Text File List */}
                {transportList.length > 0 && (
                    <div className="flex flex-col gap-2 mt-3">
                        {transportList.map((item, index) => (
                            <div key={index} className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-3 py-2.5 shadow-sm text-xs">
                                <div className="flex items-center gap-2 truncate max-w-[85%]">
                                    <FileText size={15} className="text-emerald-500 shrink-0" />
                                    <span className="truncate font-medium text-slate-600">{item.file.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveFile("transport", index)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. MISCELLANEOUS SECTION */}
            <div className="border border-slate-200 rounded-xl p-5 bg-amber-50/10">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Miscellaneous</span>
                        <p className="text-xs text-slate-400 mt-0.5">{CATEGORIES[2].hint}</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                        Total Added: {totalMiscCount} / 3
                    </span>
                </div>

                {totalMiscCount < 3 && (
                    <label className="mt-3 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-5 bg-white hover:border-amber-400 hover:bg-amber-50/5 cursor-pointer transition">
                        <Upload size={18} className="text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500 font-medium">Upload Miscellaneous Receipt</span>
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files) {
                                    onAddFiles("misc", Array.from(e.target.files));
                                }
                            }}
                        />
                    </label>
                )}

                {/* Plain Text File List with Mandatory Description */}
                {miscList.length > 0 && (
                    <div className="flex flex-col gap-3 mt-3">
                        {miscList.map((item, index) => (
                            <div key={index} className="border border-slate-200 bg-white rounded-xl p-3.5 shadow-sm">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 truncate max-w-[85%]">
                                        <FileText size={15} className="text-amber-500 shrink-0" />
                                        <span className="truncate font-semibold text-slate-700">{item.file.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveFile("misc", index)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition shrink-0"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="mt-2.5">
                                    <input
                                        type="text"
                                        placeholder="Mandatory description (minimum 5 characters)"
                                        value={item.description}
                                        onChange={(e) => onDescChange("misc", index, e.target.value)}
                                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-amber-400 transition"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Validation warning prompts */}
            {foodMissingReceipt && foodList.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Every logged food meal requires a mandatory receipt before you can proceed.</span>
                </div>
            )}

            {miscMissingDesc && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Each miscellaneous upload needs a description (at least 5 characters).</span>
                </div>
            )}

            {!hasAnyFile && (
                <p className="text-xs text-slate-400 text-center">Upload at least one receipt to continue.</p>
            )}

            {/* Navigation Buttons */}
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