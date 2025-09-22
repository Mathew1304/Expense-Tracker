import React from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function Layout({ children, title = "Dashboard", subtitle }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Sidebar />
      <Header title={title} subtitle={subtitle} />
      <main className="ml-64 pt-4 p-6 flex-1">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 ml-64 py-4">
        <div className="text-center text-gray-500 text-sm">
          © 2025 BuildMyHomes.in — All Rights Reserved
        </div>
      </footer>
    </div>
  );
}