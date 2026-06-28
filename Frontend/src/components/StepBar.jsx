// StepBar.jsx
import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function StepBar({ current, total, currentDayLabel }) {
    const steps = ["Verify Dates", "Fill Claims", "Review & Submit"];
    // current: 0 = dates, 1 = fill claims, 2 = review & submit

    return (
        <div className="flex items-center justify-center gap-0 mb-8">
            {steps.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={i} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all
                                ${done ? "bg-violet-600 border-violet-600 text-white"
                                : active ? "bg-white border-violet-600 text-violet-600"
                                          : "bg-white border-slate-300 text-slate-400"}`}>
                                {done ? <CheckCircle2 size={16} /> : i + 1}
                            </div>
                            <span className={`text-xs mt-1.5 font-medium whitespace-nowrap
                                ${active ? "text-violet-600" : done ? "text-slate-500" : "text-slate-400"}`}>
                                {active && i === 1 && currentDayLabel ? currentDayLabel : label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-16 sm:w-24 h-0.5 mx-1 mb-5 transition-all
                                ${done ? "bg-violet-600" : "bg-slate-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}