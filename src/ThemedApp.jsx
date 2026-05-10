import { BrowserRouter, HashRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme } from "./theme.js";
import { AuthProvider } from "./context/AuthContext.jsx";
import { BookingRequestsProvider } from "./context/BookingRequestsContext.jsx";
import { SyncProvider } from "./sync/SyncContext.jsx";
import { UsersProvider } from "./context/UsersContext.jsx";
import { ProceduresProvider } from "./context/ProceduresContext.jsx";
import { AppointmentsProvider } from "./context/AppointmentsContext.jsx";
import { PatientsProvider } from "./context/PatientsContext.jsx";
import { BillingProvider } from "./context/BillingContext.jsx";
import { useThemeMode } from "./context/ThemeModeContext.jsx";
import App from "./App.jsx";

// Electron injects its name into the user-agent — use it to pick the correct
// router. HashRouter works under file:// (no server); BrowserRouter is kept
// for the web / GitHub-Pages deployment.
const isElectron =
  typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent);

const Router = isElectron ? HashRouter : BrowserRouter;
const routerProps = isElectron ? {} : { basename: import.meta.env.BASE_URL };

export default function ThemedApp() {
  const { darkMode } = useThemeMode();
  const theme = createAppTheme(darkMode ? "dark" : "light");

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router {...routerProps}>
        <AuthProvider>
          <BookingRequestsProvider>
          <SyncProvider>
            <UsersProvider>
              <ProceduresProvider>
                <PatientsProvider>
                  <BillingProvider>
                    <AppointmentsProvider>
                      <App />
                    </AppointmentsProvider>
                  </BillingProvider>
                </PatientsProvider>
              </ProceduresProvider>
            </UsersProvider>
          </SyncProvider>
          </BookingRequestsProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
