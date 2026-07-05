import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetch_policies, upload_policy, get_active_policies, deactivate_policy, archive_policy } from "../api/client";
import Activation_Conf_Modal from  "../components/activationConf";

export default function ManagePolicies() {
    const navigate = useNavigate();
    const [policies, setPolicies] = useState([]);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingPolicies, setFetchingPolicies] = useState(true); // Added to track table-loading state
    const [validFrom, setValidFrom] = useState("");
    const [validTo, setValidTo] = useState("");
    const [error, setError] = useState("");
    const [already_active, setAlreadyActive] = useState("");
    const [already_active_id, setAlreadyActiveId] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
   // const policy_id=undefined;

    const fetchPolicies = async () => {
        try {
            const data = await fetch_policies();
            setPolicies(data.policies);
        } catch (err) {
            console.error(err);
            setPolicies([]);
        } finally {
            setFetchingPolicies(false); // Disable table loader once data is retrieved
        }
    };
    useEffect(() => {
    fetchPolicies();
    }, []);

    const handleUploadPolicy = async () => {
        if (!file) return;
        if (validFrom > validTo) {
        setError("Valid From cannot be after Valid To");
        return;
}
        try {
            //setError("");
            setLoading(true);
            await upload_policy(file,validFrom,validTo);
            alert("Policy uploaded successfully");
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetchPolicies();
            setFile(null);
        } catch (err) {
            console.error(err);
            alert("Failed to upload policy");
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async ()=>{
        try {
            const data = await get_active_policies();
            console.log(data.active_policies);
            if(data.active_policies.length === 0){
                setAlreadyActive("");
                setShowModal(true);
            }
            else{
                setAlreadyActive(data.active_policies[0].policy_name);
                setAlreadyActiveId(data.active_policies[0].policy_id);
                setShowModal(true);
            }
        }
        catch (err) {
        console.error("Failed to fetch active policies", err);
        }
    }

    const handleDeactivate = async (active_policy_id)=>{
        try{
            await deactivate_policy(active_policy_id);
            alert("Policy Deactivated succesfully!");
            await fetchPolicies();
        }
        catch(err){
            alert("Deactivation failed!")
        }
    }
    const handleArchive = async (policy) => {
        try {
            // 1. Initial execution call (force: false)
            const res = await archive_policy(policy.policy_id, false);
            
            if (res.status === "requires_confirmation") {
                // 2. Ask user for confirmation using the backend's dynamic message
                if (window.confirm(res.message)) {
                    // 3. Force-archive execution call (force: true)
                    const forceRes = await archive_policy(policy.policy_id, true);
                    
                    if (forceRes.status === "success") {
                        alert(forceRes.message);
                        await fetchPolicies(); // Refresh the list
                    }
                }
            } else if (res.status === "success") {
                // 4. Case 3 execution path: Directly archived without alert confirmation
                alert(res.message);
                await fetchPolicies(); // Refresh the list
            }
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.detail || "Failed to archive the policy.");
        }
    };
    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900">

            {/* NAVBAR */}
            <nav className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm">
            <h1 className="text-lg font-semibold text-slate-800 tracking-wide">
                Manage Policies
            </h1>
            <div className="flex gap-3">
                <button
                onClick={() => navigate("/admin-dashboard")}
                className="px-4 py-2 rounded-lg text-sm bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                Back
                </button>
            </div>
            </nav>
            {/* MAIN CONTAINER */}
            <div className="max-w-7xl mx-auto px-8 py-8">
            {/* UPLOAD SECTION */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
                <h2 className="text-base font-semibold mb-4 text-slate-800">
                Upload New Policy
                </h2>
                <div className="flex flex-col gap-4">

                {/* File Upload */}
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="text-sm text-slate-600"
                />

                {/* Date Fields */}
                <div className="flex justify-between w-full text-sm text-slate-500 font-medium">
                    <div>Policy Valid From: </div>
                    <div>Policy Valid To: </div>
                </div>
                <div className="flex gap-4">
                    <input
                        type="date"
                        value={validFrom}
                        onChange={(e) => {setValidFrom(e.target.value); setError("")}}
                        className="flex-1 bg-white text-slate-700 p-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 transition"
                    />

                    <input
                        type="date"
                        value={validTo}
                        onChange={(e) =>{ setValidTo(e.target.value);setError("")}}
                        className="flex-1 bg-white text-slate-700 p-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 transition"
                    />
                    {error? (<p className="text-red-600 text-sm">{error}</p>):null}
                </div>
                {/* Upload Button */}
                <button
                    onClick={handleUploadPolicy}
                    disabled={!file || !validFrom || !validTo||error ||loading}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition w-fit
                    ${
                        !file || !validFrom || !validTo ||error|| loading
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                >
                    {loading ? "Uploading..." : "Upload Policy"}
                </button>
                </div>
            </div>
            
            <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">List of Existing Policies</p>
            </div>
            {/* TABLE SECTION */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* HEADER */}
                <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_2fr] items-center gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <div>Policy Name</div>
                    <div>Valid From</div>
                    <div>Valid Till</div>
                    <div>Created At</div>
                    <div>Status</div>
                    <div className="ml-6">Actions</div>
                </div>
                {/* ROWS */}
                {fetchingPolicies ? (
                <div className="flex items-center justify-center p-12 gap-2 text-slate-500">
                    <svg
                        className="w-5 h-5 animate-spin text-blue-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                                5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 
                                5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span className="text-sm font-medium">Loading policies...</span>
                </div>
                ) : policies.length === 0 ? (
                <div className="p-6 text-slate-400 text-sm">
                    No policies uploaded
                </div>
                ) : (
                policies.map((policy) => (
                    <div
                    key={policy.policy_id}
                    className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_2fr] items-center gap-4 px-6 py-4 border-t border-slate-100 text-sm"
                    >
                    {/* POLICY NAME (BIGGEST WIDTH) */}
                    <div className="pr-4 break-words text-slate-800 font-medium">
                        {policy.policy_name}
                    </div>

                    <div className="text-slate-500">
                        {policy.valid_from || "-"}
                    </div>

                    <div className="text-slate-500">
                        {policy.valid_till || "-"}
                    </div>

                    <div className="text-slate-500">
                        {policy.created_at
                        ? new Date(policy.created_at).toLocaleDateString()
                        : "-"}
                    </div>
                    <div>
                        {policy.is_active? (
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Active</span>
                        ):(
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Inactive</span>
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex justify-end gap-2 w-full">
                    {policy.is_active ? (
                    <button onClick={()=>{handleDeactivate(policy.policy_id)}}
                    className="w-28 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition">
                    Deactivate
                    </button>) : (
                    <button onClick={ ()=>{setSelectedPolicy(policy);handleActivate();}}
                    className="w-28 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition">
                    Activate
                    </button>
                    )}
                    <button className="w-24 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition"
                    onClick={()=>handleArchive(policy)}
                    >
                        Archive
                    </button>
                    </div>
                    </div>
                ))
                )}
            </div>
                {showModal && (
                    <Activation_Conf_Modal
                        already_active_id={already_active_id}
                        already_active={already_active}
                        setShowModal={setShowModal}
                        policy_id={selectedPolicy?.policy_id}
                        policy_path={selectedPolicy?.file_path}
                        refresh_policies={fetchPolicies}
                    />
                )}
            </div>
        </div>
    );
}