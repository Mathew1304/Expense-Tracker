import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";

export const LandingPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checkedAuth, setCheckedAuth] = useState(false);

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!loading && !checkedAuth) {
      setCheckedAuth(true);
      if (user) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, loading, navigate, checkedAuth]);

  if (!checkedAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Handle plan button click
  const handlePlanClick = (planName: string) => {
    // All plans just require login first
    navigate("/login");
  };

  const pricingPlans = [
    {
      title: "Free Trial",
      price: "₹0 / 30 days",
      features: ["1 Project", "Basic expense tracking", "Upload receipts", "Basic reports", "Email support"],
      button: "Start Free Trial",
    },
    {
      title: "Basic",
      price: "₹2,999 / month",
      features: ["5 Projects", "Full expense tracking", "Vendor management", "Advanced reports", "Priority support", "PDF/Excel export"],
      button: "Choose Basic",
    },
    {
      title: "Pro (Most Popular)",
      price: "₹7,999 / month",
      features: ["Unlimited Projects", "Multi-phase tracking", "Role-based access", "Custom reports", "24/7 support", "API integrations", "Data backup"],
      button: "Choose Pro",
    },
    {
      title: "Enterprise",
      price: "Custom Pricing",
      features: ["Everything in Pro", "Custom integrations", "Dedicated support", "On-site training", "Custom features", "SLA guarantee"],
      button: "Contact Sales",
    },
  ];

  const reviews = [
    { name: "Rajesh Sharma", review: "This app helped us save 15% on construction costs by tracking vendors and labor expenses effectively." },
    { name: "Priya Menon", review: "Clean UI, real-time reports, and reminders made our project management much easier." },
    { name: "Karthik Reddy", review: "Vendor and expense tracking is top-notch. Best tool for builders and contractors." },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="flex justify-between items-center px-8 py-4 shadow-sm bg-white">
        <div className="text-2xl font-bold text-blue-600">BuildMyHomes.in</div>
        <nav className="flex gap-6">
          <a href="#features" className="hover:text-blue-600">Features</a>
          <a href="#pricing" className="hover:text-blue-600">Pricing</a>
          <a href="#reviews" className="hover:text-blue-600">Reviews</a>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/login")}>
            Login
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row justify-between items-center px-10 py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold leading-snug">
            Track Every Rupee in Your <span className="text-blue-600">Construction Project</span>
          </h1>
          <p className="mt-4 text-gray-600">
            Manage expenses, vendor payments, and project costs in real-time.
            Take control of your construction budget with India's most trusted expense tracker.
          </p>
          <div className="flex gap-4 mt-6">
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/login")}>
              Start Free Trial
            </Button>
            <Button variant="outline">Watch Demo</Button>
          </div>
          <div className="mt-4 text-sm text-green-600">
            ✅ 30-day free trial · No credit card required
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gray-50">
        <h2 className="text-3xl font-bold text-center">Features</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-10 max-w-6xl mx-auto px-6">
          {[
            { title: "Project & Phase Tracking", desc: "Track expenses by projects and phases with cost breakdown." },
            { title: "Digital Receipts", desc: "Upload bills, invoices, and receipts with photo proof." },
            { title: "Vendor Management", desc: "Manage suppliers, contractors, architects, and vendors." },
            { title: "Real-time Reports", desc: "Generate instant reports with charts, export to PDF/Excel." },
            { title: "Role-based Access", desc: "Admin, Contractor, and Accountant with role permissions." },
            { title: "Payment Reminders", desc: "Get automated notifications for due payments." },
          ].map((f, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow hover:shadow-md">
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16">
        <h2 className="text-3xl font-bold text-center">Simple, Transparent Pricing</h2>
        <div className="grid md:grid-cols-4 gap-6 mt-10 max-w-6xl mx-auto px-6">
          {pricingPlans.map((plan, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow hover:shadow-md flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-xl">{plan.title}</h3>
                <p className="mt-2 text-gray-600">{plan.price}</p>
                <ul className="mt-4 space-y-2 text-gray-600">
                  {plan.features.map((f, j) => (<li key={j}>✅ {f}</li>))}
                </ul>
              </div>
              <Button
                className="mt-6 bg-orange-500 hover:bg-orange-600 w-full"
                onClick={() => handlePlanClick(plan.title.replace(" (Most Popular)", ""))}
              >
                {plan.button}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-16 bg-gray-50">
        <h2 className="text-3xl font-bold text-center">What Our Customers Say</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-10 max-w-6xl mx-auto px-6">
          {reviews.map((r, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow hover:shadow-md">
              <p className="text-gray-600 italic">“{r.review}”</p>
              <h4 className="mt-4 font-semibold">{r.name}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-600 text-white text-center py-6">
        <p>© {new Date().getFullYear()} BuildMyHomes.in · All rights reserved</p>
      </footer>
    </div>
  );
};

export default LandingPage;
