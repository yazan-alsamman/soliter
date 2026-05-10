import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Appointments from "./pages/Appointments.jsx";
import Patients from "./pages/Patients.jsx";
import PatientDetail from "./pages/PatientDetail.jsx";
import Billing from "./pages/Billing.jsx";
import Inventory from "./pages/Inventory.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import DoctorProcedures from "./pages/DoctorProcedures.jsx";
import BookingRequestsQueue from "./pages/BookingRequestsQueue.jsx";
import NotAllowed from "./pages/NotAllowed.jsx";
import Login from "./pages/Login.jsx";
import PatientPortalLayout from "./patient-portal/PatientPortalLayout.jsx";
import PortalLanding from "./patient-portal/pages/Landing.jsx";
import PortalServices from "./patient-portal/pages/Services.jsx";
import PortalOffers from "./patient-portal/pages/Offers.jsx";
import PortalDoctors from "./patient-portal/pages/Doctors.jsx";
import PortalLogin from "./patient-portal/pages/PortalLogin.jsx";
import PortalDashboard from "./patient-portal/pages/PortalDashboard.jsx";
import RequestBooking from "./patient-portal/pages/RequestBooking.jsx";
import PortalNotifications from "./patient-portal/pages/PortalNotifications.jsx";
import { SuperAdminAuthProvider } from "./super-admin/SuperAdminAuthContext.jsx";
import AdminRoutes from "./super-admin/AdminRoutes.jsx";

function Protected({ allow, children }) {
  const { can, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return can(allow) ? children : <Navigate to="/not-allowed" replace />;
}

/** Must be logged in (any role). Prevents unauthenticated “guest” use of the shell. */
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <SuperAdminAuthProvider>
            <AdminRoutes />
          </SuperAdminAuthProvider>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/portal" element={<PatientPortalLayout />}>
        <Route index element={<PortalLanding />} />
        <Route path="services" element={<PortalServices />} />
        <Route path="offers" element={<PortalOffers />} />
        <Route path="doctors" element={<PortalDoctors />} />
        <Route path="login" element={<PortalLogin />} />
        <Route path="dashboard" element={<PortalDashboard />} />
        <Route path="request" element={<RequestBooking />} />
        <Route path="notifications" element={<PortalNotifications />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Route>
      {/* Relative child paths: required for pathless layout + Outlet matching (RR7). */}
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        <Route
          path="dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="appointments"
          element={
            <Protected allow="appointments.view">
              <Appointments />
            </Protected>
          }
        />
        <Route
          path="booking-requests"
          element={
            <Protected allow="bookingRequests">
              <BookingRequestsQueue />
            </Protected>
          }
        />
        <Route path="schedule" element={<Navigate to="/appointments" replace />} />
        <Route path="my-schedule" element={<Navigate to="/appointments" replace />} />
        <Route
          path="patients"
          element={
            <Protected allow="patients.view">
              <Patients />
            </Protected>
          }
        />
        <Route
          path="patients/:id"
          element={
            <Protected allow="patients.view">
              <PatientDetail />
            </Protected>
          }
        />
        <Route
          path="billing"
          element={
            <Protected allow="billing.view">
              <Billing />
            </Protected>
          }
        />
        <Route
          path="inventory"
          element={
            <Protected allow="inventory">
              <Inventory />
            </Protected>
          }
        />
        <Route
          path="reports"
          element={
            <Protected allow="reports">
              <Reports />
            </Protected>
          }
        />
        <Route
          path="procedures"
          element={
            <Protected allow="procedures.view">
              <DoctorProcedures />
            </Protected>
          }
        />
        <Route
          path="settings"
          element={
            <Protected allow="settings">
              <Settings />
            </Protected>
          }
        />
        <Route
          path="not-allowed"
          element={
            <RequireAuth>
              <NotAllowed />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Route>
    </Routes>
  );
}
