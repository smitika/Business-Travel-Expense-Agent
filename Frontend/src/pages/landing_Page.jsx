import { useState} from "react";
import { useNavigate } from "react-router-dom";
import { ingestion } from "../api/client";
import { checkPolicyIngested } from "../api/client";


export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <div className="h-screen bg-[#0b1120] text-white flex items-center justify-center px-6">

      <div className="w-full max-w-4xl">

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
          SmartHelp AI Assistant
          </h1>

          <p className="text-gray-400 text-lg">
            Intelligent policy assistance and travel expense management
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* Admin Card */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">

            <div className="text-4xl mb-4">🛠️</div>

            <h2 className="text-2xl font-bold mb-2">
              Administrator
            </h2>

            <p className="text-gray-400 mb-8">
              Upload and update policies, manage reimbursement requests.
            </p>

            <button onClick={()=> navigate("/admin-login")}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition"
            >
              Login as Admin
            </button>

          </div>

          {/* Employee Card */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 hover:border-green-500 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">

            <div className="text-4xl mb-4">👤</div>

            <h2 className="text-2xl font-bold mb-2">
              Employee
            </h2>

            <p className="text-gray-400 mb-8">
              Ask policy questions, upload receipts, and submit claims for reimbursement.
            </p>

            <button onClick={()=> navigate("/employee-dashboard")}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition"
            >
              Continue as Employee
            </button>

          </div>

        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-sm text-gray-500">
          Business Travel Expense Management System
        </div>

      </div>

    </div>
  );
}