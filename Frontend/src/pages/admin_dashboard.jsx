import { useNavigate } from "react-router-dom";
export default function AdminDashboard() {
    const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0b1120] text-white">

      {/* Navbar */}
      <nav className="h-16 border-b border-gray-700 bg-[#1E293B] px-8 flex items-center justify-between">

        <h1 className="text-2xl font-bold tracking-wide">
          ADMIN DASHBOARD
        </h1>

        <div className="flex gap-3">
          <button
            onClick={() => {
              localStorage.removeItem("role");
              navigate("/");
            }}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition"
          >
            Logout
          </button>

        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Manage Policies */}
          <div onClick={()=>navigate("/manage-policies")}
            className="bg-[#1f2937] border border-gray-700 rounded-2xl p-8 hover:border-blue-500 hover:scale-105 transition cursor-pointer"
          >
            <div className="text-5xl mb-5">📑</div>

            <h2 className="text-xl font-bold mb-3">
              Manage Policies
            </h2>

            <p className="text-gray-400">
              Upload, activate, deactivate and archive travel policies.
            </p>
          </div>

          {/* Test Chatbot */}
          <div onClick={()=>navigate("/test-chatbot")}
            className="bg-[#1f2937] border border-gray-700 rounded-2xl p-8 hover:border-blue-500 hover:scale-105 transition cursor-pointer"
          >
            <div className="text-5xl mb-5">🤖</div>

            <h2 className="text-xl font-bold mb-3">
              Test Chatbot
            </h2>

            <p className="text-gray-400">
              Interact with the travel assistant using active policies.
            </p>
          </div>

          {/* Review Receipts */}
          <div
            className="bg-[#1f2937] border border-gray-700 rounded-2xl p-8 hover:border-blue-500 hover:scale-105 transition cursor-pointer"
          >
            <div className="text-5xl mb-5">🧾</div>

            <h2 className="text-xl font-bold mb-3">
              Review Receipts
            </h2>

            <p className="text-gray-400">
              Review reimbursement requests submitted by employees.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}