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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Sidebar />
      <Header
        title={title}
        subtitle={subtitle}
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main content without transitions */}
      <main
        className={`pt-4 p-6 flex-1 ${
          !isMobile && isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        {children}
      </main>

      {/* Footer without transitions */}
      <footer
        className={`bg-white border-t border-gray-200 py-4 ${
          !isMobile && isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="text-center text-gray-500 text-sm">
          © 2025 BuildMyHomes.in — All Rights Reserved
        </div>
      </footer>

      {/* Disqus Chat Widget */}
      <DisqusChat />
    </div>
  );
}
