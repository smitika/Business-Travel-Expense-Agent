// Thumbnail.jsx
import React from "react";
import { X, ImageIcon } from "lucide-react";

export default function Thumbnail({ file, onRemove }) {
    const url = URL.createObjectURL(file);
    const isImage = file.type.startsWith("image/");

    return (
        <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
            {isImage ? (
                <img src={url} alt={file.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
                    <ImageIcon size={20} className="text-slate-400" />
                    <span className="text-[9px] text-slate-500 text-center leading-tight break-all line-clamp-2">
                        {file.name}
                    </span>
                </div>
            )}
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                    <X size={10} />
                </button>
            )}
        </div>
    );
}