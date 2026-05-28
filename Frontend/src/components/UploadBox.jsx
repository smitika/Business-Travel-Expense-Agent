import { useState } from "react";
import { uploadFile } from "../api/client";

export default function UploadBox({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadFile(file);
      setMessage(res.message);
      onUploadSuccess();
    } catch (e) {
      setMessage("Upload failed. Please try again.");
    }
    setLoading(false);
  };

  return (
  <div className="h-full bg-[#111827] p-6 flex flex-col">
    
    <div>
      <h1 className="text-3xl font-bold text-white">
        RAG AI
      </h1>

      <p className="text-gray-400 text-sm mt-2 leading-relaxed">
        Upload enterprise documents and interact with them using AI-powered retrieval.
      </p>
    </div>

    <div className="mt-10 bg-[#1f2937] border border-gray-700 rounded-2xl p-5 shadow-2xl">
      
      <h2 className="text-lg font-semibold text-white mb-5">
        Upload Document
      </h2>

      <label className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all">
        
        <input
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <div className="text-5xl mb-3">📄</div>

        <p className="text-gray-300 text-sm font-medium">
          {file ? file.name : "Choose PDF File"}
        </p>

        <span className="text-gray-500 text-xs mt-2">
          Upload policy, invoice, or enterprise documents
        </span>
      </label>

      <button
        onClick={handleUpload}
        className="w-full mt-5 bg-blue-600 hover:bg-blue-700 transition-all text-white py-3 rounded-xl font-medium"
      >
        {loading ? "Processing..." : "Upload & Process"}
      </button>

      {message && (
        <div className="mt-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 text-sm">
          {message}
        </div>
      )}
    </div>

    <div className="mt-auto pt-6 text-xs text-gray-500">
      Secure Retrieval-Augmented Generation Workspace
    </div>
  </div>
);
}