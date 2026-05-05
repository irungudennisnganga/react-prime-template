import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import SideBar from "./components/ui/SideBar";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Targets from './pages/Targets'
import SSLVerifier from "./pages/SSLVerifier";
import Incidents from "./pages/Incidents";
import AgentControl from "./pages/AgentControl";
import AgentDetails from "./pages/AgentDetails";
import ServiceCenter from "./pages/ServiceCenter";
import ServiceDetails from "./pages/ServiceDetails";
import TeamManagement from "./pages/TeamManagement";
import TenantDashboard from "./pages/TenantDashboard";
import Profile from "./pages/Profile";
import AgentReleasesPage from "./pages/AgentRelease/AgentReleasesPage";
import TenantsPage from "./pages/AdminTenantMng/TenantsPage";
// import AlertEmails from "./pages/AlertEmails";
import { AppToastProvider } from "./components/ui/AppToast";
import { useAppSelector } from "./store/hooks";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

import "./App.css";
import AlertEmails from "./pages/AlertEmails";

function ThemeController() {
  const { mode } = useAppSelector((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    localStorage.setItem("app_theme", mode);
  }, [mode]);

  return null;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <SideBar />

      <main className="app-main">{children}</main>
    </div>
  );
}

function DashboardPage() {
  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <p className="page-kicker">Overview</p>
          <h1>Dashboard</h1>
          <p>Welcome to your OpsRadar monitoring dashboard.</p>
        </div>
      </div>
    </AppLayout>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <p className="page-kicker">OpsRadar</p>
          <h1>{title}</h1>
          <p>This page is ready for implementation.</p>
        </div>
      </div>
    </AppLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeController />

      <AppToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/dashboard" element={
            <AppLayout>
              <TenantDashboard />
            </AppLayout>
          } />
          <Route path="/targets" element={
            <AppLayout>
              <Targets />
            </AppLayout>
          } />
          <Route
            path="/ssl-verifier"
            element={
              <AppLayout>
                <SSLVerifier />
              </AppLayout>
            }
          />
          <Route
            path="/incidents"
            element={
              <AppLayout>
                <Incidents />
              </AppLayout>
            }
          />
          <Route
            path="/agents"
            element={
              <AppLayout>
                <AgentControl />
              </AppLayout>
            }
          />

          <Route
            path="/agents/:id"
            element={
              <AppLayout>
                <AgentDetails />
              </AppLayout>
            }
          />
          <Route
            path="/services"
            element={
              <AppLayout>
                <ServiceCenter />
              </AppLayout>
            }
          />

          <Route
            path="/services/:id"
            element={
              <AppLayout>
                <ServiceDetails />
              </AppLayout>
            }
          />
          <Route path="/alerts" element={
            <AppLayout>
            <AlertEmails />
          </AppLayout>
            } />          
          <Route
            path="/team"
            element={<AppLayout>
            <TeamManagement  />
          </AppLayout>}
          />
          <Route
            path="/profile"
            element={
              <AppLayout>
                <Profile />
              </AppLayout>
            }
          />

          <Route
            path="/agent-releases"
            element={
              <AppLayout>
                <AgentReleasesPage />
              </AppLayout>
            }
          />

          <Route
            path="/system-users"
            element={
              <AppLayout>
                <TenantsPage />
              </AppLayout>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AppToastProvider>
    </BrowserRouter>
  );
}

export default App;