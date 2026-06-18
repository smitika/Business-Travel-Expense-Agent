import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landing_Page";
import Interraction from "./pages/Interraction";
import AdminLogin from "./pages/admin_Login";
import AdminDashboard from "./pages/admin_dashboard";
import ManagePolicies from "./pages/manage_policies";
import Test_Chatbot from "./pages/Test_Chatbot";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeClaimChat from "./pages/Employee_claim_chat";
import EmployeeTravelChat from "./pages/Employee_travel_chat";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {<Route path="/user-interraction" element={<Interraction />} /> }
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/manage-policies" element={<ManagePolicies/>}/>
      <Route path = "/test-chatbot" element = {<Test_Chatbot/>}/>
      <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
      <Route path="/employee-dashboard/claim-chat" element={<EmployeeClaimChat />} />
      <Route path="/employee-dashboard/travel-chat" element={<EmployeeTravelChat />} /> 
    </Routes>
  );
}