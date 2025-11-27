import React, { useState, useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { DisqusChat } from "./DisqusChat";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function Layout({ children, title = "Dashboard", subtitle }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if mobile screen
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true); // Always open on desktop by default
      } else {
        setIsSidebarOpen(false); // Closed by default on mobile
      }
    };

    checkScreenSize();
    setIsInitialized(true); // Mark as initialized after first check
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Listen for sidebar toggle events
  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent) => {
      setIsSidebarOpen(event.detail.isOpen);
    };

    window.addEventListener("sidebarToggle", handleSidebarToggle as EventListener);
    return () => window.removeEventListener("sidebarToggle", handleSidebarToggle as EventListener);
  }, []);

  // Prevent layout shift during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <Sidebar />
      <Header
        title={title}
        subtitle={subtitle}
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main content with smooth transitions */}
      <main
        className={`pt-4 p-6 flex-1 transition-all duration-300 ease-in-out ${
          !isMobile && isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="animate-fadeIn">
          {children}
        </div>
      </main>

      {/* Footer with smooth transitions */}
      <footer
        className={`bg-card border-t border-primary py-4 transition-all duration-300 ease-in-out ${
          !isMobile && isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="text-center text-tertiary text-sm">
          © 2025 BuildMyHomes.in — All Rights Reserved
        </div>
      </footer>

      {/* Disqus Chat Widget */}
      <DisqusChat />
    </div>
  );
}
