import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landing_Page";
import Interraction from "./pages/Interraction";
import AdminLogin from "./pages/admin_Login";
import AdminDashboard from "./pages/admin_dashboard";
import ManagePolicies from "./pages/manage_policies";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {<Route path="/user-interraction" element={<Interraction />} /> }
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/manage-policies" element={<ManagePolicies/>}/>
    </Routes>
  );
}