import { useState } from "react";
import { askQuestion } from "../api/client";

export default function ChatBox({ ready }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!question || !ready) return;

    const userMsg = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await askQuestion(question);
      setMessages((prev) => [...prev, { role: "bot", text: res.response }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "bot", text: "Error getting response." }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
  <div className="h-full flex flex-col bg-[#0b1120]">
    
    {/* CHAT MESSAGES */}
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
      
      {!ready && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white">
              travel policy being ingested...
            </h2>

            <p className="text-gray-400 mt-2">
              Your AI assistant is ready to analyze documents.
            </p>
          </div>
        </div>
      )}

      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[75%] px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-lg ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-[#1f2937] border border-gray-700 text-gray-200"
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}

      {loading && (
        <div className="text-gray-400 text-sm animate-pulse">
          AI is thinking...
        </div>
      )}
    </div>

    {/* INPUT AREA */}
    <div className="border-t border-gray-800 bg-[#111827] p-5">
      
      <div className="flex gap-3">
        
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            ready
              ? "Ask questions about your business travel ..."
              : "Upload a document first..."
          }
          disabled={!ready}
          className="flex-1 bg-[#1f2937] border border-gray-700 text-white rounded-xl px-5 py-4 outline-none focus:border-blue-500 placeholder:text-gray-500"
        />

        <button
          onClick={handleSend}
          disabled={!ready || loading}
          className="bg-blue-600 hover:bg-blue-700 transition-all px-6 rounded-xl font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  </div>
);
}