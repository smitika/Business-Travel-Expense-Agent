import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FileText, MapPin, X, Loader2 } from "lucide-react";
import { create_employee_claim_session, create_employee_travel_session } from "../api/client";

export default function EmployeeDashboard() {
    const navigate = useNavigate();

    // modal state for claim query
    const [showDateModal, setShowDateModal] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loadingClaim, setLoadingClaim] = useState(false);
    const [loadingTravel, setLoadingTravel] = useState(false);
    const [error, setError] = useState("");

    const handleClaimSubmit = async () => {
        if (!startDate || !endDate) {
            setError("Please enter both dates.");
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            setError("End date cannot be before start date.");
            return;
        }
        try {
            setLoadingClaim(true);
            setError("");
            const res = await create_employee_claim_session({
                travel_start: startDate,
                travel_end: endDate,
            });
            sessionStorage.setItem("employee_claim_session", JSON.stringify(res));
            setShowDateModal(false);
            navigate("/employee-dashboard/claim-chat");
        } catch (err) {
            console.error(err);
            setError("Failed to create session. Try again.");
        } finally {
            setLoadingClaim(false);
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
        <div className="min-h-screen bg-[#111827] text-white flex flex-col">

            {/* NAVBAR */}
            <nav className="h-14 bg-[#1E293B] border-b border-gray-700 px-6 flex items-center justify-between shrink-0">
                <h1 className="text-xl font-semibold tracking-wide">EMPLOYEE PORTAL</h1>
                <button
                    onClick={() => navigate("/")}
                    className="px-4 py-2 rounded-md bg-red-700 hover:bg-red-600 transition text-sm"
                >
                    Logout
                </button>
            </nav>

            {/* MAIN */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <p className="text-gray-400 text-sm mb-10 tracking-wide uppercase">
                    What would you like help with?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">

                    {/* CARD 1 — Claim Queries */}
                    <button
                        onClick={() => setShowDateModal(true)}
                        className="group bg-[#1E293B] border border-gray-700 hover:border-blue-500 rounded-2xl p-7 text-left transition-all duration-200 hover:shadow-lg hover:shadow-blue-900/20"
                    >
                        <div className="w-11 h-11 rounded-xl bg-blue-600/20 flex items-center justify-center mb-5 group-hover:bg-blue-600/30 transition">
                            <FileText size={22} className="text-blue-400" />
                        </div>
                        <h2 className="text-base font-semibold text-white mb-2">
                            Post-Travel Claims
                        </h2>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Submit or check reimbursement eligibility for a completed trip. Enter your travel dates to get started.
                        </p>
                    </button>

                    {/* CARD 2 — General Travel */}
                    <button
                        onClick={handleTravelSession}
                        disabled={loadingTravel}
                        className="group bg-[#1E293B] border border-gray-700 hover:border-emerald-500 rounded-2xl p-7 text-left transition-all duration-200 hover:shadow-lg hover:shadow-emerald-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <div className="w-11 h-11 rounded-xl bg-emerald-600/20 flex items-center justify-center mb-5 group-hover:bg-emerald-600/30 transition">
                            {loadingTravel
                                ? <Loader2 size={22} className="text-emerald-400 animate-spin" />
                                : <MapPin size={22} className="text-emerald-400" />
                            }
                        </div>
                        <h2 className="text-base font-semibold text-white mb-2">
                            Plan / General Queries
                        </h2>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Ask about travel policies, allowances, or plan an upcoming trip in line with company guidelines.
                        </p>
                    </button>

                </div>
            </div>

            {/* DATE MODAL */}
            {showDateModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => { setShowDateModal(false); setError(""); }}
                >
                    <div
                        className="bg-[#1E293B] border border-gray-700 rounded-2xl w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-sm font-semibold text-white">Enter Travel Dates</h2>
                            <button
                                onClick={() => { setShowDateModal(false); setError(""); }}
                                className="text-gray-400 hover:text-white transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                            Your travel dates help us identify the applicable policy for your claim.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1.5 block">Travel Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-[#0F172A] border border-gray-700 text-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500 transition"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1.5 block">Travel End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-[#0F172A] border border-gray-700 text-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500 transition"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 mt-3">{error}</p>
                        )}

                        <button
                            onClick={handleClaimSubmit}
                            disabled={loadingClaim}
                            className={`mt-5 w-full py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2
                                ${loadingClaim
                                    ? "bg-blue-700 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-500"
                                }`}
                        >
                            {loadingClaim ? (
                                <><Loader2 size={15} className="animate-spin" /> Creating session...</>
                            ) : "Start Claim Session"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
