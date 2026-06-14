import { useState , useEffect} from "react";
import { uploadFile } from "../api/client";
import { ingestion, fetch_policies , upload_policy} from "../api/client";

export default function UploadBox({ role,policyIngested, setPolicyIngested }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [policies, setpolicies] = useState([]);
  const [policyLoading, setPolicyLoading] = useState(false);

  const handleUploadPolicy = async () => {
    if (!file) return;
    try {
      setLoading(true);
      const res=await upload_policy(file);
      alert("Policy uploaded successfully");
      await fetch_policies();
      setFile(null);
      }catch (err) {
        console.error(err);
        alert("Failed to upload policy");
      } finally {
        setLoading(false);
      }
    };

  const handleIngestion = async () => {
    setPolicyLoading(true);
    try {
      const data = await ingestion();
      if (data.ingestion_complete) {
        setPolicyIngested(true);
      }
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    fetch_policies()
    .then((data)=>{
      setpolicies(data.policies);
    })
    .catch(() => {
      setPolicies([]);
    });
  },[]);

  return (
  <div className="h-full bg-[#111827] p-6 flex flex-col">

    <div className="mb-6">
      <h2 className="text-xl font-bold text-white">
        {role === "admin" ? "Policy Management" : "Receipt Upload"}
      </h2>

      <p className="text-sm text-gray-400 mt-1">
        {role === "admin"
          ? "Manage travel policies and policy ingestion."
          : "Upload receipts for reimbursement claims."}
      </p>
    </div>

    {role === "admin" && (
    <div className="space-y-3 mb-6">
      <p className="text-white font-semibold mb-2">LIST OF POLICIES</p>

      {/* SCROLLABLE LIST — fixed height, upload stays put */}
      <div className="max-h-[168px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-600">
        {policies.length === 0 ? (
          <p className="text-gray-400 text-sm">No policies uploaded</p>
        ) : (
          policies.map((policy) => (
            <div
              key={policy.policy_id}
              className="flex items-center justify-between bg-[#1f2937] px-3 py-2 rounded-lg text-white"
            >
              {/* LEFT */}
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={policy.is_active}
                  readOnly
                  className="w-4 h-4 accent-green-500 shrink-0"
                />
                {/* Normalized width — truncates long names */}
                <span
                  className="text-sm w-40 truncate"
                  title={policy.policy_name}
                >
                  {policy.policy_name}
                </span>
              </div>

              {/* RIGHT */}
              <div className="flex gap-2 shrink-0">
                {!policy.is_active ? (
                  <button className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded">
                    Activate
                  </button>
                ) : (
                  <button className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 rounded">
                    Deactivate
                  </button>
                )}
                {!policy.is_deleted && (
                  <button className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 rounded">
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* UPLOAD — always visible, never shifts */}
      <div className="mt-4 space-y-3">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full text-sm text-gray-300"
        />
        <button
          onClick={handleUploadPolicy}
          disabled={!file || loading}
          className={`w-full py-3 rounded-xl font-medium transition
            ${!file || loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
        >
          {loading ? "Uploading..." : "Upload Policy"}
        </button>
      </div>
    </div>
  )}

    {role === "employee" && (
      <div className="bg-[#1f2937] border border-gray-700 rounded-2xl p-5">

        <label className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition">

          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <div className="text-5xl mb-3">📄</div>

          <p className="text-gray-300 text-sm font-medium">
            {file ? file.name : "Click to select a receipt"}
          </p>

          <span className="text-gray-500 text-xs mt-2">
            Supported: JPG, PNG, PDF
          </span>

        </label>

        <button className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition">
          {loading ? "Processing..." : "Submit Receipt"}
        </button>

      </div>
    )}

    <div className="mt-auto pt-6 text-xs text-gray-500">
      {role === "admin"
        ? "Enterprise Policy Administration"
        : "Secure Receipt Submission Portal"}
    </div>

  </div>
);
}