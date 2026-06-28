import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get_flagged_receipts } from "../api/client"; 

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Helper to filter dates by range
const isWithinDateRange = (dateString, range) => {
  if (range === "any") return true;
  const itemDate = new Date(dateString);
  const now = new Date();

  if (range === "today") {
    return itemDate.toDateString() === now.toDateString();
  }
  if (range === "7days") {
    const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
    return itemDate >= sevenDaysAgo;
  }
  if (range === "30days") {
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    return itemDate >= thirtyDaysAgo;
  }
  return true;
};

export default function FlaggedReceiptsPage() {
  const navigate = useNavigate();

  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("any");

  // Load flagged receipts on mount
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await get_flagged_receipts();
        if (isMounted) {
          setReceipts(data.flagged_receipts || []);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to retrieve flagged receipts database. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter + Search logical processing
  const filteredReceipts = receipts.filter((receipt) => {
    // 1. Search filter: matches upload_id or emp_id
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      String(receipt.upload_id).includes(query) ||
      (receipt.emp_id || "").toLowerCase().includes(query) ||
      (receipt.emp_name || "").toLowerCase().includes(query);

    // 2. Date/Time filter
    const matchesTime = isWithinDateRange(receipt.created_at, timeFilter);

    return matchesSearch && matchesTime;
  });

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-5xl animate-pulse space-y-4">
          <div className="h-10 w-24 bg-slate-200 rounded-lg" />
          <div className="h-12 bg-slate-200 rounded-lg w-full" />
          <div className="h-28 rounded-xl bg-slate-200" />
          <div className="h-28 rounded-xl bg-slate-200" />
          <div className="h-28 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-6 py-8 sm:px-10 font-sans text-slate-900">
      <div className="mx-auto max-w-5xl">
        
        {/* ---------------- HEADER SECTION ---------------- */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-xs transition-colors duration-150"
            >
              Back
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Review Flagged Receipts</h1>
          </div>

          {/* Filters, Search bar, and presets */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:flex-initial">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Upload or Emp ID..."
                className="w-full md:w-56 bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 shadow-xs"
              />
            </div>

            {/* Date filter dropdown */}
            <div className="relative flex-1 md:flex-initial">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="appearance-none w-full md:w-40 bg-white border border-slate-200 rounded-lg py-2 px-3 pr-8 text-sm text-slate-800 font-semibold focus:outline-none focus:border-slate-400 cursor-pointer shadow-xs"
              >
                <option value="any">Any submission</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- ERROR BLOCK ---------------- */}
        {error && (
          <div className="mb-6 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}

        {/* ---------------- FLAGGED CARDS LIST ---------------- */}
        <div className="space-y-4">
          {filteredReceipts.length > 0 ? (
            filteredReceipts.map((receipt) => (
              <div
                key={receipt.upload_id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-150"
              >
                <div className="flex gap-4 items-start">
                  {/* Validation Warning Shield Icon */}
                  <div className="w-11 h-11 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-center text-rose-500 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Upload ID: #{receipt.upload_id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-semibold">Claim #{receipt.claim_id}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="font-semibold text-slate-800">{receipt.emp_name} ({receipt.emp_id})</span>
                      <span className="text-slate-300">|</span>
                      <span>Submitted: {formatDate(receipt.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge & Review trigger button */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 shrink-0">
                  <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 text-xs font-semibold">
                    Flagged for review
                  </span>
                  
                  {/* View details button triggers detailed page review route */}
                  <button
                    onClick={() => navigate(`/admin/flagged-receipts/${receipt.upload_id}`)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 cursor-pointer shadow-xs transition-colors duration-150"
                  >
                    View details
                    <span aria-hidden="true" className="text-xs font-bold">→</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-slate-500 bg-white border border-slate-200 rounded-xl">
              No flagged receipts found matching the filters.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}