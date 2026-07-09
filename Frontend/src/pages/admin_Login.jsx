import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { admin_login } from "../api/client";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
    const navigate = useNavigate();
    const [adminID, setadminID] = useState("");
    const [adminpwd, setadminpwd] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleClick = async () => {
      try {
          setLoading(true);
          setError("");

          const res = await admin_login({
              admin_id: adminID,
              password: adminpwd
          });

          localStorage.setItem("token", res.access_token);
          localStorage.setItem("role", "admin");

          navigate("/admin-dashboard", {
              replace: true,
              state: { adminID }
          });

      } catch (err) {
          setError(
              err?.response?.data?.detail ||
              "Invalid credentials"
          );
      } finally {
          setLoading(false);
      }
    };

    // Trigger handleClick when user presses the Enter key
    const handleKeyDown = (e) => {
      if (e.key === "Enter" && !loading) {
        handleClick();
      }
    };

  return (
    <div className="h-screen bg-[#F1F5F9] text-gray-800 flex items-center justify-center px-6">

  <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

    {/* Header */}
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold text-gray-800">
        Administrator Login
      </h1>

      <p className="text-gray-500 mt-2 text-sm">
        Sign in to manage policies and reimbursement requests
      </p>
    </div>

    {/* Login Form */}
    <div className="space-y-5">

      <div>
        <label className="block text-sm text-gray-600 mb-2">
          Admin ID
        </label>

        <input
          value={adminID}
          onChange={(e) => setadminID(e.target.value)}
          onKeyDown={handleKeyDown}
          type="text"
          placeholder="Enter your admin ID"
          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-2">
          Password
        </label>
        <div className="relative">
        <input
          value={adminpwd}
          onChange={(e) => setadminpwd(e.target.value)}
          onKeyDown={handleKeyDown}
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none outline-none flex items-center justify-center"
        >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm mt-2 font-medium">
          {error}
        </div>
      )}

      <button
          onClick={handleClick}
          disabled={loading}
          className={`w-full py-3 rounded text-white font-semibold shadow-sm transition-all duration-200
            ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
            }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 
                    0 0 5.373 0 12h4zm2 
                    5.291A7.962 7.962 0 014 
                    12H0c0 3.042 1.135 
                    5.824 3 7.938l3-2.647z"
                />
              </svg>

              Logging in...
            </div>
          ) : (
            "Login"
          )}
      </button>
      <button onClick={() => navigate("/")}
        className="w-full py-3 rounded bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 active:scale-[0.98]"
      >
        Back to Home
      </button>
    </div>

    {/* Footer */}
    <div className="mt-8 text-center text-xs text-gray-400">
      Enterprise Travel Expense Management System
    </div>
  </div>
</div>
  );
}