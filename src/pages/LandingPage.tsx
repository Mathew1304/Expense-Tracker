import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useAnimation, useInView } from "framer-motion";
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { CheckCircle, ArrowRight, Star, Users, Shield, Zap } from "lucide-react";

const AnimatedSection: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const controls = useAnimation();
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (inView) {
      controls.start("visible");
    }
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      animate={controls}
      initial="hidden"
      variants={{
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay } },
        hidden: { opacity: 0, y: 50 }
      }}
    >
      {children}
    </motion.div>
  );
};

const FloatingCard: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="h-full"
  >
    {children}
  </motion.div>
);

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

  // Show loader until auth is checked
  if (!checkedAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Handle plan selection
  const handlePlanSelect = async (planName: string) => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("id")
        .eq("name", planName)
        .single();

      if (planError) throw planError;

      const { error } = await supabase
        .from("profiles")
        .update({
          plan_id: plan.id,
          subscription_start: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      alert(`✅ You have successfully selected the ${planName} plan!`);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("❌ Something went wrong while updating your plan.");
    }
  };

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50 -z-10">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />
      </div>

      {/* Navbar */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-50 bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent"
            >
              BuildMyHomes.in
            </motion.div>
            <nav className="hidden md:flex gap-8">
              {["Features", "Pricing", "Reviews"].map((item, index) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -2 }}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  {item}
                </motion.a>
              ))}
              <Link to="/login" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
                Login
              </Link>
            </nav>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/login">
                <Button>Start Free Trial</Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <motion.h1
                  className="text-5xl md:text-6xl font-bold leading-tight"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  Track Every Rupee in Your{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                    Construction Project
                  </span>
                </motion.h1>
                <motion.p
                  className="text-xl text-gray-600 mt-6 max-w-2xl leading-relaxed"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  Manage expenses, vendor payments, and project costs in real-time.
                  Take control of your construction budget with India's most trusted
                  expense tracker.
                </motion.p>
                <motion.div
                  className="flex flex-col sm:flex-row gap-4 mt-8"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  <Link to="/login">
                    <Button size="lg" className="group">
                      Start Free Trial
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg">
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.3 }}>
                      <Zap className="w-5 h-5 mr-2" />
                    </motion.div>
                    Watch Demo
                  </Button>
                </motion.div>
                <motion.div
                  className="flex items-center gap-2 mt-6 text-green-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">30-day free trial · No credit card required</span>
                </motion.div>
              </motion.div>
            </div>

            {/* Hero Image with Dashboard Preview */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative"
              >
                <img
                  src="/10090537.jpg"
                  alt="Construction Financial Management"
                  className="w-full h-96 object-cover rounded-2xl shadow-2xl"
                />
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="absolute -bottom-8 -left-8 bg-white shadow-2xl rounded-xl p-6 w-80 border border-gray-100"
                >
                  <h3 className="font-bold text-lg text-gray-800 mb-3">Project Dashboard</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Budget</span>
                      <span className="font-bold text-blue-600 text-lg">₹25,50,000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Spent</span>
                      <span className="font-bold text-orange-500 text-lg">₹18,75,000</span>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      {[
                        { label: "🏗️ Materials", amount: "₹8,50,000", color: "text-green-600" },
                        { label: "👷 Labor", amount: "₹6,75,000", color: "text-blue-600" },
                        { label: "🚚 Equipment", amount: "₹3,50,000", color: "text-orange-600" }
                      ].map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-gray-700">{item.label}</span>
                          <span className={`font-semibold ${item.color}`}>{item.amount}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <motion.h2
                className="text-4xl font-bold text-gray-900 mb-4"
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 30 }}
                viewport={{ once: true }}
              >
                Powerful Features for Construction Management
              </motion.h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Everything you need to manage your construction project expenses efficiently
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {[
              { 
                icon: <Users className="w-8 h-8" />,
                title: "Project & Phase Tracking", 
                desc: "Track expenses by projects and phases with detailed cost breakdown analysis." 
              },
              { 
                icon: <Shield className="w-8 h-8" />,
                title: "Digital Receipts", 
                desc: "Upload bills, invoices, and receipts with photo proof for complete documentation." 
              },
              { 
                icon: <Star className="w-8 h-8" />,
                title: "Vendor Management", 
                desc: "Manage suppliers, contractors, architects, and vendors in one centralized system." 
              },
              { 
                icon: <Zap className="w-8 h-8" />,
                title: "Real-time Reports", 
                desc: "Generate instant reports with charts and export to PDF/Excel formats." 
              },
              { 
                icon: <CheckCircle className="w-8 h-8" />,
                title: "Role-based Access", 
                desc: "Admin, Contractor, and Accountant roles with granular permissions." 
              },
              { 
                icon: <ArrowRight className="w-8 h-8" />,
                title: "Payment Reminders", 
                desc: "Get automated notifications for due payments and upcoming deadlines." 
              },
            ].map((feature, index) => (
              <FloatingCard key={index} delay={index * 0.1}>
                <motion.div
                  className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 h-full"
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.div
                    className="text-blue-600 mb-4"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.3 }}
                  >
                    {feature.icon}
                  </motion.div>
                  <h3 className="font-bold text-xl mb-3 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </motion.div>
              </FloatingCard>
            ))}
          </div>

          {/* Feature Image */}
          <AnimatedSection delay={0.2}>
            <motion.div
              className="text-center"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img
                src=""
                alt=""
                className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl border border-gray-200"
              />
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-gray-600">
                Choose the perfect plan for your construction project needs
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Free Trial",
                price: "₹0 / 30 days",
                features: ["1 Project", "Basic expense tracking", "Upload receipts", "Basic reports", "Email support"],
                button: "Start Free Trial",
                popular: false
              },
              {
                title: "Basic",
                price: "₹2,999 / month",
                features: ["5 Projects", "Full expense tracking", "Vendor management", "Advanced reports", "Priority support", "PDF/Excel export"],
                button: "Choose Basic",
                popular: false
              },
              {
                title: "Pro",
                price: "₹7,999 / month",
                features: ["Unlimited Projects", "Multi-phase tracking", "Role-based access", "Custom reports", "24/7 support", "API integrations", "Data backup"],
                button: "Choose Pro",
                popular: true
              },
              {
                title: "Enterprise",
                price: "Custom Pricing",
                features: ["Everything in Pro", "Custom integrations", "Dedicated support", "On-site training", "Custom features", "SLA guarantee"],
                button: "Contact Sales",
                popular: false
              },
            ].map((plan, index) => (
              <FloatingCard key={index} delay={index * 0.1}>
                <motion.div
                  className={`bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 h-full flex flex-col ${
                    plan.popular ? "border-orange-500 relative" : "border-gray-100"
                  }`}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  {plan.popular && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-1 rounded-full text-sm font-bold"
                    >
                      Most Popular
                    </motion.div>
                  )}
                  <div className="flex-grow">
                    <h3 className="font-bold text-2xl text-gray-900 mb-2">{plan.title}</h3>
                    <p className="text-3xl font-bold text-blue-600 mb-6">{plan.price}</p>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <motion.li
                          key={featureIndex}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: featureIndex * 0.1 }}
                          className="flex items-center text-gray-700"
                        >
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                          {feature}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      className={`w-full ${plan.popular ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                      onClick={() => handlePlanSelect(plan.title)}
                    >
                      {plan.button}
                    </Button>
                  </motion.div>
                </motion.div>
              </FloatingCard>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                What Our Customers Say
              </h2>
              <p className="text-xl text-gray-600">
                Trusted by thousands of construction professionals across India
              </p>
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Rajesh Sharma", review: "This app helped us save 15% on construction costs by tracking vendors and labor expenses effectively.", rating: 5 },
              { name: "Priya Menon", review: "Clean UI, real-time reports, and reminders made our project management much easier.", rating: 5 },
              { name: "Karthik Reddy", review: "Vendor and expense tracking is top-notch. Best tool for builders and contractors.", rating: 5 },
            ].map((review, index) => (
              <FloatingCard key={index} delay={index * 0.1}>
                <motion.div
                  className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 h-full"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                      >
                        <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-gray-700 italic leading-relaxed mb-6">
                    "{review.review}"
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {review.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{review.name}</h4>
                      <p className="text-gray-600 text-sm">Construction Professional</p>
                    </div>
                  </div>
                </motion.div>
              </FloatingCard>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-600 to-orange-500 text-white py-16">
        <motion.div
          className="max-w-7xl mx-auto px-6 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="text-3xl font-bold mb-8"
            whileHover={{ scale: 1.05 }}
          >
            BuildMyHomes.in
          </motion.div>
          <motion.p
            className="text-lg mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            © {new Date().getFullYear()} BuildMyHomes.in · All rights reserved
          </motion.p>
          <motion.div
            className="flex justify-center space-x-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {["Privacy Policy", "Terms of Service", "Support"].map((link, index) => (
              <motion.a
                key={index}
                href="#"
                whileHover={{ scale: 1.1, y: -2 }}
                className="text-white/80 hover:text-white transition-colors"
              >
                {link}
              </motion.a>
            ))}
          </motion.div>
        </motion.div>
      </footer>
    </div>
  );
};

export default LandingPage;