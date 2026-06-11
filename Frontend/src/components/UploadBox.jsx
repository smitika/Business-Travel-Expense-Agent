import { useState } from "react";
import { uploadFile } from "../api/client";
import { ingestion } from "../api/client";

export default function UploadBox({ role,policyIngested, setPolicyIngested }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [policyLoading, setPolicyLoading] = useState(false);

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
        {policyLoading ? (
          <button
            disabled
            className="w-full py-3 rounded-xl bg-gray-500 font-semibold cursor-not-allowed"
          >
            Ingesting Policy...
          </button>
        ) : policyIngested === null ? (
          <button
            disabled
            className="w-full py-3 rounded-xl bg-gray-500 font-semibold cursor-not-allowed"
          >
            Checking Policy...
          </button>
        ) : policyIngested === true ? (
          <button
            disabled
            className="w-full py-3 rounded-xl bg-gray-500 font-semibold cursor-not-allowed"
          >
            Policy Ingested
          </button>
        ) : (
          <button
            onClick={handleIngestion}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition"
          >
            Ingest Current Policy
          </button>
        )}

        <label className="w-full block py-3 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 cursor-pointer transition font-medium text-white">
          Upload New Policy

          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

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

    {role === "admin" && file && (
      <div className="bg-[#1f2937] border border-gray-700 rounded-xl p-4">

        <p className="text-xs text-gray-400 mb-1">
          Selected Policy
        </p>

        <p className="text-sm text-white break-words">
          📄 {file.name}
        </p>

        <button className="w-full mt-4 bg-green-600 hover:bg-green-500 py-2.5 rounded-lg font-medium transition">
          {loading ? "Uploading..." : "Upload Policy"}
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