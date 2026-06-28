import { useNavigate } from "react-router-dom";
import { FileText, Bot, Receipt , Database} from "lucide-react";

export default function AdminDashboard() {
    const navigate = useNavigate();

    const cards = [
        {
            icon: <FileText size={22} className="text-blue-500" />,
            iconBg: "bg-blue-50",
            title: "Upload and Activate Policy",
            description: "Upload, activate, deactivate and archive travel policies.",
            onClick: () => navigate("/manage-policies"),
        },
        {
            icon: <Bot size={22} className="text-violet-500" />,
            iconBg: "bg-violet-50",
            title: "Test Chatbot",
            description: "Interact with the travel assistant using active policies.",
            onClick: () => navigate("/test-chatbot"),
        },
        {
            icon: <Receipt size={22} className="text-emerald-500" />,
            iconBg: "bg-emerald-50",
            title: "Review Flagged Receipts",
            description: "Review reimbursement requests submitted by employees.",
            onClick: ()=> navigate("/admin/flagged-receipts"),
        },
        {
            icon: <Database size={22} className="text-indigo-500" />,
            iconBg: "bg-indigo-50",
            title:"Extract Policy Metadata",
            description: "Extraction of validation metadata from policy for flagged receipts.",
            onClick : ()=>navigate("/populate-policy-metadata"),
        },
    ];

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-gray-800">

            {/* Navbar */}
            <nav className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm">
                <h1 className="text-lg font-semibold text-gray-700 tracking-wide">
                    Admin Dashboard
                </h1>
                <button
                    onClick={() => {
                        localStorage.removeItem("role");
                        navigate("/");
                    }}
                    className="px-4 py-2 rounded-lg text-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition"
                >
                    Logout
                </button>
            </nav>

            {/* Main */}
            <div className="max-w-5xl mx-auto px-8 py-14">

                <p className="text-sm text-gray-400 uppercase tracking-widest mb-8">
                    What would you like to do?
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {cards.map((card) => (
                        <div
                            key={card.title}
                            onClick={card.onClick || undefined}
                            className={`bg-white border border-gray-200 rounded-2xl p-7 shadow-sm transition-all duration-200
                                ${card.onClick
                                    ? "cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-1"
                                    : "opacity-50 cursor-not-allowed"
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-5`}>
                                {card.icon}
                            </div>
                            <h2 className="text-base font-semibold text-gray-800 mb-2">
                                {card.title}
                            </h2>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                {card.description}
                            </p>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
