import { useState, useEffect } from "react";
import ChatBox from "../components/ChatBox";
import UploadBox from "../components/UploadBox";
import {checkPolicyIngested} from "../api/client";

export default function Interraction() {
  const [ready, setReady] = useState(false);
  const [policyIngested, setPolicyIngested] = useState(null);
  const role = localStorage.getItem("role");

  useEffect(() => {
    fetch("http://localhost:8000")
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);

  useEffect(() => {
    checkPolicyIngested()
      .then((data) => setPolicyIngested(data.ingested))
      .catch(() => setPolicyIngested(false));
  }, []);

  return (
    <div className="h-screen bg-[#0b1120] text-white flex overflow-hidden">

      {/* LEFT SIDEBAR — Receipt Upload */}
      <div className="w-[25%] min-w-[320px] border-r border-gray-800 flex flex-col">
        
        <div className="px-6 py-5 border-b border-gray-800">
          {role === "employee" ?<h2 className="text-lg font-bold">Receipt Upload</h2> :<h2 className="text-lg font-bold">New Policy Upload</h2> }
        </div>

        <div className="flex-1 px-6 py-5">
          {<UploadBox role={role} policyIngested={policyIngested} setPolicyIngested={setPolicyIngested} /> }        
          </div>

      </div>

      {/* RIGHT CHAT AREA */}
      <div className="flex-1 flex flex-col">

        <div className="border-b border-gray-800 px-8 py-5 bg-[#111827]">
          <h1 className="text-2xl font-bold tracking-wide">SmartHelp AI Assistant</h1>
        </div>

        <div className="flex-1 overflow-hidden">
          { <ChatBox role={role} ready={ready} policyIngested={policyIngested} /> }
        </div>

      </div>
    </div>
  );
}