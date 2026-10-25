import { PatientPortalAuthProvider } from "./context/PatientPortalAuthContext.jsx";
import PortalShell from "./layouts/PortalShell.jsx";

/** Layout route: auth provider + shell with `<Outlet />` (single Routes tree in App — RR7-safe). */
export default function PatientPortalLayout() {
  return (
    <PatientPortalAuthProvider>
      <PortalShell />
    </PatientPortalAuthProvider>
  );
}
