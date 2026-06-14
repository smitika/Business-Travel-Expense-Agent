import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetch_policies, upload_policy, get_active_policies, deactivate_policy } from "../api/client";
import Activation_Conf_Modal from  "../components/activationConf";

export default function ManagePolicies() {
    const navigate = useNavigate();
    const [policies, setPolicies] = useState([]);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
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
    return (
        <div className="min-h-screen bg-[#111827] text-white">

            {/* NAVBAR */}
            <nav className="h-16 bg-[#1E293B] border-b border-gray-700 px-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-wide">
                MANAGE POLICIES
            </h1>
            <div className="flex gap-3">
                <button
                onClick={() => navigate("/admin-dashboard")}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 transition"
                >
                Back
                </button>
            </div>
            </nav>
            {/* MAIN CONTAINER */}
            <div className="max-w-7xl mx-auto px-8 py-8">
            {/* UPLOAD SECTION */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-2xl p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">
                Upload New Policy
                </h2>
                <div className="flex flex-col gap-4">

                {/* File Upload */}
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="text-sm text-gray-300"
                />

                {/* Date Fields */}
                <div className="flex justify-between w-full">
                    <div>Policy Valid From: </div>
                    <div>Policy Valid To: </div>
                </div>
                <div className="flex gap-4">
                    <input
                        type="date"
                        value={validFrom}
                        onChange={(e) => {setValidFrom(e.target.value); setError("")}}
                        className="flex-1 bg-gray-800 text-gray-200 p-2 rounded-lg border border-gray-600"
                    />

                    <input
                        type="date"
                        value={validTo}
                        onChange={(e) =>{ setValidTo(e.target.value);setError("")}}
                        className="flex-1 bg-gray-800 text-gray-200 p-2 rounded-lg border border-gray-600"
                    />
                    {error? (<p className="text-red-700">{error}</p>):null}
                </div>
                {/* Upload Button */}
                <button
                    onClick={handleUploadPolicy}
                    disabled={!file || !validFrom || !validTo||error ||loading}
                    className={`px-6 py-2 rounded-lg font-medium transition w-fit
                    ${
                        !file || !validFrom || !validTo ||error|| loading
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500"
                    }`}
                >
                    {loading ? "Uploading..." : "Upload Policy"}
                </button>
                </div>
            </div>
            
            <div className="bg-slate-400 mb-5 text-2xl text-center rounded-2xl py-3 uppercase font-semibold font-serif">
                <p className="text-black">List Of Existing Policies</p>
            </div>
            {/* TABLE SECTION */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-2xl overflow-hidden">
                {/* HEADER */}
                <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_2fr] items-center gap-4 px-6 py-4 border-t border-gray-700 bg-gray-600">
                    <div>Policy Name</div>
                    <div>Valid From</div>
                    <div>Valid Till</div>
                    <div>Created At</div>
                    <div>Status</div>
                    <div className="ml-6">Actions</div>
                </div>
                {/* ROWS */}
                {policies.length === 0 ? (
                <div className="p-6 text-gray-400">
                    No policies uploaded
                </div>
                ) : (
                policies.map((policy) => (
                    <div
                    key={policy.policy_id}
                    className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_2fr] items-center gap-4 px-6 py-4 border-t border-gray-700"
                    >
                    {/* POLICY NAME (BIGGEST WIDTH) */}
                    <div className="pr-4 break-words">
                        {policy.policy_name}
                    </div>

                    <div>
                        {policy.valid_from || "-"}
                    </div>

                    <div>
                        {policy.valid_till || "-"}
                    </div>

                    <div>
                        {policy.created_at
                        ? new Date(policy.created_at).toLocaleDateString()
                        : "-"}
                    </div>
                    <div>
                        {policy.is_active? "Active":"Inactive"}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex justify-end gap-2 w-full">
                    {policy.is_active ? (
                    <button onClick={()=>{handleDeactivate(policy.policy_id)}}
                    className="w-28 px-3 py-1 text-sm rounded bg-yellow-600 hover:bg-yellow-500 transition">
                    Deactivate
                    </button>) : (
                    <button onClick={ ()=>{setSelectedPolicy(policy);handleActivate();}}
                    className="w-28 px-3 py-1 text-sm rounded bg-blue-600 hover:bg-blue-500 transition">
                    Activate
                    </button>
                    )}
                    <button className="w-24 px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-500 transition">
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