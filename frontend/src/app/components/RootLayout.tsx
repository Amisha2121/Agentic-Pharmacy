import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { BoldSidebar } from "./BoldSidebar";

const PREFS_KEY = 'pharma_prefs_v1';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); }
  catch { return {}; }
}

export function RootLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  useEffect(() => {
    const prefs = loadPrefs();
    const theme = prefs.theme || 'light';
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    const handleStorageChange = () => {
      const updatedPrefs = loadPrefs();
      const updatedTheme = updatedPrefs.theme || 'light';
      
      if (updatedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
      const currentPrefs = loadPrefs();
      const currentTheme = currentPrefs.theme || 'light';
      const hasClass = document.documentElement.classList.contains('dark');
      
      if (currentTheme === 'dark' && !hasClass) {
        document.documentElement.classList.add('dark');
      } else if (currentTheme === 'light' && hasClass) {
        document.documentElement.classList.remove('dark');
      }
    }, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0F172A] overflow-hidden font-sans relative transition-colors duration-300">
      <BoldSidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />
      
      <div className="flex-1 flex relative min-w-0 transition-all duration-300 z-10">
        <Outlet context={{ isSidebarOpen, setIsSidebarOpen }} />
      </div>
    </div>
  );
}