import React, { useState } from "react";
import { LogOut, Check, X, Calendar, Clock, Menu, User, Sun, Moon } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigate, Link } from "react-router-dom";
import { NotificationIcon } from "../Notifications/NotificationIcon";

interface HeaderProps {
  title: string;
  subtitle?: string;
  isSidebarOpen?: boolean;
  isMobile?: boolean;
}

export function Header({ title, subtitle, isSidebarOpen = true, isMobile = false }: HeaderProps) {
  const { user, signOut, userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Update time every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Indian Government Holidays 2025
  const indianHolidays = {
    '2025-01-26': 'Republic Day',
    '2025-03-14': 'Holi',
    '2025-04-14': 'Ram Navami',
    '2025-04-18': 'Good Friday',
    '2025-05-01': 'Labour Day',
    '2025-08-15': 'Independence Day',
    '2025-08-16': 'Janmashtami',
    '2025-10-02': 'Gandhi Jayanti',
    '2025-10-20': 'Dussehra',
    '2025-11-01': 'Diwali',
    '2025-11-05': 'Bhai Dooj',
    '2025-12-25': 'Christmas Day',
  };

  // Check if date is Indian holiday
  const isIndianHoliday = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return indianHolidays[dateStr as keyof typeof indianHolidays];
  };

  // Check if date is Sunday
  const isSunday = (date: Date) => {
    return date.getDay() === 0;
  };

  // Logout
  const handleSignOut = async () => {
    try {
      if (user) {
        await signOut();
      }
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      navigate("/login");
    }
  };

  // Handle plan selection
  const handleSelectPlan = (planName: string) => {
    setShowUpgrade(false);

    if (planName === "Enterprise") {
      window.open(
        "https://mail.google.com/mail/?view=cm&fs=1&to=firstmetainfra@gmail.com",
        "_blank"
      );
    } else {
      navigate("/admin/payment", { state: { planName } });
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className={`bg-header shadow-sm border-b border-header px-6 py-4 transition-all duration-200 ${
        !isMobile && isSidebarOpen 
          ? 'ml-64' 
          : isMobile || !isSidebarOpen
          ? 'pl-20'  // Add padding-left when sidebar is closed to account for hamburger button
          : 'ml-0'
      }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-primary truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-secondary mt-1 truncate">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Time and Calendar */}
            <div className="hidden sm:flex items-center space-x-3"> {/* Hide on very small screens */}
              {/* Time Display */}
              <div className="flex items-center space-x-2 text-secondary">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{formatTime(currentTime)}</span>
              </div>

              {/* Calendar Button */}
              <button
                onClick={() => setShowCalendar(true)}
                className="flex items-center space-x-2 px-3 py-2 text-secondary hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-150"
                title="View Calendar"
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium hidden md:inline">Calendar</span>
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 p-3 text-secondary hover:text-primary hover:bg-tertiary rounded-lg transition-colors duration-150 border border-secondary"
              title="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
              <span className="text-sm font-medium hidden sm:inline">
                {theme === 'light' ? 'Dark' : 'Light'}
              </span>
            </button>

            {/* Notifications - Only show for Admin users */}
            {userRole === 'Admin' && (
              <NotificationIcon />
            )}

            {/* Upgrade */}
            <button
              onClick={() => setShowUpgrade(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition-colors duration-150"
            >
              <span className="text-sm">Upgrade</span>
            </button>

            {/* Profile Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-3 text-secondary hover:text-primary hover:bg-tertiary rounded-lg transition-colors duration-150 border border-secondary"
                title="Profile Menu"
              >
                <Menu className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Menu</span>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-modal rounded-lg shadow-xl border border-secondary py-2 z-50">
                  <div className="px-4 py-2 border-b border-secondary">
                    <p className="text-sm font-medium text-primary">
                      {user?.email || 'User'}
                    </p>
                    <p className="text-xs text-tertiary">Manage your account</p>
                  </div>
                  
                  <Link
                    to="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-secondary hover:bg-tertiary transition-colors duration-150"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleSignOut();
                    }}
                    className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Plan Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="rounded-lg shadow-lg w-full max-w-4xl p-6 relative bg-modal text-black max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              onClick={() => setShowUpgrade(false)}
              className="absolute top-4 right-4 text-tertiary hover:text-primary transition-colors duration-150"
            >
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-2xl font-semibold mb-6 text-center text-primary">
              Choose Your Plan
            </h2>

            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Basic */}
              <div className="border rounded-lg p-6 shadow hover:shadow-lg transition-shadow duration-200 bg-card border-secondary">
                <h3 className="text-lg font-semibold mb-2">Basic</h3>
                <p className="text-secondary mb-4">₹1,499 / month</p>
                <ul className="space-y-2 mb-6 text-sm text-secondary">
                  {[
                    "5 Projects",
                    "Full expense tracking",
                    "Vendor management",
                    "Advanced reports",
                    "Priority support",
                    "PDF/Excel export",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan("Basic")}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors duration-150"
                >
                  Choose Basic
                </button>
              </div>

              {/* Pro */}
              <div className="border-2 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-200 relative bg-card border-purple-600">
                <span className="absolute top-2 right-2 text-xs bg-purple-600 text-white px-2 py-1 rounded">
                  Most Popular
                </span>
                <h3 className="text-lg font-semibold mb-2">Pro</h3>
                <p className="text-secondary mb-4">₹3,499 / month</p>
                <ul className="space-y-2 mb-6 text-sm text-secondary">
                  {[
                    "Unlimited Projects",
                    "Multi-phase tracking",
                    "Role-based access",
                    "Custom reports",
                    "24/7 support",
                    "API integrations",
                    "Data backup",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan("Pro")}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors duration-150"
                >
                  Choose Pro
                </button>
              </div>

              {/* Enterprise */}
              <div className="border rounded-lg p-6 shadow hover:shadow-lg transition-shadow duration-200 bg-card border-secondary">
                <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
                <p className="text-secondary mb-4">Custom Pricing</p>
                <ul className="space-y-2 mb-6 text-sm text-secondary">
                  {[
                    "Everything in Pro",
                    "Custom integrations",
                    "Dedicated support",
                    "On-site training",
                    "Custom features",
                    "SLA guarantee",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan("Enterprise")}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors duration-150"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-modal rounded-lg shadow-xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-primary">Calendar</h2>
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                className="text-tertiary hover:text-secondary transition-colors duration-150"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Month/Year Navigation */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCalendarDate(newDate);
                }}
                className="p-2 hover:bg-tertiary rounded-lg transition-colors duration-150"
              >
                <span className="text-lg font-bold text-secondary">‹</span>
              </button>
              
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div className="text-sm text-secondary">
                  {formatDate(new Date())}
                </div>
              </div>
              
              <button
                onClick={() => {
                  const newDate = new Date(calendarDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCalendarDate(newDate);
                }}
                className="p-2 hover:bg-tertiary rounded-lg transition-colors duration-150"
              >
                <span className="text-lg font-bold text-secondary">›</span>
              </button>
            </div>

            {/* Mini Calendar */}
            <div className="mb-6">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-tertiary mb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 42 }, (_, i) => {
                  const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
                  const firstDay = date.getDay();
                  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
                  const dayNumber = i - firstDay + 1;
                  const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                  
                  const cellDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), dayNumber);
                  const today = new Date();
                  const isToday = isCurrentMonth && 
                    dayNumber === today.getDate() && 
                    calendarDate.getMonth() === today.getMonth() && 
                    calendarDate.getFullYear() === today.getFullYear();
                  
                  const isHoliday = isCurrentMonth && isIndianHoliday(cellDate);
                  const isSundayDate = isCurrentMonth && isSunday(cellDate);
                  const isRedDate = isHoliday || isSundayDate;
                  
                  return (
                    <div
                      key={i}
                      className={`h-10 w-10 flex items-center justify-center text-sm rounded cursor-pointer transition-colors duration-150 ${
                        isCurrentMonth
                          ? isToday
                            ? 'bg-blue-600 text-white font-bold'
                            : isRedDate
                            ? 'text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-primary hover:bg-tertiary'
                          : 'text-tertiary'
                      }`}
                      title={isHoliday ? isIndianHoliday(cellDate) : isSundayDate ? 'Sunday' : ''}
                      onClick={() => {
                        if (isCurrentMonth) {
                          const selectedDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), dayNumber);
                          console.log('Selected date:', selectedDate.toDateString());
                        }
                      }}
                    >
                      {isCurrentMonth ? dayNumber : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center items-center space-x-4 mb-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span className="text-secondary">Today</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-secondary">Holidays & Sundays</span>
              </div>
            </div>

            {/* Close Button */}
            <div className="text-center">
              <button
                onClick={() => setShowCalendar(false)}
                className="px-4 py-2 bg-tertiary text-secondary rounded-lg hover:bg-secondary hover:text-primary transition-colors duration-150"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}