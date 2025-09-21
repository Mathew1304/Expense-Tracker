import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  HelpCircle, 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Video,
  FileText,
  Users
} from "lucide-react";

const FAQItem: React.FC<{ question: string; answer: string; isOpen: boolean; onClick: () => void }> = ({
  question,
  answer,
  isOpen,
  onClick
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="border border-gray-200 rounded-lg mb-4 overflow-hidden"
  >
    <button
      onClick={onClick}
      className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors flex justify-between items-center"
    >
      <span className="font-medium text-gray-900">{question}</span>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-gray-500" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-500" />
      )}
    </button>
    <motion.div
      initial={false}
      animate={{ height: isOpen ? "auto" : 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="px-6 py-4 bg-gray-50 text-gray-700 leading-relaxed">
        {answer}
      </div>
    </motion.div>
  </motion.div>
);

export const Support: React.FC = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    priority: "medium"
  });

  const faqs = [
    {
      question: "How do I get started with BuildMyHomes.in?",
      answer: "Getting started is easy! Sign up for a free 30-day trial, create your first project, and start adding expenses. Our onboarding guide will walk you through the key features step by step."
    },
    {
      question: "Can I track multiple construction projects?",
      answer: "Yes! Our Basic plan supports up to 5 projects, while Pro and Enterprise plans offer unlimited projects. You can easily switch between projects and get consolidated reports across all your construction activities."
    },
    {
      question: "How do I add team members to my project?",
      answer: "Go to Project Settings > Team Members and invite users by email. You can assign different roles (Admin, Contractor, Accountant) with specific permissions for each team member."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, debit cards, UPI, net banking, and digital wallets. All payments are processed securely through encrypted payment gateways."
    },
    {
      question: "Can I export my project data?",
      answer: "Absolutely! You can export your data in multiple formats including PDF reports, Excel spreadsheets, and CSV files. Go to Reports > Export to access these options."
    },
    {
      question: "Is my construction data secure?",
      answer: "Yes, we use bank-level security with SSL encryption, regular backups, and comply with data protection regulations. Your project data is stored securely and never shared with third parties."
    },
    {
      question: "How do I cancel my subscription?",
      answer: "You can cancel anytime from your Account Settings > Billing. Your account will remain active until the end of your current billing period, and you can export your data for 30 days after cancellation."
    },
    {
      question: "Do you offer customer support in regional languages?",
      answer: "Currently, we provide support in English and Hindi. We're working on adding support for more regional languages including Tamil, Telugu, Marathi, and Bengali."
    }
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert("Thank you for contacting us! We'll get back to you within 24 hours.");
    setContactForm({
      name: "",
      email: "",
      subject: "",
      message: "",
      priority: "medium"
    });
  };

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

      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-8"
          >
            <HelpCircle className="w-10 h-10 text-green-600" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl font-bold text-gray-900 mb-6"
          >
            How can we help you?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-600 mb-8"
          >
            Get the support you need to manage your construction projects effectively
          </motion.p>
        </div>
      </section>

      {/* Support Options */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              {
                icon: <MessageCircle className="w-8 h-8" />,
                title: "Live Chat",
                description: "Chat with our support team in real-time",
                action: "Start Chat",
                color: "blue",
                available: "24/7"
              },
              {
                icon: <Phone className="w-8 h-8" />,
                title: "Phone Support",
                description: "Speak directly with our experts",
                action: "+91 77604 87250",
                color: "green",
                available: "9 AM - 9 PM IST"
              },
              {
                icon: <Mail className="w-8 h-8" />,
                title: "Email Support",
                description: "Send us your questions via email",
                action: "support@buildmyhomes.in",
                color: "orange",
                available: ""
              },
              {
                icon: <BookOpen className="w-8 h-8" />,
                title: "Help Center",
                description: "Browse our comprehensive guides",
                action: "View Articles",
                color: "purple",
                available: "Always available"
              }
            ].map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 bg-${option.color}-100 rounded-full mb-4`}>
                  <div className={`text-${option.color}-600`}>
                    {option.icon}
                  </div>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{option.title}</h3>
                <p className="text-gray-600 mb-4">{option.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-${option.color}-600 font-medium`}>{option.action}</span>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {option.available}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Find quick answers to common questions</p>
          </motion.div>

          {/* Search FAQs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mb-8"
          >
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </motion.div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>

          {filteredFAQs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No FAQs found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-50 to-orange-50">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Still need help?</h2>
              <p className="text-gray-600">Send us a message and we'll get back to you within 24 hours</p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  required
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={contactForm.priority}
                  onChange={(e) => setContactForm({ ...contactForm, priority: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low - General inquiry</option>
                  <option value="medium">Medium - Account or billing</option>
                  <option value="high">High - Technical issue</option>
                  <option value="urgent">Urgent - Service disruption</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                <textarea
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Please describe your issue in detail..."
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-orange-600 transition-all duration-300"
              >
                Send Message
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Additional Resources</h2>
            <p className="text-xl text-gray-600">Explore more ways to get the most out of BuildMyHomes.in</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Video className="w-8 h-8" />,
                title: "Video Tutorials",
                description: "Step-by-step video guides for all features",
                link: "Watch Videos",
                color: "red"
              },
              {
                icon: <FileText className="w-8 h-8" />,
                title: "Documentation",
                description: "Comprehensive guides and API documentation",
                link: "Read Docs",
                color: "blue"
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Community Forum",
                description: "Connect with other construction professionals",
                link: "Join Community",
                color: "green"
              }
            ].map((resource, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 text-center"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-${resource.color}-100 rounded-full mb-6`}>
                  <div className={`text-${resource.color}-600`}>
                    {resource.icon}
                  </div>
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-4">{resource.title}</h3>
                <p className="text-gray-600 mb-6">{resource.description}</p>
                <button className={`text-${resource.color}-600 font-medium hover:text-${resource.color}-700 transition-colors`}>
                  {resource.link} →
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Support;