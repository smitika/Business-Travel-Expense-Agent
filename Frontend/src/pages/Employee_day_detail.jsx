import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { day_details } from "../api/client";

const DOC_STATUS_STYLES = {
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
  review: "bg-violet-50 text-violet-700 ring-violet-600/20",
  "flagged for review": "bg-violet-50 text-violet-700 ring-violet-600/20",
};

function docStatusBadge(status) {
  return DOC_STATUS_STYLES[(status || "").toLowerCase()] || "bg-slate-100 text-slate-600 ring-slate-500/20";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatWeekday(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { weekday: "long" });
}

function formatOriginalAmount(amount, currency) {
  if (!amount) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch (e) {
    return `${amount} ${currency}`;
  }
}

function CountChip({ label, value, dotClass }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="text-sm font-semibold text-slate-900">{value}</span>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

function SummaryRow({ summary }) {
  if (!summary) return null;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <CountChip label="Approved" value={summary.approved} dotClass="bg-emerald-500" />
      <CountChip label="Rejected" value={summary.rejected} dotClass="bg-rose-500" />
      <CountChip label="Flagged" value={summary.flagged_for_review || summary.review || 0} dotClass="bg-violet-500" />
      <span className="text-sm text-slate-400">· {summary.total_docs} docs total</span>
    </div>
  );
}

export default function DayDetailsPage() {
  const { claimId, dayNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Instantly render date if passed through React Router state
  const dayMeta = location.state?.day || null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Controls inline image review lightbox modal
  const [activeReceiptUrl, setActiveReceiptUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Calls the backend endpoint: /claims/{claimId}/days/{dayNumber}/details
        const result = await day_details(claimId, dayNumber);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError("Failed to retrieve documents for this day. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [claimId, dayNumber]);

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-8 w-44 bg-slate-200 rounded" />
          <div className="h-40 rounded-xl bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 px-6 py-8">
        <div className="max-w-sm rounded-xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <div className="text-base font-semibold text-rose-700">Something went wrong</div>
          <p className="mt-2 text-sm text-slate-500">{error || "No documents found for this day."}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { date, summary, documents } = data;

  return (
    <div className="min-h-full bg-slate-50 px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        
        {/* Navigation & Back Action */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate(`/employee-dashboard/my-claims/${claimId}`)}
            className="group inline-flex items-center gap-2 bg-transparent border-none text-sm font-semibold text-slate-500 hover:text-slate-900 cursor-pointer transition-colors duration-150"
          >
            <span className="text-base group-hover:-translate-x-0.5 transition-transform" aria-hidden="true">←</span>
            Back to Claim Details
          </button>
          <span className="text-xs font-medium text-slate-400">
            Claim #{claimId} / Day {dayNumber}
          </span>
        </div>

        {/* ---------------- TOP SECTION ---------------- */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs text-slate-400">
                {date ? formatWeekday(date) : "Trip Breakdown"}
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                Day {dayNumber} Overview
                {date && (
                  <span className="ml-2 font-normal text-slate-500 text-sm">
                    ({formatDate(date)})
                  </span>
                )}
              </h1>
            </div>

            {/* Day Overall Summary */}
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 md:min-w-[400px]">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Day Status
              </div>
              <SummaryRow summary={summary} />
            </div>
          </div>
        </div>

        {/* ---------------- DOCUMENTS TABULAR SECTION ---------------- */}
        <div className="mt-7">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Uploaded Receipts
          </h2>
          
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Upload ID</th>
                    <th scope="col" className="px-6 py-3.5">Doc Type</th>
                    <th scope="col" className="px-6 py-3.5">Category</th>
                    <th scope="col" className="px-6 py-3.5">Amount</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5">OCR Validation Check</th>
                    <th scope="col" className="px-6 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {documents.map((doc) => {
                    const statusVal = (doc.status || "").toLowerCase();
                    const hasActionableAlert = ["rejected", "review", "flagged for review"].includes(statusVal);

                    return (
                      <tr key={doc.upload_id} className="hover:bg-slate-50/50 transition-colors duration-150">
                        {/* ID */}
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                          {doc.upload_id}
                        </td>
                        {/* Doc Type */}
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                          {doc.doc_type || "Receipt"}
                        </td>
                        {/* Category */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 capitalize">
                            {doc.category}
                          </span>
                        </td>
                        {/* Amount */}
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                          {formatOriginalAmount(doc.amount, doc.currency)}
                        </td>
                        {/* Status */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${docStatusBadge(doc.status)}`}>
                            {doc.status}
                          </span>
                        </td>
                        {/* Rejection / Validation alerts */}
                        <td className="px-6 py-4 max-w-xs break-words">
                          {hasActionableAlert ? (
                            <span className="block text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100/60 rounded px-2.5 py-1.5">
                              {doc.reason || "Under processing review."}
                            </span>
                          ) : (
                            <span className="text-xs italic text-slate-400">Passed policy limits</span>
                          )}
                        </td>
                        {/* Actions (Image Preview Click) */}
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          {doc.file_url ? (
                            <button
                              type="button"
                              onClick={() => setActiveReceiptUrl(doc.file_url)}
                              className="text-xs font-semibold text-slate-900 hover:text-slate-600 border border-slate-200 hover:border-slate-300 rounded px-3 py-1.5 bg-white transition-all cursor-pointer shadow-xs"
                            >
                              Review Receipt
                            </button>
                          ) : (
                            <span className="text-xs italic text-slate-300">No Image</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* ---------------- INLINE RECEIPT LIGHTBOX MODAL ---------------- */}
      {activeReceiptUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs"
          onClick={() => setActiveReceiptUrl(null)}
          aria-modal="true"
          role="dialog"
        >
          <div 
            className="relative max-w-3xl w-full bg-white rounded-xl shadow-2xl overflow-hidden p-4"
            onClick={(e) => e.stopPropagation()} // Prevents closing lightbox when clicking image container
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Receipt Viewer</h3>
              <button
                type="button"
                onClick={() => setActiveReceiptUrl(null)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none text-lg font-bold cursor-pointer"
                aria-label="Close viewer"
              >
                ✕
              </button>
            </div>
            
            {/* Image Container */}
            <div className="flex justify-center items-center bg-slate-50 rounded-lg overflow-hidden max-h-[70vh]">
              <img 
                src={activeReceiptUrl} 
                alt="Uploaded Receipt" 
                className="max-h-[65vh] w-auto max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://placehold.co/600x400?text=Receipt+Not+Available";
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}