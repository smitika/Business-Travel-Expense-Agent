import { useState} from "react";
import { useNavigate } from "react-router-dom";
import { ingestion } from "../api/client";
import { checkPolicyIngested } from "../api/client";
import { Sparkles, ShieldCheck, User } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center px-6">

  <div className="w-full max-w-4xl">

    {/* Brand mark */}
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
        <Sparkles size={16} className="text-blue-600" />
      </div>
      <span className="text-2xl font-medium text-slate-500">SmartHelp</span>
    </div>

    {/* Hero Section */}
    <div className="text-center mb-12">
      <h1 className="text-3xl font-semibold mb-3 text-slate-900 tracking-tight">
        Travel expense management
      </h1>

      <p className="text-slate-500 text-base">
        Intelligent policy assistance and travel expense management
      </p>
    </div>

    {/* Role Selection Cards */}
    <div className="grid md:grid-cols-2 gap-5">

      {/* Admin Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-300 transition-all duration-200 hover:shadow-md">

        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
          <ShieldCheck size={20} className="text-blue-600" />
        </div>

        <h2 className="text-base font-semibold mb-1.5 text-slate-900">
          Administrator
        </h2>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Upload and update policies, manage reimbursement requests.
        </p>

        <button onClick={()=> navigate("/admin-login")}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition active:scale-[0.98]"
        >
          Login as Admin
        </button>

      </div>

      {/* Employee Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-7 hover:border-slate-300 transition-all duration-200 hover:shadow-md">

        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-5">
          <User size={20} className="text-emerald-600" />
        </div>

        <h2 className="text-base font-semibold mb-1.5 text-slate-900">
          Employee
        </h2>

        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Ask policy questions, upload receipts, and submit claims for reimbursement.
        </p>

        <button onClick={()=> navigate("/employee-login")}
          className="w-full py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-sm font-medium transition active:scale-[0.98]"
        >
          Continue as Employee
        </button>

      </div>

    </div>

    {/* Footer */}
    <div className="text-center mt-10 text-xs text-slate-400">
      Business Travel Expense Management System
    </div>

  </div>

</div>
  );
}