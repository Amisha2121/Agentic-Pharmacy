import { useState } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { OnboardingTour } from "./OnboardingTour";

export function RootLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#09090B] overflow-hidden font-sans relative">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex relative min-w-0 transition-all duration-300 z-10">
        <Outlet context={{ isSidebarOpen, setIsSidebarOpen }} />
      </div>

      {/* Onboarding tour — shown once on first login */}
      <OnboardingTour />
    </div>
  );
}