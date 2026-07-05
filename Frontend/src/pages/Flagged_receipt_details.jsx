import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get_flagged_receipt_details, approve_flagged_receipt, reject_flagged_receipt } from "../api/client";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(amount, currency) {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch (e) {
    return `${amount} ${currency}`;
  }
}

export default function FlaggedReceiptDetailsPage() {
  const { uploadId } = useParams();
  console.log(uploadId);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Accordion Expand/Collapse States
  const [isRawTextExpanded, setIsRawTextExpanded] = useState(false);
  const [isLimitsExpanded, setIsLimitsExpanded] = useState(false);
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);

  // HITL Action Modal States
  const [actionType, setActionType] = useState(null); // "approve" or "reject"
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Fetch all deep receipt details on mount
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const result = await get_flagged_receipt_details(uploadId);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to retrieve details for this flagged receipt.");
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
  }, [uploadId]);

  // Handle Approve/Reject API Submit [2]
  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!reasonText.trim()) {
      setActionError("A reason is mandatory to complete this action.");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (actionType === "approve") {
        await approve_flagged_receipt(uploadId, reasonText);
      } else {
        await reject_flagged_receipt(uploadId, reasonText);
      }
      // Redirect back to review queue on success
      navigate(-1);
    } catch (err) {
      setActionError(err.response?.data?.detail || "Action failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-10 w-24 bg-slate-200 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-44 bg-slate-200 rounded-xl" />
              <div className="h-64 bg-slate-200 rounded-xl" />
            </div>
            <div className="h-96 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 px-6 py-8">
        <div className="max-w-sm rounded-xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <div className="text-base font-semibold text-rose-700">Something went wrong</div>
          <p className="mt-2 text-sm text-slate-500">{error || "Could not load detailed data."}</p>
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

  const { upload_details, policy_limits, policy_items } = data;

  return (
    <div className="min-h-full bg-slate-50 px-6 py-8 sm:px-10 font-sans text-slate-900">
      <div className="mx-auto max-w-6xl">
        
        {/* ---------------- NAVBAR / HEADER ---------------- */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer shadow-xs transition-colors duration-150"
          >
            Back
          </button>
          <div>
            <span className="text-xs font-semibold text-slate-400">ADMIN HITL DECISION CONSOLE</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Review Claim Upload #{uploadId}</h1>
          </div>
        </div>

        {/* ---------------- SPLIT LAYOUT ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT COLUMN: Metadata, OCR, Policies */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Summary Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Summary details</h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <div className="text-slate-400 text-xs">Upload ID</div>
                  <div className="font-semibold text-slate-900 mt-0.5">#{upload_details.upload_id}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Claim ID</div>
                  <div className="font-semibold text-slate-900 mt-0.5">#{upload_details.claim_id}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Employee</div>
                  <div className="font-semibold text-slate-900 mt-0.5 truncate">{upload_details.emp_name}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Employee ID</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{upload_details.emp_id}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Category</div>
                  <div className="font-semibold text-slate-900 mt-0.5 capitalize">{upload_details.category}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Submitted on</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{formatDate(upload_details.upload_created_at)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-400 text-xs">Travel dates / Trip</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {formatDate(upload_details.travel_start_date)} → {formatDate(upload_details.travel_end_date)} ({upload_details.destn})
                  </div>
                </div>
              </div>

              {/* Review Reason Alert */}
              <div className="mt-5 rounded-lg border border-violet-100 bg-violet-50 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-400">System flagging trigger reason</span>
                <span className="text-sm font-semibold text-violet-800 mt-1 block">
                  {upload_details.review_reason || "Flagged for standard compliance auditing."}
                </span>
              </div>
            </div>

            {/* 2. OCR Details Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">OCR Extracted values</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                  upload_details.ocr_confidence === "high" 
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" 
                    : "bg-amber-50 text-amber-700 ring-amber-600/20"
                }`}>
                  Confidence: {upload_details.ocr_confidence || "low"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <div className="text-slate-400 text-xs">Merchant</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{upload_details.ocr_merchant || "—"}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Receipt Date</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{formatDate(upload_details.ocr_date)}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Amount</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {formatCurrency(upload_details.ocr_amount, upload_details.ocr_currency)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Amount (INR Equiv)</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {formatCurrency(upload_details.ocr_amount_inr, "INR")}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Document Type</div>
                  <div className="font-semibold text-slate-900 mt-0.5 capitalize">{upload_details.detected_doc_type || "Receipt"}</div>
                </div>
              </div>

              {/* Extract Line Items list tags */}
              {upload_details.ocr_line_items?.length > 0 && (
                <div>
                  <div className="text-slate-400 text-xs mb-1.5">OCR line items</div>
                  <div className="flex flex-wrap gap-1.5">
                    {upload_details.ocr_line_items.map((line, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-1 rounded">
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible: Raw OCR Text */}
              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={() => setIsRawTextExpanded(!isRawTextExpanded)}
                  className="flex w-full items-center justify-between bg-transparent border-0 text-slate-500 hover:text-slate-900 font-semibold text-xs cursor-pointer"
                >
                  <span>{isRawTextExpanded ? "HIDE RAW OCR TEXT" : "SHOW RAW OCR TEXT"}</span>
                  <span>{isRawTextExpanded ? "▲" : "▼"}</span>
                </button>
                {isRawTextExpanded && (
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-4 text-[11px] font-mono text-slate-500 max-h-48 leading-relaxed whitespace-pre-wrap">
                    {upload_details.ocr_raw_text || "No raw text available."}
                  </pre>
                )}
              </div>
            </div>

            {/* 3. Policy Referred Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Referred Travel Policy</h2>
                <div className="mt-2 flex items-center gap-3">
                  <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded">
                    Policy #{upload_details.policy_id}
                  </span>
                  <span className="text-sm font-bold text-slate-950">{upload_details.policy_name}</span>
                </div>
              </div>

              {/* Accordion: Policy Limits */}
              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={() => setIsLimitsExpanded(!isLimitsExpanded)}
                  className="flex w-full items-center justify-between bg-transparent border-0 text-slate-500 hover:text-slate-900 font-semibold text-xs cursor-pointer"
                >
                  <span>{isLimitsExpanded ? "HIDE POLICY LIMITS ROWS" : "SHOW POLICY LIMITS ROWS"}</span>
                  <span>{isLimitsExpanded ? "▲" : "▼"}</span>
                </button>
                {isLimitsExpanded && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Travel Type</th>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5">Daily Limit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                        {policy_limits.map((l) => (
                          <tr key={l.id}>
                            <td className="px-4 py-2 capitalize">{l.travel_type}</td>
                            <td className="px-4 py-2 capitalize">{l.category}</td>
                            <td className="px-4 py-2 font-semibold">{formatCurrency(l.daily_limit, l.currency)}</td>
                          </tr>
                        ))}
                        {policy_limits.length === 0 && (
                          <tr><td colSpan="3" className="px-4 py-4 text-center text-slate-400">No limits specified.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Accordion: Policy Items */}
              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                  className="flex w-full items-center justify-between bg-transparent border-0 text-slate-500 hover:text-slate-900 font-semibold text-xs cursor-pointer"
                >
                  <span>{isItemsExpanded ? "HIDE POLICY ITEMS ALLOWANCES" : "SHOW POLICY ITEMS ALLOWANCES"}</span>
                  <span>{isItemsExpanded ? "▲" : "▼"}</span>
                </button>
                {isItemsExpanded && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5">Item</th>
                          <th className="px-4 py-2.5">Allowed</th>
                          
                          <th className="px-4 py-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                        {policy_items.map((it) => (
                          <tr key={it.id}>
                            <td className="px-4 py-2 capitalize">{it.category}</td>
                            <td className="px-4 py-2 font-semibold">{it.item_name}</td>
                            <td className="px-4 py-2">
                              {it.is_allowed ? (
                                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Yes</span>
                              ) : (
                                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">No</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-slate-400 max-w-xs truncate" title={it.notes}>{it.notes || "—"}</td>
                          </tr>
                        ))}
                        {policy_items.length === 0 && (
                          <tr><td colSpan="5" className="px-4 py-4 text-center text-slate-400">No specific item criteria.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Bottom Decision Buttons */}
            <div className="flex gap-4 items-center justify-end">
              <button
                type="button"
                onClick={() => { setReasonText(""); setActionType("reject"); }}
                className="bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-600 hover:text-rose-700 font-bold px-6 py-2.5 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                Reject Receipt
              </button>
              <button
                type="button"
                onClick={() => { setReasonText(""); setActionType("approve"); }}
                className="bg-slate-900 hover:bg-slate-700 text-white font-bold px-6 py-2.5 rounded-lg border-0 transition-all cursor-pointer shadow-md"
              >
                Approve Receipt
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Receipt Image Preview */}
          <div className="lg:sticky lg:top-24 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Uploaded Document image</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {upload_details.file_url ? (
                <div className="overflow-hidden rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 max-h-[70vh]">
                  <img
                    src={upload_details.file_url}
                    alt="Uploaded receipt attachment"
                    className="w-full h-auto max-h-[65vh] object-contain cursor-zoom-in"
                    onClick={() => window.open(upload_details.file_url, "_blank")}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://placehold.co/400x500?text=Receipt+Not+Available";
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 italic">No receipt image uploaded.</div>
              )}
              <p className="text-[11px] text-slate-400 text-center mt-2">Click image to open in a new tab</p>
            </div>
          </div>

        </div>
      </div>

      {/* ----------------- ACTION REASON LIGHTBOX MODAL ----------------- */}
      {actionType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in"
          onClick={() => { if (!submitting) setActionType(null); }}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 capitalize mb-2">
              Confirm {actionType === "approve" ? "Approval" : "Rejection"}
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Please provide a brief justification to finalize this action. This will update the status of Upload #{uploadId} in the database and recalculate the claim-level status [2].
            </p>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label htmlFor="reason" className="sr-only">Decision justification</label>
                <textarea
                  id="reason"
                  rows={4}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder={`Write your mandatory reason for ${actionType}...`}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              {actionError && (
                <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded p-2.5">
                  {actionError}
                </div>
              )}

              <div className="flex gap-3 justify-end items-center border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setActionType(null)}
                  className="bg-transparent border-none text-slate-500 hover:text-slate-900 font-semibold text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reasonText.trim()}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-all border-0 shadow-xs cursor-pointer
                    ${submitting 
                      ? "bg-slate-400 cursor-wait" 
                      : actionType === "approve" 
                      ? "bg-slate-900 hover:bg-slate-700" 
                      : "bg-rose-600 hover:bg-rose-700"
                    }`}
                >
                  {submitting ? "Processing..." : `Confirm ${actionType === "approve" ? "Approve" : "Reject"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}