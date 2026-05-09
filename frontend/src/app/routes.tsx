import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "./components/RootLayout";
import { AssistantChat } from "./pages/AssistantChat";
import { LiveInventory } from "./pages/LiveInventory";
import { LogDailySales } from "./pages/LogDailySales";
import { ReorderAlerts } from "./pages/ReorderAlerts";
import { ExpiredItems } from "./pages/ExpiredItems";
import { DrugInteractions } from "./pages/DrugInteractions";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { useAuth } from "./context/AuthContext";
import type { ReactNode } from "react";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null; // wait for Firebase session restore
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, Component: AssistantChat },
      { path: "inventory", Component: LiveInventory },
      { path: "sales", Component: LogDailySales },
      { path: "reorder", Component: ReorderAlerts },
      { path: "expired", Component: ExpiredItems },
      { path: "interactions", Component: DrugInteractions },
      { path: "settings", Component: Settings },
    ],
  },
]);