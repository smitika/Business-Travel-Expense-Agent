import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { employee_login } from "../api/client";

export default function EmployeeLogin() {
    const navigate = useNavigate();
    const [empId, setEmpId] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleClick = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await employee_login({emp_id: empId,password: password});

            localStorage.setItem("token", res.access_token);
            localStorage.setItem("role", "employee");
            localStorage.setItem("emp_name", res.emp_name);

            navigate("/employee-dashboard", { replace: true, state: { empId } });

        } catch (err) {
            setError(
                err?.response?.data?.detail ||
                "Invalid credentials"
            );
        } finally {
            setLoading(false);
        }
};

    return (
        <div className="h-screen bg-[#F1F5F9] text-gray-800 flex items-center justify-center px-6">

            <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Employee Login
                    </h1>

                    <p className="text-gray-500 mt-2 text-sm">
                        Sign in to query, submit and track expense claims
                    </p>
                </div>

                {/* Login Form */}
                <div className="space-y-5">

                    <div>
                        <label className="block text-sm text-gray-600 mb-2">
                            Employee ID
                        </label>

                        <input
                            value={empId}
                            onChange={(e) => setEmpId(e.target.value)}
                            type="text"
                            placeholder="Enter your employee ID"
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-2">
                            Password
                        </label>

                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            placeholder="Enter your password"
                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                        />
                    </div>

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
                    <button
                        onClick={() => navigate("/")}
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