import {useNavigate} from "react-router-dom";
export default function AdminLogin() {
    const navigate = useNavigate();
    const handleClick = () => {
        localStorage.setItem("role", "admin");
        navigate("/user-interraction",{ replace: true });
    }
  return (
    <div className="h-screen bg-[#0b1120] text-white flex items-center justify-center px-6">

      <div className="w-full max-w-md bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-xl">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            Administrator Login
          </h1>

          <p className="text-gray-400 mt-2 text-sm">
            Sign in to manage policies and reimbursement requests
          </p>
        </div>

        {/* Login Form */}
        <div className="space-y-5">

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Admin ID
            </label>

            <input
              type="text"
              placeholder="Enter your admin ID"
              className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              className="w-full bg-[#0b1120] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
            />
          </div>

          <button onClick={()=> handleClick()}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold transition"
          >
            Login
          </button>
          <button onClick={()=> navigate("/")}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition"
          >
            Back to Home
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          Enterprise Travel Expense Management System
        </div>
      </div>
    </div>
  );
}