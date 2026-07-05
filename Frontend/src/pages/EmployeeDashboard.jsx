import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { FileText, MapPin, X, Loader2, Upload, ClipboardList } from "lucide-react";
import { create_employee_travel_session, validate_travel } from "../api/client";

export default function EmployeeDashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const emp_id = location.state?.empId;

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loadingValidate, setLoadingValidate] = useState(false);
    const [loadingTravel, setLoadingTravel] = useState(false);
    const [error, setError] = useState("");

    const emp_name = localStorage.getItem("emp_name");

    const handleUploadModalClose = () => {
        setShowUploadModal(false);
        setStartDate("");
        setEndDate("");
        setError("");
    };

    const handleValidateTravel = async () => {
        if (!startDate || !endDate) {
            setError("Please enter both dates.");
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            setError("End date cannot be before start date.");
            return;
        }
        try {
            setLoadingValidate(true);
            setError("");
            const res = await validate_travel({start_date: startDate, end_date: endDate });
            if (!res.valid) {
                setError(res.message || "No matching travel request found for these dates.");
                return;
            }
            handleUploadModalClose();
            navigate("/employee-dashboard/upload-claim", {
                state: {
                    travel_id: res.travel_id,
                    duration_days: res.duration_days,
                    start_date: startDate,
                    end_date: endDate,
                },
            });
        } catch (err) {
            const errorMsg = err.response?.data?.detail || "Validation failed. Please try again.";
            setError(errorMsg);
        } finally {
            setLoadingValidate(false);
        }
    };

    const handleTravelSession = async () => {
        try {
            setLoadingTravel(true);
            const res = await create_employee_travel_session();
            sessionStorage.setItem("employee_travel_session", JSON.stringify(res));
            navigate("/employee-dashboard/travel-chat");
        } catch (err) {
            console.error(err);
            alert("Failed to create session. No active policy may be assigned.");
        } finally {
            setLoadingTravel(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">

            {/* NAVBAR */}
            <nav className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
                <h1 className="text-lg font-semibold text-slate-800 tracking-wide">Employee Portal</h1>
                <h1 className="text-lg font-semibold text-slate-800 tracking-wide">Welcome {emp_name}!</h1>
                <button
                    onClick={() => navigate("/")}
                    className="px-4 py-2 rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition text-sm"
                >
                    Logout
                </button>
            </nav>

            {/* MAIN */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <p className="text-slate-400 text-sm mb-10 tracking-wide uppercase">
                    What would you like help with?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl">
                    {/* CARD 1 — General Travel */}
                    <button
                        onClick={handleTravelSession}
                        disabled={loadingTravel}
                        className="group bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-7 text-left transition-all duration-200 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-5 group-hover:bg-emerald-100 transition">
                            {loadingTravel
                                ? <Loader2 size={22} className="text-emerald-600 animate-spin" />
                                : <MapPin size={22} className="text-emerald-600" />
                            }
                        </div>
                        <h2 className="text-base font-semibold text-slate-800 mb-2">Plan / General Queries</h2>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Ask about travel policies, allowances, or plan an upcoming trip.
                        </p>
                    </button>

                    {/* CARD 2 — Upload Claim */}
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="group bg-white border border-slate-200 hover:border-violet-400 rounded-2xl p-7 text-left transition-all duration-200 hover:shadow-md"
                    >
                        <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center mb-5 group-hover:bg-violet-100 transition">
                            <Upload size={22} className="text-violet-600" />
                        </div>
                        <h2 className="text-base font-semibold text-slate-800 mb-2">Upload Claim</h2>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Upload receipts and supporting documents for expense reimbursement.
                        </p>
                    </button>

                    {/* CARD 3 — My Claims */}
                    <button
                        onClick={() => navigate("/employee-dashboard/my-claims")}
                        className="group bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-7 text-left transition-all duration-200 hover:shadow-md"
                    >
                        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-5 group-hover:bg-amber-100 transition">
                            <ClipboardList size={22} className="text-amber-600" />
                        </div>
                        <h2 className="text-base font-semibold text-slate-800 mb-2">My Claims</h2>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Track submitted claims and view approval, rejection, or review status.
                        </p>
                    </button>
                </div>
            </div>

            {/* UPLOAD CLAIM DATE MODAL */}
            {showUploadModal && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={handleUploadModalClose}
                >
                    <div
                        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                                    <Upload size={16} className="text-violet-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-slate-800">Verify Travel Dates</h2>
                            </div>
                            <button
                                onClick={handleUploadModalClose}
                                className="text-slate-400 hover:text-slate-700 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                            Enter your travel dates to verify the trip and load the applicable policy before uploading receipts.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1.5 block">Travel Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-violet-500 transition"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1.5 block">Travel End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-violet-500 transition"
                                />
                            </div>
                        </div>

                        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

                        <button
                            onClick={handleValidateTravel}
                            disabled={loadingValidate}
                            className={`mt-5 w-full py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2
                                ${loadingValidate
                                    ? "bg-violet-300 text-white cursor-not-allowed"
                                    : "bg-violet-600 hover:bg-violet-700 text-white"
                                }`}
                        >
                            {loadingValidate
                                ? <><Loader2 size={15} className="animate-spin" /> Verifying...</>
                                : "Verify & Continue"
                            }
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
