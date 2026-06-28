import { Routes, Route } from "react-router-dom";

import LandingPage from "./pages/landing_Page";
import AdminLogin from "./pages/admin_Login";
import AdminDashboard from "./pages/admin_dashboard";
import ManagePolicies from "./pages/manage_policies";
import Test_Chatbot from "./pages/Test_Chatbot";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeClaimChat from "./pages/Employee_claim_chat";
import EmployeeTravelChat from "./pages/Employee_travel_chat";
import EmployeeLogin from "./pages/employee_Login";

import ProtectedRoute from "./auth/ProtectedRoute";
import RoleRoute from "./auth/RoleRoute";

import UploadClaim from "./pages/Upload_claim";
import MyClaims from "./pages/Myclaims";
import EmployeeClaimDetail from "./pages/Employee_claim_detail";
import DayDetailsPage from "./pages/Employee_day_detail";
import PolicyMetadataPage from "./pages/populate_policy";
import FlaggedReceiptsPage from "./pages/Flagged_receipts";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/employee-login" element={<EmployeeLogin />} />

      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute role="admin">
              <AdminDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manage-policies"
        element={
          <ProtectedRoute>
            <RoleRoute role="admin">
              <ManagePolicies />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/test-chatbot"
        element={
          <ProtectedRoute>
            <RoleRoute role="admin">
              <Test_Chatbot />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee-dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute role="employee">
              <EmployeeDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee-dashboard/claim-chat"
        element={
          <ProtectedRoute>
            <RoleRoute role="employee">
              <EmployeeClaimChat />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee-dashboard/travel-chat"
        element={
          <ProtectedRoute>
            <RoleRoute role="employee">
              <EmployeeTravelChat />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee-dashboard/upload-claim"
        element={
          <ProtectedRoute>
            <RoleRoute role="employee">
              <UploadClaim />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee-dashboard/my-claims"
        element={
          <ProtectedRoute>
            <RoleRoute role="employee">
              <MyClaims />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee-dashboard/my-claims/:claimId"
        element={
            <ProtectedRoute>
                <RoleRoute role="employee">
                    <EmployeeClaimDetail />
                </RoleRoute>
            </ProtectedRoute>
        }
    />
    <Route
    path="/employee-dashboard/my-claims/:claimId/days/:dayNumber"
    element={
        <ProtectedRoute>
            <RoleRoute role="employee">
                <DayDetailsPage />
            </RoleRoute>
        </ProtectedRoute>
    }
    />
    <Route
    path="/populate-policy-metadata"
    element={
        <ProtectedRoute>
            <RoleRoute role="admin">
                <PolicyMetadataPage />
            </RoleRoute>
        </ProtectedRoute>
    }
    />
    <Route
    path="/admin/flagged-receipts"
    element={
        <ProtectedRoute>
            <RoleRoute role="admin">
                <FlaggedReceiptsPage />
            </RoleRoute>
        </ProtectedRoute>
    }
    />
    </Routes>

  );
}