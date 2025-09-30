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
  Info,
  AlertCircle
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type PaymentMethod = "upi" | "card" | "wallet" | "netbanking";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const AdminPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const planName = location.state?.planName || "";
  const planId = location.state?.planId || null;

  const [selected, setSelected] = useState<PaymentMethod>("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // ✅ Amount based on plan
  const getPlanAmount = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "basic":
        return 1499 * 100; // paise
      case "pro":
        return 3499 * 100; // paise
      default:
        return 0;
    }
  };

  const amount = getPlanAmount(planName);
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  useEffect(() => {
    const loadScript = async () => {
      return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };
    loadScript();
  }, []);

  // ✅ Handle payment success with verification
  const handlePaymentSuccess = async (paymentResponse: any) => {
    if (!user) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Payment response:', paymentResponse);
      
      // Verify payment with backend
      const { data, error: functionError } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          user_id: user.id,
          plan_name: planName,
          plan_id: planId
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || "Payment verification failed");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Payment verification failed");
      }

      // Show success state
      setPaymentSuccess(true);
      setIsProcessing(false);

      // Redirect after showing success
      setTimeout(() => {
        navigate("/dashboard", { 
          state: { 
            message: "Payment successful! Your subscription has been activated.",
            type: "success"
          }
        });
      }, 3000);
    } catch (err: any) {
      console.error("Payment verification error:", err);
      setError("Payment completed but verification failed. Please contact support if your subscription is not activated.");
      setIsProcessing(false);
    }
  };

  // ✅ Handle payment failure
  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    setError("Payment failed. Please try again.");
    setIsProcessing(false);
  };

  // ✅ Use Supabase Edge Function for order creation
  const initiatePayment = async (paymentMethod: string, params: any = {}) => {
    if (!user) {
      setError("Please login to continue");
      return;
    }

    if (!razorpayKey) {
      setError("Razorpay is not configured. Please contact support.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('Creating order for:', { amount, planName, userId: user.id });
      
      // Use Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount,
          currency: "INR",
          receipt: `sub_${planId}_${Date.now()}`,
          notes: { plan: planName, userId: user.id },
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || "Failed to create order");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to create order");
      }

      const order = data.order;
      console.log('Order created:', order);

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "ConstructPro",
        description: `${planName} Plan Subscription`,
        order_id: order.id,
        handler: handlePaymentSuccess,
        prefill: {
          name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
          email: user?.email || "",
          contact: user?.phone || "9999999999",
        },
        theme: { color: "#2563eb" },
        method: {
          [paymentMethod]: true
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setError("Payment cancelled by user");
          }
        }
      };

      // Add method-specific options
      if (paymentMethod === "upi" && params.vpa) {
        options.method = { upi: true };
      }
      if (paymentMethod === "wallet" && params.wallet) {
        options.method = { wallet: { [params.wallet]: true } };
      }
      if (paymentMethod === "netbanking" && params.bank) {
        options.method = { netbanking: { [params.bank]: true } };
      }

      console.log('Razorpay options:', options);

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', handlePaymentFailure);
      
      rzp.open();
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      setError(error.message || "Failed to initiate payment. Please try again.");
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

  // Payment Success Screen
  if (paymentSuccess) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">
              Your {planName} plan subscription has been activated successfully.
            </p>
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm">
                You will be redirected to your dashboard in a few seconds...
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Processing Screen
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

          {/* Error Message */}
          {error && (
            <div className="mb-6 max-w-2xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-red-800 font-medium">Payment Error</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

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
              onClick={() => initiatePayment("upi")}
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
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Card Payment</h3>
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            You will be redirected to a secure payment page to enter your card details.
          </p>
        </div>
        
        <button
          onClick={() => initiatePayment("card")}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Lock className="h-5 w-5" />
          <span>Pay with Card</span>
        </button>

        <div className="flex items-center justify-center space-x-4 pt-2">
          <div className="text-xs text-gray-500">Accepted cards:</div>
          <div className="flex space-x-2">
            <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">VISA</div>
            <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center">MC</div>
            <div className="w-8 h-5 bg-blue-800 rounded text-white text-xs flex items-center justify-center">AMEX</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WalletPayment = ({ initiatePayment }: { initiatePayment: (method: string, params?: any) => void }) => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const wallets = [
    { name: "Paytm Wallet", logo: "🔵", popular: true, code: "paytm" },
    { name: "PhonePe Wallet", logo: "🟣", popular: true, code: "phonepe" },
    { name: "Amazon Pay", logo: "🟠", popular: false, code: "amazonpay" },
    { name: "Mobikwik", logo: "🔴", popular: false, code: "mobikwik" },
  ];

  if (selectedWallet) {
    const wallet = wallets.find(w => w.name === selectedWallet);
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
            onClick={() => initiatePayment("wallet", { wallet: wallet?.code })}
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
    { name: "HDFC Bank", logo: "🏦", popular: true, code: "HDFC" },
    { name: "ICICI Bank", logo: "🏦", popular: true, code: "ICIC" },
    { name: "State Bank of India", logo: "🏦", popular: true, code: "SBIN" },
    { name: "Axis Bank", logo: "🏦", popular: false, code: "UTIB" },
    { name: "Kotak Bank", logo: "🏦", popular: false, code: "KKBK" },
    { name: "Yes Bank", logo: "🏦", popular: false, code: "YESB" },
  ];

  if (selectedBank) {
    const bank = banks.find(b => b.name === selectedBank);
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
            onClick={() => initiatePayment("netbanking", { bank: bank?.code })}
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