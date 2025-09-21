import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Scale, Users, CreditCard, AlertTriangle, CheckCircle } from "lucide-react";

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              BuildMyHomes.in
            </Link>
            <Link 
              to="/" 
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
        >
          {/* Title Section */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-6"
            >
              <FileText className="w-8 h-8 text-orange-600" />
            </motion.div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-xl text-gray-600">
              Please read these terms carefully before using our construction management platform.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* Acceptance of Terms */}
            <motion.section
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="border-l-4 border-blue-500 pl-6"
            >
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Acceptance of Terms</h2>
              </div>
              <div className="space-y-4 text-gray-700">
                <p>
                  By accessing and using BuildMyHomes.in ("Service"), you accept and agree to be bound by the 
                  terms and provision of this agreement. If you do not agree to abide by the above, please do 
                  not use this service.
                </p>
                <p>
                  These Terms of Service ("Terms") govern your use of our construction project management 
                  platform operated by BuildMyHomes.in ("us", "we", or "our").
                </p>
              </div>
            </motion.section>

            {/* Service Description */}
            <motion.section
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="border-l-4 border-green-500 pl-6"
            >
              <div className="flex items-center mb-4">
                <Scale className="w-6 h-6 text-green-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Service Description</h2>
              </div>
              <div className="space-y-4 text-gray-700">
                <p>BuildMyHomes.in provides a comprehensive construction project management platform that includes:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Expense tracking and budget management</li>
                  <li>Vendor and supplier management</li>
                  <li>Project phase tracking</li>
                  <li>Digital receipt and document storage</li>
                  <li>Real-time reporting and analytics</li>
                  <li>Payment reminders and notifications</li>
                  <li>Multi-user collaboration tools</li>
                </ul>
              </div>
            </motion.section>

            {/* User Accounts */}
            <motion.section
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="border-l-4 border-purple-500 pl-6"
            >
              <div className="flex items-center mb-4">
                <Users className="w-6 h-6 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">User Accounts</h2>
              </div>
              <div className="space-y-4 text-gray-700">
                <p>When you create an account with us, you must provide accurate and complete information. You are responsible for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Safeguarding your password and account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                  <li>Ensuring your account information remains current and accurate</li>
                  <li>Complying with all applicable laws and regulations</li>
                </ul>
                <p>
                  We reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion.
                </p>
              </div>
            </motion.section>

            {/* Payment Terms */}
            <motion.section
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="border-l-4 border-orange-500 pl-6"
            >
              <div className="flex items-center mb-4">
                <CreditCard className="w-6 h-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Payment Terms</h2>
              </div>
              <div className="space-y-4 text-gray-700">
                <p>Our service operates on a subscription-based model with the following terms:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Free Trial:</strong> 30-day free trial with limited features</li>
                  <li><strong>Subscription Plans:</strong> Monthly billing for Basic, Pro, and Enterprise plans</li>
                  <li><strong>Payment Processing:</strong> Payments processed securely through trusted payment gateways</li>
                  <li><strong>Refunds:</strong> Pro-rated refunds available within 7 days of subscription</li>
                  <li><strong>Auto-renewal:</strong> Subscriptions automatically renew unless cancelled</li>
                  <li><strong>Price Changes:</strong> 30-day notice for any pricing changes</li>
                </ul>
              </div>
            </motion.section>

            {/* Acceptable Use */}
            <motion.section
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="border-l-4 border-red-500 pl-6"
            >
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Acceptable Use Policy</h2>
              </div>
              <div className="space-y-4 text-gray-700">
                <p>You agree not to use the service to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Upload or transmit viruses, malware, or malicious code</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Use the service for illegal activities or fraud</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Reverse engineer or attempt to extract source code</li>
                  <li>Use automated systems to access the service without permission</li>
                </ul>
              </div>
            </motion.section>

            {/* Data and Privacy */}
            <motion.section
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="border-l-4 border-indigo-500 pl-6"
            >
              <div className="flex items-center mb-4">
                <Scale className="w-6 h-6 text-indigo-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Data Ownership and Privacy</h2>
              </div>
              <div className="space-y-4 text-gray-700">
                <p>
                  You retain ownership of all data you upload to our platform. We provide tools to export 
                  your data at any time. Our data practices are governed by our Privacy Policy.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Your project data remains your property</li>
                  <li>We implement industry-standard security measures</li>
                  <li>Regular backups ensure data availability</li>
                  <li>Data export available in standard formats</li>
                  <li>Compliance with applicable data protection laws</li>
                </ul>
              </div>
            </motion.section>

            {/* Limitation of Liability */}
            <motion.section
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="border-l-4 border-yellow-500 pl-6"
            >
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Limitation of Liability</h2>
              </div>
              <div className="space-y-4 text-gray-700">
                <p>
                  To the maximum extent permitted by law, BuildMyHomes.in shall not be liable for any 
                  indirect, incidental, special, consequential, or punitive damages, including without 
                  limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>
                <p>
                  Our total liability for any claims arising from these terms or your use of the service 
                  shall not exceed the amount you paid us in the 12 months preceding the claim.
                </p>
              </div>
            </motion.section>

            {/* Termination */}
            <motion.section
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="border-l-4 border-gray-500 pl-6"
            >
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-gray-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Termination</h2>
              </div>
              <div className="space-y-4 text-gray-700">
                <p>
                  Either party may terminate this agreement at any time. Upon termination:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Your access to the service will be suspended</li>
                  <li>You may export your data for 30 days after termination</li>
                  <li>We may delete your data after the grace period</li>
                  <li>Outstanding payments remain due</li>
                  <li>Provisions that should survive termination will remain in effect</li>
                </ul>
              </div>
            </motion.section>

            {/* Contact Information */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-gray-700">
                <p><strong>Email:</strong> legal@buildmyhomes.in</p>
                <p><strong>Phone:</strong> +91 77604 87250</p>
                <p><strong>Address:</strong> No 12 Ground Floor, 3rd Street Bhavani Nagar, Pozhichalur, Chennai-600074, Tamil Nadu, India</p>
              </div>
            </motion.section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Terms;