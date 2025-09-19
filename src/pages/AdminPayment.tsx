import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout/Layout";
import { 
  ChevronRight, 
  CreditCard, 
  Lock, 
  Shield, 
  CheckCircle,
  ArrowLeft,
  Smartphone,
  Building2,
  Wallet,
  Star,
  Info
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type PaymentMethod = "upi" | "card" | "wallet" | "netbanking";

export const AdminPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const planName = location.state?.planName || "";
  const planId = location.state?.planId || null;

  const [selected, setSelected] = useState<PaymentMethod>("upi");
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Amount based on plan
  const getPlanAmount = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "basic":
        return 2999 * 100; // paise
      case "pro":
        return 7999 * 100; // paise
      default:
        return 0;
    }
  };

  const amount = getPlanAmount(planName);
  const razorpayKey = "rzp_test_XXXXXXXXXXXXXX"; // Replace with your Razorpay key

  useEffect(() => {
    const loadScript = async () => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    };
    loadScript();
  }, []);

  const handlePaymentSuccess = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_type: planName,
          plan_id: planId,
          subscription_start: startDate.toISOString().split("T")[0],
          subscription_end: endDate.toISOString().split("T")[0],
        })
        .eq("id", user.id);

      if (error) throw error;
      
      // Show success message
      setTimeout(() => {
        navigate("/dashboard", { 
          state: { 
            message: "Payment successful! Your subscription has been activated.",
            type: "success"
          }
        });
      }, 2000);
    } catch (err: any) {
      console.error(err.message);
      alert("Something went wrong while updating subscription.");
      setIsProcessing(false);
    }
  };

  const initiatePayment = async (paymentMethod: string, params: any = {}) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `sub_${planId}_${Date.now()}`,
          notes: { plan: planName, userId: user.id },
        }),
      });

      if (!response.ok) throw new Error("Failed to create order");

      const data = await response.json();
      const order = data.order;

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "ConstructPro",
        description: `${planName} Plan Subscription`,
        order_id: order.id,
        handler: async () => handlePaymentSuccess(),
        prefill: {
          name: user?.user_metadata?.full_name || "User",
          email: user?.email || "user@example.com",
          contact: user?.phone || "9999999999",
        },
        theme: { color: "#2563eb" },
        method: paymentMethod,
        modal: {
          ondismiss: () => setIsProcessing(false)
        }
      };

      if (paymentMethod === "upi" && params.vpa) options.vpa = params.vpa;
      if (paymentMethod === "wallet" && params.wallet) options.wallet = params.wallet;
      if (paymentMethod === "netbanking" && params.bank) options.bank = params.bank;

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      alert("Failed to initiate payment. Please try again.");
      setIsProcessing(false);
    }
  };

  const paymentMethods = [
    { 
      key: "upi", 
      label: "UPI", 
      icon: Smartphone,
      description: "Pay using any UPI app",
      popular: true
    },
    { 
      key: "card", 
      label: "Cards", 
      icon: CreditCard,
      description: "Debit & Credit cards"
    },
    { 
      key: "wallet", 
      label: "Wallets", 
      icon: Wallet,
      description: "Paytm, PhonePe & more"
    },
    { 
      key: "netbanking", 
      label: "Net Banking", 
      icon: Building2,
      description: "All major banks"
    },
  ];

  if (isProcessing) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing Payment</h3>
            <p className="text-gray-600">Please wait while we process your payment...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Plans
            </button>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
              <p className="text-gray-600">Secure checkout powered by Razorpay</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Payment Methods */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Choose Payment Method</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <div
                        key={method.key}
                        onClick={() => setSelected(method.key as PaymentMethod)}
                        className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selected === method.key
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        {method.popular && (
                          <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                            <Star className="h-3 w-3 mr-1" />
                            Popular
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            selected === method.key ? "bg-blue-100" : "bg-gray-100"
                          }`}>
                            <Icon className={`h-6 w-6 ${
                              selected === method.key ? "text-blue-600" : "text-gray-600"
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">{method.label}</h3>
                            <p className="text-sm text-gray-600">{method.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Payment Form */}
                <div className="border-t pt-6">
                  {selected === "upi" && <UPIPayment initiatePayment={initiatePayment} />}
                  {selected === "card" && <CardPayment initiatePayment={initiatePayment} />}
                  {selected === "wallet" && <WalletPayment initiatePayment={initiatePayment} />}
                  {selected === "netbanking" && <NetBankingPayment initiatePayment={initiatePayment} />}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold text-gray-800">{planName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-semibold text-gray-800">1 Month</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-800">₹{(amount / 100).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-800">Total</span>
                      <span className="text-2xl font-bold text-blue-600">₹{(amount / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Security Features */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-gray-800">Secure Payment</span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      256-bit SSL encryption
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      PCI DSS compliant
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Trusted by millions
                    </li>
                  </ul>
                </div>

                {/* Plan Features */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">What's included:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    {planName.toLowerCase() === "basic" ? (
                      <>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                          Up to 5 projects
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                          Basic reporting
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                          Email support
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                          Unlimited projects
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                          Advanced analytics
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                          Priority support
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                          Custom integrations
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// ---------------- Payment Forms ----------------

const UPIPayment = ({ initiatePayment }: { initiatePayment: (method: string, params?: any) => void }) => {
  const [step, setStep] = useState<"choose" | "enterUpi">("choose");
  const [upiApp, setUpiApp] = useState<string | null>(null);
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState("");

  const upiApps = [
    { name: "Google Pay", logo: "🟢", popular: true },
    { name: "PhonePe", logo: "🟣", popular: true },
    { name: "Paytm", logo: "🔵", popular: false },
    { name: "BHIM UPI", logo: "🟠", popular: false },
  ];

  const handleUpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUpiId(value);
    if (value && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(value)) {
      setError("Please enter a valid UPI ID (e.g., user@paytm)");
    } else {
      setError("");
    }
  };

  if (step === "choose") {
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose UPI App</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {upiApps.map((app) => (
            <button
              key={app.name}
              onClick={() => {
                setUpiApp(app.name);
                setStep("enterUpi");
              }}
              className="relative p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
            >
              {app.popular && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{app.logo}</span>
                <span className="font-medium text-gray-800">{app.name}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="bg-blue-50 rounded-lg p-3 flex items-start space-x-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            You'll be redirected to your UPI app to complete the payment securely.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          setStep("choose");
          setUpiId("");
          setError("");
        }}
        className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to UPI apps
      </button>
      
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Enter UPI ID</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            UPI ID for {upiApp}
          </label>
          <input
            type="text"
            placeholder="yourname@upi"
            value={upiId}
            onChange={handleUpiChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        
        <button
          onClick={() => initiatePayment("upi", { vpa: upiId })}
          disabled={!upiId || !!error}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock className="h-5 w-5" />
          <span>Pay with {upiApp}</span>
        </button>
      </div>
    </div>
  );
};

const CardPayment = ({ initiatePayment }: { initiatePayment: (method: string, params?: any) => void }) => {
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    
    if (!cleanCardNumber || !/^\d{13,19}$/.test(cleanCardNumber))
      newErrors.cardNumber = "Enter a valid card number";
    if (!cardholderName.trim()) 
      newErrors.cardholderName = "Cardholder name is required";
    if (!expiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry))
      newErrors.expiry = "Enter valid expiry (MM/YY)";
    if (!cvv || !/^\d{3,4}$/.test(cvv)) 
      newErrors.cvv = "Enter valid CVV";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePay = () => {
    if (validateForm()) {
      initiatePayment("card");
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Card Details</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
          <div className="relative">
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <CreditCard className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
          {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {errors.cardholderName && (
            <p className="text-red-500 text-sm mt-1">{errors.cardholderName}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
            <input
              type="text"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              maxLength={5}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {errors.expiry && <p className="text-red-500 text-sm mt-1">{errors.expiry}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
            <input
              type="password"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
              maxLength={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}
          </div>
        </div>

        <button
          onClick={handlePay}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Lock className="h-5 w-5" />
          <span>Pay Securely</span>
        </button>

        <div className="flex items-center justify-center space-x-4 pt-2">
          <img src="https://via.placeholder.com/40x25/1a73e8/ffffff?text=VISA" alt="Visa" className="h-6" />
          <img src="https://via.placeholder.com/40x25/eb001b/ffffff?text=MC" alt="Mastercard" className="h-6" />
          <img src="https://via.placeholder.com/40x25/006fcf/ffffff?text=AMEX" alt="American Express" className="h-6" />
        </div>
      </div>
    </div>
  );
};

const WalletPayment = ({ initiatePayment }: { initiatePayment: (method: string, params?: any) => void }) => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const wallets = [
    { name: "Paytm Wallet", logo: "🔵", popular: true },
    { name: "PhonePe Wallet", logo: "🟣", popular: true },
    { name: "Amazon Pay", logo: "🟠", popular: false },
    { name: "Mobikwik", logo: "🔴", popular: false },
  ];

  const mapWalletToCode = (name: string) => {
    switch (name) {
      case "Paytm Wallet": return "paytm";
      case "PhonePe Wallet": return "phonepewallet";
      case "Amazon Pay": return "amazonpay";
      case "Mobikwik": return "mobikwik";
      default: return "";
    }
  };

  if (selectedWallet) {
    return (
      <div>
        <button
          onClick={() => setSelectedWallet(null)}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to wallets
        </button>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{selectedWallet}</h3>
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              You will be redirected to {selectedWallet} to complete the payment securely.
            </p>
          </div>
          
          <button
            onClick={() => initiatePayment("wallet", { wallet: mapWalletToCode(selectedWallet) })}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Lock className="h-5 w-5" />
            <span>Pay with {selectedWallet}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Wallet</h3>
      <div className="grid grid-cols-2 gap-3">
        {wallets.map((wallet) => (
          <button
            key={wallet.name}
            onClick={() => setSelectedWallet(wallet.name)}
            className="relative p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
          >
            {wallet.popular && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                Popular
              </span>
            )}
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{wallet.logo}</span>
              <span className="font-medium text-gray-800 text-sm">{wallet.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const NetBankingPayment = ({ initiatePayment }: { initiatePayment: (method: string, params?: any) => void }) => {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const banks = [
    { name: "HDFC Bank", logo: "🏦", popular: true },
    { name: "ICICI Bank", logo: "🏦", popular: true },
    { name: "State Bank of India", logo: "🏦", popular: true },
    { name: "Axis Bank", logo: "🏦", popular: false },
    { name: "Kotak Bank", logo: "🏦", popular: false },
    { name: "Yes Bank", logo: "🏦", popular: false },
  ];

  const mapBankToCode = (name: string) => {
    switch (name) {
      case "HDFC Bank": return "HDFC";
      case "ICICI Bank": return "ICIC";
      case "State Bank of India": return "SBIN";
      case "Axis Bank": return "UTIB";
      case "Kotak Bank": return "KKBK";
      case "Yes Bank": return "YESB";
      default: return "";
    }
  };

  if (selectedBank) {
    return (
      <div>
        <button
          onClick={() => setSelectedBank(null)}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to banks
        </button>
        
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{selectedBank}</h3>
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              You will be redirected to {selectedBank} NetBanking to complete the payment securely.
            </p>
          </div>
          
          <button
            onClick={() => initiatePayment("netbanking", { bank: mapBankToCode(selectedBank) })}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Lock className="h-5 w-5" />
            <span>Login & Pay</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Your Bank</h3>
      <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
        {banks.map((bank) => (
          <button
            key={bank.name}
            onClick={() => setSelectedBank(bank.name)}
            className="relative p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
          >
            {bank.popular && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                Popular
              </span>
            )}
            <div className="flex items-center space-x-3">
              <span className="text-xl">{bank.logo}</span>
              <span className="font-medium text-gray-800 text-sm">{bank.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};