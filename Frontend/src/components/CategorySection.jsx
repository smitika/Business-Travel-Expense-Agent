// CategorySection.jsx
import React, { useRef } from "react";
import { Upload } from "lucide-react";
import Thumbnail from "./Thumbnail";

export const COLOR = {
    blue:    { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",   btn: "bg-blue-600 hover:bg-blue-700",   ring: "focus:border-blue-400" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700", ring: "focus:border-emerald-400" },
    amber:   { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700",  btn: "bg-amber-600 hover:bg-amber-700",  ring: "focus:border-amber-400" },
};

export default function CategorySection({ cat, dayUploads, onAddFiles, onRemoveFile, onDescChange }) {
    const fileRef = useRef();
    const c       = COLOR[cat.color];
    const uploads = dayUploads[cat.key] || [];

    return (
        <div className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
            <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${c.text}`}>{cat.label}</span>
                <span className="text-xs text-slate-400">{uploads.length} file{uploads.length !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">{cat.hint}</p>

            {/* Thumbnails */}
            {uploads.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                    {uploads.map((u, i) => (
                        <div key={i} className="flex flex-col gap-1.5">
                            <Thumbnail
                                file={u.file}
                                onRemove={() => onRemoveFile(cat.key, i)}
                            />
                            {cat.key === "misc" && (
                                <input
                                    type="text"
                                    placeholder="Describe this item…"
                                    value={u.description}
                                    onChange={(e) => onDescChange(cat.key, i, e.target.value)}
                                    className={`w-20 text-[10px] px-2 py-1 rounded-lg border border-slate-300 outline-none ${c.ring} bg-white text-slate-700 placeholder-slate-400`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}

            <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) {
                        onAddFiles(cat.key, Array.from(e.target.files));
                        e.target.value = "";
                    }
                }}
            />
            <button
                onClick={() => fileRef.current.click()}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white transition ${c.btn}`}
            >
                <Upload size={13} /> Upload receipts
            </button>
        </div>
    );
}