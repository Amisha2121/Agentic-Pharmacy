import { useState } from "react";
import { Outlet } from "react-router";
import { BoldSidebar } from "./BoldSidebar";
import { OnboardingTour } from "./OnboardingTour";
import { useAuth } from "../context/AuthContext";

export function RootLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans relative">
      {/* Sidebar */}
      <BoldSidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex relative min-w-0 transition-all duration-300 z-10">
        <Outlet context={{ isSidebarOpen, setIsSidebarOpen }} />
      </div>

      {/* Onboarding tour — shown once on first login */}
      <OnboardingTour uid={user?.uid} />
    </div>
  );
}