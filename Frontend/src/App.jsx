import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landing_page";
import Interraction from "./pages/Interraction";
import AdminLogin from "./pages/admin_Login";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {<Route path="/user-interraction" element={<Interraction />} /> }
      <Route path="/admin-login" element={<AdminLogin />} />
    </Routes>
  );
}