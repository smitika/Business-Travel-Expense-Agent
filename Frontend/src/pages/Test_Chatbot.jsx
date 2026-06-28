import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetch_policies, create_admin_session } from "../api/client";
import ChatWindow from "../components/ChatWindow";

export default function Test_Chatbot() {
    const navigate = useNavigate();
    const [policies, setPolicies] = useState([]);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(false);

    // fetch policies
    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                const res = await fetch_policies();
                setPolicies(res.policies);
            } catch (err) {
                console.error("Failed to fetch policies", err);
            }
        };
        fetchPolicies();
    }, []);

    // restore session from sessionStorage
    useEffect(() => {
        const saved = sessionStorage.getItem("admin_session");
        if (saved) setSessionData(JSON.parse(saved));
    }, []);

    const handleCreateSession = async () => {
        if (!selectedPolicy) return;
        try {
            setLoading(true);
            const res = await create_admin_session({ policy_id: selectedPolicy.policy_id });
            setSessionData(res);
            sessionStorage.setItem("admin_session", JSON.stringify(res));
        } catch (err) {
            console.error("Failed to create session", err);
            alert("Failed to create session");
        } finally {
            setLoading(false);
        }
    };

    const handleEndSession = () => {
        setSessionData(null);
        setSelectedPolicy(null);
        sessionStorage.removeItem("admin_session");
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-white flex flex-col">

            {/* NAVBAR */}
            <nav className="h-14 bg-[#F8FAFC] border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
                <h1 className="text-lg font-semibold text-gray-700 tracking-wide">Test Chatbot</h1>
                <button
                    onClick={() => navigate("/admin-dashboard")}
                    className="px-4 py-2 rounded-md bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition text-sm"
                >
                    Back
                </button>
            </nav>

            {/* CONTROL BAR */}
            <div className="px-6 py-3 border-b border-slate-200 flex justify-center shrink-0">
                <div className="flex items-center gap-4">
                    <select
                        value={selectedPolicy?.policy_id || ""}
                        onChange={(e) => {
                            const policy = policies.find(
                                (p) => p.policy_id === parseInt(e.target.value)
                            );
                            setSelectedPolicy(policy);
                        }}
                        disabled={!!sessionData}
                        className="bg-[#F8FAFC] border border-slate-200 text-slate-500 px-4 py-2 rounded-md text-sm w-[420px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Select policy to test</option>
                        {policies.map((p) => (
                            <option key={p.policy_id} value={p.policy_id}>
                                {p.policy_name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={handleCreateSession}
                        disabled={!selectedPolicy || !!sessionData || loading}
                        className={`px-5 py-2 text-sm rounded-md transition min-w-[130px] flex items-center justify-center gap-2
                            ${selectedPolicy && !sessionData && !loading
                                ? "bg-emerald-600 hover:bg-emerald-500"
                                : "bg-gray-600 cursor-not-allowed opacity-60"
                            }`}
                    >
                        {loading ? (
                            <>
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Starting...
                            </>
                        ) : "Create Session"}
                    </button>
                </div>
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <ChatWindow
                    sessionData={sessionData}
                    storageKey="admin_test"
                    onEndSession={handleEndSession}
                />
            </div>

        </div>
    );
}
