import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useSuperAdminAuth } from "./SuperAdminAuthContext.jsx";
import AdminLayout from "./AdminLayout.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminClinics from "./pages/AdminClinics.jsx";
import CreateClinicWizard from "./pages/CreateClinicWizard.jsx";
import AdminSubscriptions from "./pages/AdminSubscriptions.jsx";
import AdminAudit from "./pages/AdminAudit.jsx";
import AdminHealth from "./pages/AdminHealth.jsx";

function RequireSuper() {
  const { isAuthenticated } = useSuperAdminAuth();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route element={<RequireSuper />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="clinics" element={<AdminClinics />} />
          <Route path="create-clinic" element={<CreateClinicWizard />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="health" element={<AdminHealth />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
