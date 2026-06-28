import { useState, useEffect, useRef } from "react";
import { Info, X, Send, Loader2 } from "lucide-react";
import { chat as sendChat } from "../api/client";
export default function ChatWindow({ sessionData, storageKey, onEndSession, disabled = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [modal, setModal] = useState(null); // { chunks, confidence }
  const bottomRef = useRef(null);

  // Restore from sessionStorage
  useEffect(() => {
    if (!storageKey) return;
    const saved = sessionStorage.getItem(`chat_history_${storageKey}`);
    if (saved) setMessages(JSON.parse(saved));
  }, [storageKey]);

  // Persist to sessionStorage
  useEffect(() => {
    if (!storageKey) return;
    sessionStorage.setItem(`chat_history_${storageKey}`, JSON.stringify(messages));
  }, [messages, storageKey]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingChat]);

  const handleSend = async () => {
    if (!input.trim() || !sessionData || loadingChat) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", message: userMessage }]);

    try {
      setLoadingChat(true);
      const res = await sendChat({
        session_id: sessionData.session_id,
        policy_id: sessionData.policy_id,
        vector_path: sessionData.vector_path,
        chat_mode: sessionData.chat_mode,
        message: userMessage,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          message: res.response || res.answer || "No response",
          chunks: res.retrieved_chunks || [],
          confidence: res.retrieval_confidence ?? null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", message: "Error getting response", chunks: [], confidence: null },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEnd = () => {
    if (storageKey) sessionStorage.removeItem(`chat_history_${storageKey}`);
    setMessages([]);
    setInput("");
    onEndSession?.();
  };

  const isActive = !!sessionData && !disabled;

  return (
    <div className="flex flex-col flex-1 h-full">

      {/* SESSION STATUS BAR */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-300"}`}
          />
          <span className="text-xs text-slate-500">
            {isActive
              ? `Session active · ${sessionData.chat_mode}`
              : "No active session"}
          </span>
        </div>
        {isActive && (
          <button
            onClick={handleEnd}
            className="text-xs text-red-500 hover:text-red-600 transition flex items-center gap-1"
          >
            <X size={13} /> End session
          </button>
        )}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-[#F8FAFC]">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 text-sm">
              {isActive ? "Ask your first question below." : "Create a session to start chatting."}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-2xl bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed">
                {msg.message}
              </div>
            ) : (
              <div className="max-w-2xl bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-slate-700 leading-relaxed relative pr-10 shadow-sm">
                {msg.message}
                {/* Info button — only shown if chunks exist */}
                {msg.chunks?.length > 0 && (
                  <button
                    onClick={() => setModal({ chunks: msg.chunks, confidence: msg.confidence })}
                    className="absolute bottom-2 right-2 text-slate-400 hover:text-blue-500 transition"
                    title="View retrieval details"
                  >
                    <Info size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loadingChat && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
              <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isActive}
            rows={1}
            placeholder={isActive ? "Ask a question… (Enter to send)" : "Create a session first"}
            className={`flex-1 resize-none px-4 py-3 rounded-xl text-sm border outline-none transition
              ${isActive
                ? "bg-white border-slate-300 text-slate-700 placeholder-slate-400 focus:border-blue-500"
                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed placeholder-slate-400"
              }`}
          />
          <button
            onClick={handleSend}
            disabled={!isActive || !input.trim() || loadingChat}
            className={`p-3 rounded-xl transition
              ${isActive && input.trim() && !loadingChat
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* RETRIEVAL DETAILS MODAL */}
      {modal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Retrieval Details</h2>
                {modal.confidence !== null && modal.confidence !== undefined && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confidence score:{" "}
                    <span className="text-emerald-600 font-mono">
                      {typeof modal.confidence === "number"
                        ? modal.confidence.toFixed(4)
                        : modal.confidence}
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setModal(null)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chunks */}
            <div className="overflow-y-auto px-5 py-4 space-y-3">
              {modal.chunks.map((chunk, i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-600">
                      Chunk {i + 1}
                    </span>
                    {chunk.score !== null && chunk.score !== undefined && (
                      <span className="text-xs text-slate-400 font-mono">
                        score: {typeof chunk.score === "number" ? chunk.score.toFixed(4) : chunk.score}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
