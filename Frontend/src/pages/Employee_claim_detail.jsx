import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { claim_details } from "../api/client";

const STATUS_STYLES = {
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "partially approved": "bg-amber-50 text-amber-700 ring-amber-600/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
  "flagged for review": "bg-violet-50 text-violet-700 ring-violet-600/20",
  pending: "bg-slate-100 text-slate-600 ring-slate-500/10",
  "system pending": "bg-sky-50 text-sky-700 ring-sky-600/20",
};

function statusBadgeClasses(status) {
  return STATUS_STYLES[(status || "").toLowerCase()] || "bg-slate-100 text-slate-600 ring-slate-500/20";
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
  return (
    <div className="flex flex-wrap items-center gap-5">
      <CountChip label="Approved" value={summary.approved} dotClass="bg-emerald-500" />
      <CountChip label="Rejected" value={summary.rejected} dotClass="bg-rose-500" />
      <CountChip label="Flagged" value={summary.flagged_for_review} dotClass="bg-violet-500" />
      <span className="text-sm text-slate-400">· {summary.total_docs} docs</span>
    </div>
  );
}

function DayCard({ day, onViewDetails, isClaimPending }) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:gap-6">
      {/* date block */}
      <div className="flex items-center gap-3 sm:w-44 sm:flex-shrink-0">
        <span className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
          Day {day.day_number}
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-900">{formatDate(day.date)}</div>
          <div className="text-xs text-slate-500">{formatWeekday(day.date)}</div>
        </div>
      </div>

      {/* day summary */}
      <div className="flex-1">
        <SummaryRow summary={day.summary} />
      </div>

      {/* action */}
      <div className="flex justify-end sm:flex-shrink-0">
        <button
          type="button"
          disabled={isClaimPending}
          onClick={() => onViewDetails(day)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 
            ${isClaimPending 
              ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
              : "bg-slate-900 hover:bg-slate-700 focus-visible:outline-slate-900"
            }`}
        >
          View details
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

export default function ClaimDetailsPage() {
  const { claimId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Calling API function in client js
        const result = await claim_details(claimId);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError("Couldn't load this claim. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [claimId]);

  const handleViewDayDetails = (day) => {
  navigate(`/employee-dashboard/my-claims/${claimId}/days/${day.day_number}`, { state: { day } });
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-40 rounded-xl bg-slate-200" />
          <div className="h-24 rounded-xl bg-slate-200" />
          <div className="h-24 rounded-xl bg-slate-200" />
          <div className="h-24 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 px-6 py-8">
        <div className="max-w-sm rounded-xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <div className="text-base font-semibold text-rose-700">Something went wrong</div>
          <p className="mt-2 text-sm text-slate-500">{error || "No data found for this claim."}</p>
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

  // Adjusted destructuring to align with the new consolidated claim structure
  const { claim, overall_summary, days } = data;
  const { claim_id, emp_id, emp_name, status, created_at, trip_start_date, trip_end_date, duration_days, destination } = claim;

  // Business logic check: Disable clicks if the claim is still pending
  const isClaimPending = ["pending", "system pending"].includes((status || "").toLowerCase());

  return (
    <div className="min-h-full bg-slate-50 px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-5xl">
        {/* ---------------- TOP SECTION ---------------- */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400">My Claims / Claim #{claim_id}</div>
              <button onClick={()=>navigate("/employee-dashboard/my-claims")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                Claim #{claim_id}
              </h1>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClasses(status)}`}
            >
              {status}
            </span>
          </div>

          {/* employee + submission meta (expanded column grid to show extra fields) */}
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employee</div>
              <div className="mt-1 text-sm font-medium text-slate-900 truncate">{emp_name}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employee ID</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{emp_id}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Destination</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{destination}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted on</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{formatDate(created_at)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Travel dates</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {formatDate(trip_start_date)} – {formatDate(trip_end_date)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Duration</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{duration_days} days</div>
            </div>
          </div>

          <div className="my-5 h-px bg-slate-100" />

          {/* overall summary across the whole claim */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Overall summary
            </div>
            <SummaryRow summary={overall_summary} />
          </div>
        </div>

        {/* ---------------- DAY-WISE SECTION ---------------- */}
        <div className="mt-7">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Day-wise breakdown
            {isClaimPending && (
              <span className="text-rose-500 font-medium lowercase text-xs ml-2">
                (Processing details — temporarily view-only)
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3.5">
            {days.map((day) => (
              <DayCard 
                key={day.day_number} 
                day={day} 
                onViewDetails={handleViewDayDetails} 
                isClaimPending={isClaimPending} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}