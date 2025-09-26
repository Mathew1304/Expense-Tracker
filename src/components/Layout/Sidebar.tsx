import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  FolderOpen,
  DollarSign,
  Package,
  FileText,
  Users,
  Archive,
  Settings,
  User,
  IndianRupee,
  Layers,
  ShieldCheck,
  Hammer,
  Menu,
  X,
  Building2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  theme: string;
}

export function Sidebar({ theme }: SidebarProps) {
  const location = useLocation();
  const { userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile screen
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsOpen(!mobile); // Always open on desktop, closed on mobile
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isOpen) {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger-button');
        
        if (sidebar && hamburger && 
            !sidebar.contains(event.target as Node) && 
            !hamburger.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    if (isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobile, isOpen]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Dispatch sidebar state to parent components
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebarStateChange', { 
      detail: { isOpen, isMobile } 
    }));
  }, [isOpen, isMobile]);

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      allowedRoles: ["Admin", "Accounts", "Project Manager", "Site Engineer", "Client"],
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      allowedRoles: ["Admin", "Project Manager", "Site Engineer"],
    },
    {
      name: "Phases",
      href: "/phases",
      icon: Layers,
      allowedRoles: ["Admin", "Project Manager", "Site Engineer", "Client"],
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: IndianRupee,
      allowedRoles: ["Admin", "Accounts"],
    },
    {
      name: "Materials",
      href: "/materials",
      icon: Package,
      allowedRoles: ["Admin", "Project Manager"],
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
      allowedRoles: ["Admin", "Project Manager"],
    },
    {
      name: "Document Archive",
      href: "/documents",
      icon: Archive,
      allowedRoles: ["Admin", "Accounts", "Project Manager", "Site Engineer"],
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
      allowedRoles: ["Admin", "Accounts", "Project Manager", "Site Engineer", "Client"],
    },
    {
      name: "Users",
      href: "/users",
      icon: Users,
      allowedRoles: ["Admin"],
    },
    {
      name: "Role Management",
      href: "/roles",
      icon: Settings,
      allowedRoles: ["Admin"],
    },
    {
      name: "Super Admin",
      href: "/super-admin",
      icon: ShieldCheck,
      allowedRoles: ["super_admin"],
    },
  ];

  const filteredItems = navigationItems.filter((item) =>
    item.allowedRoles.includes(userRole ?? "")
  );

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    // Dispatch custom event to notify Layout component
    window.dispatchEvent(new CustomEvent('sidebarToggle', { 
      detail: { isOpen: !isOpen, isMobile } 
    }));
  };

  return (
    <>
      {/* Hamburger Button - Fixed position */}
      <button
        id="hamburger-button"
        onClick={toggleSidebar}
        className={`fixed top-4 left-4 z-50 p-3 rounded-lg shadow-lg transition-all duration-200 ${
          theme === "dark" 
            ? "bg-gray-800 text-white hover:bg-gray-700" 
            : "bg-white text-gray-800 hover:bg-gray-50"
        }`}
        aria-label="Toggle menu"
      >
        <div className="relative w-6 h-6">
          <Menu 
            className={`absolute inset-0 w-6 h-6 transition-all duration-200 ${
              isOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'
            }`} 
          />
          <X 
            className={`absolute inset-0 w-6 h-6 transition-all duration-200 ${
              isOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'
            }`} 
          />
        </div>
      </button>

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed left-0 top-0 h-full z-40 shadow-xl border-r transition-transform duration-200 ease-out ${
          theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
        } ${
          isOpen 
            ? "translate-x-0" 
            : "-translate-x-full"
        } ${
          isMobile ? "w-80" : "w-64"
        }`}
      >
        {/* Header */}
        <div className={`p-6 border-b ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                theme === "dark" ? "bg-blue-600" : "bg-blue-100"
              }`}>
                <Building2 className={`w-6 h-6 ${
                  theme === "dark" ? "text-white" : "text-blue-600"
                }`} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${
                  theme === "dark" ? "text-white" : "text-gray-800"
                }`}>
                  BuildMyHomes
                </h2>
                <p className={`text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  Construction Management
                </p>
              </div>
            </div>
            
            {/* Close button for mobile */}
            {isMobile && (
              <button
                onClick={() => setIsOpen(false)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  theme === "dark" 
                    ? "text-gray-400 hover:text-white hover:bg-gray-800" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`group flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? theme === "dark"
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                          : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                        : theme === "dark"
                        ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg mr-3 transition-all duration-200 ${
                      isActive
                        ? "bg-white/20"
                        : theme === "dark"
                        ? "group-hover:bg-gray-700"
                        : "group-hover:bg-blue-50"
                    }`}>
                      <Icon className={`w-4 h-4 transition-all duration-200 ${
                        isActive 
                          ? "text-white" 
                          : theme === "dark"
                          ? "text-gray-400 group-hover:text-blue-400"
                          : "text-gray-500 group-hover:text-blue-600"
                      }`} />
                    </div>
                    <span className="font-medium">{item.name}</span>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}>
          <div className={`text-center text-xs ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            <p></p>
            <p></p>
          </div>
        </div>
      </aside>

      {/* Spacer for desktop when sidebar is open */}
      {!isMobile && isOpen && (
        <div className="w-64 flex-shrink-0 transition-all duration-200" />
      )}
    </>
  );
}