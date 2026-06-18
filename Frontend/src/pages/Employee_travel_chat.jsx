import { useNavigate } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";

export default function EmployeeTravelChat() {
    const navigate = useNavigate();

    const sessionData = JSON.parse(
        sessionStorage.getItem("employee_travel_session") || "null"
    );

    if (!sessionData) {
        navigate("/employee-dashboard");
        return null;
    }

    const handleEndSession = () => {
        sessionStorage.removeItem("employee_travel_session");
        navigate("/employee-dashboard");
    };

    return (
        <div className="min-h-screen bg-[#111827] text-white flex flex-col">
            <div className="flex-1 flex flex-col overflow-hidden">
                <ChatWindow
                    sessionData={sessionData}
                    storageKey="travel_query"
                    onEndSession={handleEndSession}
                />
            </div>
        </div>
    );
}