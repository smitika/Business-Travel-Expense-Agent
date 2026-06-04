import { useState } from "react";
import { uploadFile } from "../api/client";

export default function UploadBox() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  
  return (
  <div className="h-full bg-[#111827] p-6 flex flex-col">
    
    <div>
      <p className="text-gray-400 text-sm  leading-relaxed">
        Submit your travel receipts for reimbursement approval.
      </p>
    </div>

    <div className="mt-3 bg-[#1f2937] border border-gray-700 rounded-2xl p-5 shadow-2xl">
      
      <h2 className="text-lg font-semibold text-white mb-5">
        Upload Receipt
      </h2>

      <label className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all">
        
        <input
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <div className="text-5xl mb-3">📄</div>

        <p className="text-gray-300 text-sm font-medium">
        {file ? file.name : "Choose receipt image or PDF"}
        </p>


        <span className="text-gray-500 text-xs mt-2">
        Supported: JPG, PNG, PDF
        </span>
      </label>

      <button
        className="w-full mt-5 bg-blue-600 hover:bg-blue-700 transition-all text-white py-3 rounded-xl font-medium"
      >
        {loading ? "Processing..." : "Submit Receipt"}
      </button>

    </div>

    <div className="mt-auto pt-6 text-xs text-gray-500">
      Secure Receipt Submission Portal
    </div>
  </div>
);
}