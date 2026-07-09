import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import { get_my_claims } from '../api/client';

// Helper to format dates to match screenshot format (e.g., "12 Jun 2024")
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Helper to filter dates by selected range
const isWithinTimeRange = (dateString, range) => {
  if (range === 'any') return true;
  const claimDate = new Date(dateString);
  const now = new Date();
  
  if (range === '30days') {
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    return claimDate >= thirtyDaysAgo;
  }
  if (range === '6months') {
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
    return claimDate >= sixMonthsAgo;
  }
  return true;
};

export default function MyClaims() {
  const navigate = useNavigate(); // Hook initialized for details navigation
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('any');

  // Fetch claims from backend
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const data = await get_my_claims();
        setClaims(data.claims || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch claims');
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, []);

  // Filter Logic
  const filteredClaims = claims.filter((claim) => {
    const normalizedStatus = (claim.status || "").toUpperCase().replace(/\s+/g, '_');
    const matchesStatus =
      statusFilter === 'all' ||
      normalizedStatus === statusFilter.toUpperCase().replace(/\s+/g, '_');

    const matchesTime = isWithinTimeRange(claim.created_at, timeFilter);
    return matchesStatus && matchesTime;
  });

  // Business logic helper to determine if claim card should block navigation
  const isPendingStatus = (status) => {
    const normalized = (status || "").toUpperCase().replace(/\s+/g, '_');
    return normalized === 'PENDING' || normalized === 'SYSTEM_PENDING';
  };

  // Render status badge style helper
  const renderStatusBadge = (status) => {
    const normalizedStatus = (status || "").toUpperCase().replace(/\s+/g, '_');
    
    switch (normalizedStatus) {
      case 'PARTIALLY_APPROVED':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1 rounded-full">
            Partially approved
          </span>
        );
      case 'APPROVED':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1 rounded-full">
            Approved
          </span>
        );
      case 'FLAGGED_FOR_REVIEW':
      case 'REVIEW':
        return (
          <span className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold px-3 py-1 rounded-full">
            Flagged for review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1 rounded-full">
            Rejected
          </span>
        );
      case 'SYSTEM_PENDING': // Added System Pending Visual UI Support
        return (
          <span className="bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold px-3 py-1 rounded-full">
            System pending
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="bg-gray-100 text-gray-600 border border-gray-200 text-xs font-semibold px-3 py-1 rounded-full">
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500 font-sans">
        Loading claims...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto m-6 text-red-500 p-4 border border-red-200 rounded-lg bg-red-50 font-sans">
        Error loading claims: {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen font-sans text-slate-900">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={()=>navigate("/employee-dashboard")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">My claims</h1>
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full md:w-44 bg-white border border-gray-200 rounded-lg py-2 px-3 pr-8 text-sm text-gray-800 font-medium focus:outline-none focus:border-gray-400 cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="partially approved">Partially approved</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
              <option value="flagged for review">Flagged for review</option>
              <option value="system pending">System pending</option> 
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative flex-1 md:flex-initial">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="appearance-none w-full md:w-44 bg-white border border-gray-200 rounded-lg py-2 px-3 pr-8 text-sm text-gray-800 font-medium focus:outline-none focus:border-gray-400 cursor-pointer"
            >
              <option value="any">Any time</option>
              <option value="30days">Last 30 Days</option>
              <option value="6months">Last 6 Months</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white border border-transparent hover:border-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Claims Cards List */}
      <div className="space-y-4">
        {filteredClaims.length > 0 ? (
          filteredClaims.map((claim) => {
            const isBlocked = isPendingStatus(claim.status);
            const normalized = (claim.status || "").toUpperCase().replace(/\s+/g, '_');

            return (
              <div
                key={claim.claim_id}
                className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm transition-all duration-150 ${
                  isBlocked ? "opacity-85" : "hover:shadow-md hover:border-slate-300 "
                }`}
              >
                {/* Upper Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-gray-500 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{claim.claim_id}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 3V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {formatDate(claim.trip_start_date)} → {formatDate(claim.trip_end_date)}
                        </span>
                        <span>•</span>
                        <span>{claim.duration_days} days</span>
                      </div>
                    </div>
                  </div>

                  {/* Date & Status Badges */}
                  <div className="flex items-center gap-3 sm:self-center">
                    <span className="text-xs text-gray-500">
                      Submitted {formatDate(claim.created_at)}
                    </span>
                    {renderStatusBadge(claim.status)}
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-gray-100 my-4" />

                {/* Lower Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Detailed Summary Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-gray-50 text-gray-600 border border-gray-150 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {claim.total_uploads} uploads
                    </span>

                    {/* Show summary badges depending on the status */}
                    {!isBlocked ? (
                      <>
                        {claim.approved_count > 0 && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {claim.approved_count} approved
                          </span>
                        )}
                        {claim.rejected_count > 0 && (
                          <span className="bg-red-50 text-red-700 border border-red-100 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {claim.rejected_count} rejected
                          </span>
                        )}
                        {claim.review_count > 0 && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {claim.review_count} in review
                          </span>
                        )}
                      </>
                    ) : (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        normalized === 'SYSTEM_PENDING' 
                          ? 'bg-sky-50 text-sky-700 border-sky-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {normalized === 'SYSTEM_PENDING' ? 'System setup pending' : 'Validation pending'}
                      </span>
                    )}
                  </div>

                  {/* View details button */}
                  <button 
                    type="button"
                    disabled={isBlocked}
                    onClick={() => navigate(`/employee-dashboard/my-claims/${claim.claim_id}`)}
                    className={`flex items-center gap-1 px-4 py-2 rounded-lg border text-sm font-semibold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-full sm:w-auto justify-center ${
                      isBlocked 
                        ? 'bg-gray-100 text-gray-700 border-gray-200 cursor-not-allowed' 
                        : "bg-slate-900 hover:bg-slate-700 focus-visible:outline-slate-900"
                    }`}
                  >
                    View details
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-xl">
            No claims found matching filters.
          </div>
        )}
      </div>
    </div>
  );
}