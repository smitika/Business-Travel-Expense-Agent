import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { populate_policy, revoke_policy, get_policies_populate } from "../api/client"; 

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function PolicyMetadataPage() {
  const navigate = useNavigate();

  // Dynamic states
  const [policies, setPolicies] = useState([]); // Initialized as empty array
  const [pageLoading, setPageLoading] = useState(true); // Full-page loader
  const [actionLoadingId, setActionLoadingId] = useState(null); // Row-level loader
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modal State for PDF Viewing
  const [activePdfUrl, setActivePdfUrl] = useState(null);

  // Fetch policies on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchPolicies() {
      setPageLoading(true);
      setErrorMessage(null);
      try {
        const data = await get_policies_populate();
        if (isMounted) {
          // Expecting backend response format to contain an array of policies
          setPolicies(data.policies || []); 
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage("Failed to load policies database. Please verify your connection.");
        }
      } finally {
        if (isMounted) {
          setPageLoading(false);
        }
      }
    }
    fetchPolicies();
    return () => {
      isMounted = false;
    };
  }, []);

  // Action: Trigger GPT Metadata Extraction
  const handlePopulate = async (policyId, filePath) => {
    setActionLoadingId(policyId);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await populate_policy(policyId, filePath);
      const data = await get_policies_populate();
        setPolicies(data.policies);
      // Update local state to show metadata is now populated
      alert("Policy metadata extracted succesfully!");
      setSuccessMessage(
        `Success: Policy ${policyId} populated. ${res.reprocessed_claims_count} stalled claims successfully resumed!`
      );
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "Extraction failed. Please check the document format.");
      alert("Policy metadata extraction failed!");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Clear/Delete Metadata
  const handleRevoke = async (policyId) => {
    if (!window.confirm("Are you sure you want to delete this metadata? This will stop auto-validation for future submissions on this policy.")) {
      return;
    }
    setActionLoadingId(policyId);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await revoke_policy(policyId);
      
      // Update local state to show metadata is now unpopulated
      const data = await get_policies_populate();
        setPolicies(data.policies);
        alert("policy metadata revoked succesfully!");
      setSuccessMessage(`Metadata successfully deleted/revoked for Policy ${policyId}.`);
    } catch (err) {
      setErrorMessage("Failed to revoke metadata.");
      alert("Failed to revoke policy metadata");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 font-sans text-slate-900">
      
      {/* ---------------- NAVBAR ---------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="group inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              title="Go Back"
            >
              <span className="text-base group-hover:-translate-x-0.5 transition-transform">←</span>
            </button>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Policy Metadata Management
            </h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Admin Console
          </span>
        </div>
      </header>

      {/* ---------------- MAIN CONTAINER ---------------- */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        
        {/* Description Header */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-sm leading-relaxed text-slate-500">
            View active policy records and manage their database rules. Clicking <span className="font-semibold text-slate-900">Extract Metadata</span> will parse PDF contents using OCR & AI to populate rule items [1]. If a policy's rules are missing, newly submitted claims are safely parked in a <span className="font-semibold text-slate-900">System Pending</span> state [2] and will automatically resume once metadata is populated.
          </p>
        </div>

        {/* Action Status Notifications */}
        {successMessage && (
          <div className="mb-6 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            {errorMessage}
          </div>
        )}

        {/* ---------------- LOADING SKELETON STATE ---------------- */}
        {pageLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/4" />
            <div className="space-y-3">
              <div className="h-12 bg-slate-100 rounded" />
              <div className="h-12 bg-slate-100 rounded" />
              <div className="h-12 bg-slate-100 rounded" />
            </div>
          </div>
        ) : (
          /* ---------------- TABLE CARD (Loaded State) ---------------- */
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/75 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-4">Policy ID</th>
                    <th scope="col" className="px-6 py-4">Policy Name</th>
                    <th scope="col" className="px-6 py-4">Valid From</th>
                    <th scope="col" className="px-6 py-4">Valid Till</th>
                    <th scope="col" className="px-6 py-4">Metadata Status</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {policies.length > 0 ? (
                    policies.map((p) => {
                      const isProcessing = actionLoadingId === p.policy_id;

                      return (
                        <tr key={p.policy_id} className="hover:bg-slate-50/40 transition-colors duration-150">
                          {/* ID */}
                          <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                            #{p.policy_id}
                          </td>
                          
                          {/* Name (Triggers PDF Modal) */}
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => setActivePdfUrl(p.file_url || p.file_path)}
                              className="bg-transparent border-none p-0 text-left font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition-colors"
                              title="Click to view policy PDF"
                            >
                              {p.policy_name}
                            </button>
                          </td>
                          
                          {/* Dates */}
                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                            {formatDate(p.valid_from)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                            {formatDate(p.valid_till)}
                          </td>
                          
                          {/* Extraction Status */}
                          <td className="whitespace-nowrap px-6 py-4">
                            {p.is_populated ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Populated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Missing Rules
                              </span>
                            )}
                          </td>
                          
                          {/* Actions */}
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              
                              {/* Populate Button */}
                              <button
                                type="button"
                                disabled={p.is_populated || isProcessing}
                                onClick={() => handlePopulate(p.policy_id, p.file_url || p.file_path)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all border shadow-xs
                                  ${p.is_populated
                                    ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                    : isProcessing
                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-wait"
                                    : "bg-slate-900 border-slate-900 text-white hover:bg-slate-700 cursor-pointer"
                                  }`}
                              >
                                {isProcessing && !p.is_populated ? (
                                  <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
                                    Extracting...
                                  </>
                                ) : (
                                  "Extract Metadata"
                                )}
                              </button>

                              {/* Revoke/Reset Button */}
                              <button
                                type="button"
                                disabled={!p.is_populated || isProcessing}
                                onClick={() => handleRevoke(p.policy_id)}
                                className={`inline-flex items-center rounded-lg px-3.5 py-2 text-xs font-semibold transition-all border shadow-xs
                                  ${!p.is_populated
                                    ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                                    : isProcessing
                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-wait"
                                    : "bg-white border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                  }`}
                              >
                                Reset Rules
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-slate-500 font-medium">
                        No policy records found in the database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* -------------------- POLICY PDF SCROLL MODAL -------------------- */}
      {activePdfUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs"
          onClick={() => setActivePdfUrl(null)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="relative flex flex-col max-w-4xl w-full h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Stop click-through closing
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Policy Document Preview</h3>
                <p className="text-xs text-slate-400 mt-0.5">Use scrollbar inside the modal to read page by page</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePdfUrl(null)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none text-xl font-bold cursor-pointer transition-colors"
                aria-label="Close document viewer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Scrollable PDF Frame Container */}
            <div className="flex-1 w-full bg-slate-50 overflow-hidden">
              <iframe
                // Wraps Cloudinary URL in Google PDF viewer to force inline page-by-page scrolling
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(activePdfUrl)}&embedded=true`} 
                title="Policy PDF Viewer"
                className="w-full h-full border-none"
                loading="lazy"
                />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}