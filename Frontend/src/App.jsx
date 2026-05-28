import { useState } from "react";
import UploadBox from "./components/UploadBox";
import ChatBox from "./components/ChatBox";

export default function App() {
  const [ready, setReady] = useState(false);

  return (
  <div className="h-screen bg-[#0b1120] text-white flex overflow-hidden">
    
    {/* LEFT SIDEBAR */}
    <div className="w-[25%] min-w-[320px] border-r border-gray-800">
      <UploadBox onUploadSuccess={() => setReady(true)} />
    </div>

    {/* RIGHT CHAT AREA */}
    <div className="flex-1 flex flex-col">
      
      <div className="border-b border-gray-800 px-8 py-5 bg-[#111827]">
        <h1 className="text-2xl font-bold tracking-wide">
          Enterprise RAG Assistant
        </h1>

        <p className="text-gray-400 text-sm mt-1">
          AI-powered document understanding and querying system
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatBox ready={ready} />
      </div>
    </div>
  </div>
);
}