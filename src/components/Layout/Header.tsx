import React, { useState } from "react";
import { LogOut, CircleUserRound, Check, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);

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

  return (
    <>
      <div className="ml-64 bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center space-x-6">
            {/* Profile */}
            <Link to="/profile">
              <CircleUserRound className="w-7 h-7 cursor-pointer text-gray-700 hover:text-gray-900" />
            </Link>

            {/* Upgrade */}
            <button
              onClick={() => setShowUpgrade(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition"
            >
              Upgrade Plan
            </button>

            {/* Logout */}
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Plan Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
          <div className="rounded-lg shadow-lg w-[900px] p-8 relative bg-white text-black">
            {/* Close */}
            <button
              onClick={() => setShowUpgrade(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800">
              Choose Your Plan
            </h2>

            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Basic */}
              <div className="border rounded-lg p-6 shadow hover:shadow-lg transition bg-white border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Basic</h3>
                <p className="text-gray-600 mb-4">₹2,999 / month</p>
                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                  {[
                    "5 Projects",
                    "Full expense tracking",
                    "Vendor management",
                    "Advanced reports",
                    "Priority support",
                    "PDF/Excel export",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-4 h-4 text-green-600 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan("Basic")}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition"
                >
                  Choose Basic
                </button>
              </div>

              {/* Pro */}
              <div className="border-2 rounded-lg p-6 shadow-lg hover:shadow-xl transition relative bg-white border-purple-600">
                <span className="absolute top-2 right-2 text-xs bg-purple-600 text-white px-2 py-1 rounded">
                  Most Popular
                </span>
                <h3 className="text-lg font-semibold mb-2">Pro</h3>
                <p className="text-gray-600 mb-4">₹7,999 / month</p>
                <ul className="space-y-2 mb-6 text-sm text-gray-700">
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
                      <Check className="w-4 h-4 text-green-600 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan("Pro")}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition"
                >
                  Choose Pro
                </button>
              </div>

              {/* Enterprise */}
              <div className="border rounded-lg p-6 shadow hover:shadow-lg transition bg-white border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Enterprise</h3>
                <p className="text-gray-600 mb-4">Custom Pricing</p>
                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                  {[
                    "Everything in Pro",
                    "Custom integrations",
                    "Dedicated support",
                    "On-site training",
                    "Custom features",
                    "SLA guarantee",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-4 h-4 text-green-600 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan("Enterprise")}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}