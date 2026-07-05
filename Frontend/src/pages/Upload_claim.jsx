// UploadClaim.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { submit_claim } from "../api/client";

// Sub-components
import StepBar from "../components/StepBar";
import DayForm from "../components/DayForm";
import ReviewStep, { formatDate, addDays } from "../components/ReviewStep";

export default function UploadClaim() {
    const navigate = useNavigate();
    const location = useLocation();
    const { travel_id, duration_days, start_date, end_date } = location.state || {};

    // Guard: if navigated to directly without state, redirect back
    if (!travel_id || !duration_days) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-500 text-sm mb-4">No travel data found. Please verify your travel dates first.</p>
                    <button
                        onClick={() => navigate("/employee-dashboard")}
                        className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-700 transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // State Hooks
    // Food structure: { receipt: File | null, bill: File | null, description: "" }
    // Standard structure: { file: File, description: "" }
    const [allDays, setAllDays] = useState(() => 
        Array.from({ length: duration_days }, () => ({
            food: [],      // array of { receipt: File, bill: File | null, description: "" }
            transport: [], // array of { file: File, description: "" }
            misc: []       // array of { file: File, description: "" }
        }))
    );
    const [currentDay, setCurrentDay] = useState(0);
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const currentDayStr = addDays(start_date, currentDay);

    // Calculate total Miscellaneous count across the entire claim (all days)
    const totalMiscCount = allDays.reduce((sum, day) => sum + (day.misc || []).length, 0);

    // ── Standard Category Handlers (Transport & Misc) ────────────────────────

    const handleAddFilesStandard = (category, files) => {
        setAllDays(prev => {
            const next = [...prev];
            const currentList = next[currentDay][category] || [];

            if (category === "transport") {
                if (currentList.length + files.length > 5) {
                    alert("Maximum of 5 local transport receipts allowed per day.");
                    return prev;
                }
            } else if (category === "misc") {
                if (totalMiscCount + files.length > 3) {
                    alert("Maximum of 3 miscellaneous claims allowed across the entire trip.");
                    return prev;
                }
            }

            const newEntries = files.map(f => ({ file: f, description: "" }));
            next[currentDay] = {
                ...next[currentDay],
                [category]: [...currentList, ...newEntries]
            };
            return next;
        });
    };

    const handleRemoveFileStandard = (category, index) => {
        setAllDays(prev => {
            const next = [...prev];
            next[currentDay] = {
                ...next[currentDay],
                [category]: (next[currentDay][category] || []).filter((_, i) => i !== index)
            };
            return next;
        });
    };

    const handleDescChangeStandard = (category, index, value) => {
        setAllDays(prev => {
            const next = [...prev];
            const updatedCategory = [...(next[currentDay][category] || [])];
            updatedCategory[index] = {
                ...updatedCategory[index],
                description: value
            };
            next[currentDay] = {
                ...next[currentDay],
                [category]: updatedCategory
            };
            return next;
        });
    };

    // ── Food Category Handlers (Dual File Slots) ─────────────────────────────

    const handleAddFoodSlot = () => {
        setAllDays(prev => {
            const next = [...prev];
            const foodList = next[currentDay].food || [];
            if (foodList.length >= 4) {
                alert("Maximum of 4 food expense entries allowed per day.");
                return prev;
            }
            next[currentDay] = {
                ...next[currentDay],
                food: [...foodList, { receipt: null, bill: null, description: "" }]
            };
            return next;
        });
    };

    const handleUploadFoodFile = (slotIndex, role, file) => {
        setAllDays(prev => {
            const next = [...prev];
            const foodList = [...(next[currentDay].food || [])];
            foodList[slotIndex] = {
                ...foodList[slotIndex],
                [role]: file
            };
            next[currentDay] = {
                ...next[currentDay],
                food: foodList
            };
            return next;
        });
    };

    const handleRemoveFoodFile = (slotIndex, role) => {
        setAllDays(prev => {
            const next = [...prev];
            const foodList = [...(next[currentDay].food || [])];
            foodList[slotIndex] = {
                ...foodList[slotIndex],
                [role]: null
            };
            next[currentDay] = {
                ...next[currentDay],
                food: foodList
            };
            return next;
        });
    };

    const handleRemoveFoodSlot = (slotIndex) => {
        setAllDays(prev => {
            const next = [...prev];
            next[currentDay] = {
                ...next[currentDay],
                food: (next[currentDay].food || []).filter((_, i) => i !== slotIndex)
            };
            return next;
        });
    };

    const handleFoodDescChange = (slotIndex, value) => {
        setAllDays(prev => {
            const next = [...prev];
            const foodList = [...(next[currentDay].food || [])];
            foodList[slotIndex] = {
                ...foodList[slotIndex],
                description: value
            };
            next[currentDay] = {
                ...next[currentDay],
                food: foodList
            };
            return next;
        });
    };

    // ── Navigation ──────────────────────────────────────────────────────────

    const handleNext = () => {
        if (currentDay < duration_days - 1) {
            setCurrentDay(currentDay + 1);
        } else {
            setStep(2);
        }
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
            setCurrentDay(duration_days - 1);
        } else if (currentDay > 0) {
            setCurrentDay(currentDay - 1);
        } else {
            navigate("/employee-dashboard");
        }
    };

    // ── Submit payload compilation ───────────────────────────────────────────

    const handleSubmit = async () => {
        try {
            setSubmitting(true);

            const formData = new FormData();
            const metaArray = [];

            formData.append("travel_id", travel_id);

            allDays.forEach((dayUploads, dayIndex) => {
                const claimDate = addDays(start_date, dayIndex);

                // 1. Process Food (Split receipt and bill, assign file_role)
                (dayUploads.food || []).forEach(slot => {
                    if (slot.receipt) {
                        formData.append("files", slot.receipt);
                        metaArray.push({
                            day_number: dayIndex + 1,
                            claim_date: claimDate,
                            category: "food",
                            description: slot.description || null,
                            file_role: "receipt"
                        });
                    }
                    if (slot.bill) {
                        formData.append("files", slot.bill);
                        metaArray.push({
                            day_number: dayIndex + 1,
                            claim_date: claimDate,
                            category: "food",
                            description: slot.description || null,
                            file_role: "bill"
                        });
                    }
                });

                // 2. Process Transport (Standard file_role is "receipt")
                (dayUploads.transport || []).forEach(u => {
                    formData.append("files", u.file);
                    metaArray.push({
                        day_number: dayIndex + 1,
                        claim_date: claimDate,
                        category: "transport",
                        description: u.description || null,
                        file_role: "receipt"
                    });
                });

                // 3. Process Misc (Standard file_role is "receipt")
                (dayUploads.misc || []).forEach(u => {
                    formData.append("files", u.file);
                    metaArray.push({
                        day_number: dayIndex + 1,
                        claim_date: claimDate,
                        category: "misc",
                        description: u.description || null,
                        file_role: "receipt"
                    });
                });
            });

            formData.append("metadata", JSON.stringify(metaArray));

            await submit_claim(formData);
            navigate("/employee-dashboard/my-claims");

        } catch (err) {
            console.error(err);
            alert("Submission failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    const stepBarCurrent = step === 2 ? 2 : 1;
    const dayLabel = `Day ${currentDay + 1} — ${formatDate(currentDayStr)}`;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            {/* NAVBAR */}
            <nav className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
                <h1 className="text-lg font-semibold text-slate-800 tracking-wide">Upload Claim</h1>
                <button
                    onClick={() => navigate("/employee-dashboard")}
                    className="px-4 py-2 rounded-md bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition text-sm"
                >
                    Cancel
                </button>
            </nav>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col items-center px-4 py-10">
                <div className="w-full max-w-2xl">
                    {/* Trip summary pill */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 text-xs text-slate-500 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                            {formatDate(start_date)} — {formatDate(end_date)}
                            <span className="text-slate-300">|</span>
                            {duration_days} day{duration_days > 1 ? "s" : ""}
                        </div>
                    </div>

                    {/* Step bar */}
                    <StepBar
                        current={stepBarCurrent}
                        total={3}
                        currentDayLabel={step === 1 ? dayLabel : null}
                    />

                    {/* Day progress dots */}
                    {step === 1 && duration_days > 1 && (
                        <div className="flex items-center justify-center gap-2 mb-6">
                            {Array.from({ length: duration_days }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`rounded-full transition-all
                                        ${i === currentDay
                                            ? "w-6 h-2 bg-violet-600"
                                            : i < currentDay
                                                ? "w-2 h-2 bg-violet-300"
                                                : "w-2 h-2 bg-slate-200"
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Main content card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        {step === 1 && (
                            <>
                                <div className="mb-5">
                                    <h2 className="text-base font-semibold text-slate-800">
                                        Day {currentDay + 1} — {formatDate(currentDayStr)}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Upload receipts for each expense category below.
                                    </p>
                                </div>
                                <DayForm
                                    dayIndex={currentDay}
                                    dateStr={currentDayStr}
                                    dayUploads={allDays[currentDay]}
                                    totalMiscCount={totalMiscCount}
                                    
                                    // Standard Handlers
                                    onAddFiles={handleAddFilesStandard}
                                    onRemoveFile={handleRemoveFileStandard}
                                    onDescChange={handleDescChangeStandard}

                                    // Food Handlers
                                    onAddFoodSlot={handleAddFoodSlot}
                                    onUploadFoodFile={handleUploadFoodFile}
                                    onRemoveFoodFile={handleRemoveFoodFile}
                                    onRemoveFoodSlot={handleRemoveFoodSlot}
                                    onFoodDescChange={handleFoodDescChange}

                                    onNext={handleNext}
                                    onBack={handleBack}
                                    isLastDay={currentDay === duration_days - 1}
                                />
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="mb-5">
                                    <h2 className="text-base font-semibold text-slate-800">Review your claim</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Check everything before submitting. Validation runs in the background.
                                    </p>
                                </div>
                                <ReviewStep
                                    allDays={allDays}
                                    startDate={start_date}
                                    onBack={handleBack}
                                    onSubmit={handleSubmit}
                                    submitting={submitting}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}