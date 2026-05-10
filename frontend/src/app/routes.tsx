import { createBrowserRouter, Navigate, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { RootLayout } from "./components/RootLayout";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { AssistantChat } from "./pages/AssistantChat";
import { LiveInventory } from "./pages/LiveInventory";
import { LogDailySales } from "./pages/LogDailySales";
import { ReorderAlerts } from "./pages/ReorderAlerts";
import { ExpiredItems } from "./pages/ExpiredItems";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { SalesHistoryStandalone } from "./pages/SalesHistoryStandalone";
import { useAuth } from "./context/AuthContext";
import type { ReactNode } from "react";
import { Home } from "lucide-react";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // wait for Firebase session restore
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ErrorBoundary() {
  const error = useRouteError();
  const isRouteError = isRouteErrorResponse(error);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full bg-white border-2 border-[#0F172A] rounded-xl p-6 sm:p-8 text-center">
        <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <span className="text-[24px] sm:text-[32px] font-black text-[#EF4444]">!</span>
        </div>
        <h1 className="text-[20px] sm:text-[24px] font-black uppercase text-[#0F172A] mb-2 sm:mb-3 tracking-tight">
          {isRouteError && error.status === 404 ? 'PAGE NOT FOUND' : 'SOMETHING WENT WRONG'}
        </h1>
        <p className="text-[13px] sm:text-[14px] text-[#64748B] mb-5 sm:mb-6">
          {isRouteError && error.status === 404
            ? "The page you're looking for doesn't exist."
            : 'An unexpected error occurred. Please try again.'}
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white px-5 sm:px-6 py-2.5 sm:py-3 font-black uppercase text-[12px] sm:text-[13px] tracking-wide transition-all"
          style={{ borderRadius: '999px' }}
        >
          <Home className="w-4 h-4" strokeWidth={3} />
          GO HOME
        </a>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/login",
    Component: Login,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/signup",
    Component: Signup,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/reports/sales-history",
    element: (
      <RequireAuth>
        <SalesHistoryStandalone />
      </RequireAuth>
    ),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/dashboard",
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, Component: Dashboard },
      { path: "chat", Component: AssistantChat },
      { path: "inventory", Component: LiveInventory },
      { path: "sales", Component: LogDailySales },
      { path: "reorder", Component: ReorderAlerts },
      { path: "expired", Component: ExpiredItems },
      { path: "settings", Component: Settings },
      { path: "*", element: <ErrorBoundary /> },
    ],
  },
  {
    path: "*",
    element: <ErrorBoundary />,
  },
]);