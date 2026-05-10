import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { BoldSidebar } from "./BoldSidebar";
import { Menu, X } from "lucide-react";

const PREFS_KEY = 'pharma_prefs_v1';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); }
  catch { return {}; }
}

export function RootLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true); // Always open on desktop
      } else {
        setIsSidebarOpen(false); // Closed by default on mobile
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-[#1E293B] border-2 border-[#0F172A] dark:border-[#F8FAFC] rounded-lg shadow-lg md:hidden"
          aria-label="Toggle menu"
        >
          {isSidebarOpen ? (
            <X className="w-6 h-6 text-[#0F172A] dark:text-[#F8FAFC]" strokeWidth={2.5} />
          ) : (
            <Menu className="w-6 h-6 text-[#0F172A] dark:text-[#F8FAFC]" strokeWidth={2.5} />
          )}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <BoldSidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobile={isMobile}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex relative min-w-0 transition-all duration-300 z-10">
        <Outlet context={{ isSidebarOpen, setIsSidebarOpen }} />
      </div>
    </div>
  );
}