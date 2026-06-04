import { useState, useEffect } from "react";
import UploadBox from "./components/UploadBox";
import ChatBox from "./components/ChatBox";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("https://business-travel-expense-agent.onrender.com/")
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);

  return (
    <div className="h-screen bg-[#0b1120] text-white flex overflow-hidden">

      {/* LEFT SIDEBAR — Receipt Upload */}
      <div className="w-[25%] min-w-[320px] border-r border-gray-800 flex flex-col">
        
        <div className="px-6 py-5 border-b border-gray-800">
          <h2 className="text-lg font-bold">Receipt Upload</h2>
          <p className="text-gray-400 text-xs mt-1">Submit receipts for reimbursement</p>
        </div>

        <div className="flex-1 px-6 py-5">
          <UploadBox />
        </div>

      </div>

      {/* RIGHT CHAT AREA */}
      <div className="flex-1 flex flex-col">

        <div className="border-b border-gray-800 px-8 py-5 bg-[#111827]">
          <h1 className="text-2xl font-bold tracking-wide">Enterprise RAG Assistant</h1>
          <p className="text-gray-400 text-sm mt-1">
            {ready ? "Policy loaded — ask your questions" : "Connecting to assistant..."}
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatBox ready={ready} />
        </div>

      </div>
    </div>
  );
}