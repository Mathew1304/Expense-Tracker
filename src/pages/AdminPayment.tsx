import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout/Layout";
import { ChevronRight, CreditCard, Lock } from "lucide-react";
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
      alert("✅ Payment successful! Subscription updated.");
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err.message);
      alert("Something went wrong while updating subscription.");
    }
  };

  const initiatePayment = async (paymentMethod: string, params: any = {}) => {
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
        name: "Your Company Name",
        description: `Payment for ${planName} Plan`,
        order_id: order.id,
        handler: async () => handlePaymentSuccess(),
        prefill: {
          name: user?.user_metadata?.full_name || "Test User",
          email: user?.email || "test@example.com",
          contact: user?.phone || "9999999999",
        },
        theme: { color: "#2563eb" },
        method: paymentMethod,
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
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Menu */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Payment Options for {planName} Plan
            </h2>
            <div className="space-y-2">
              {[
                { key: "upi", label: "Pay by UPI" },
                { key: "card", label: "Debit/Credit Card" },
                { key: "wallet", label: "Mobile Wallets" },
                { key: "netbanking", label: "Net Banking" },
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() => setSelected(item.key as PaymentMethod)}
                  className={`p-4 cursor-pointer flex items-center justify-between rounded-md transition ${
                    selected === item.key
                      ? "bg-blue-100 font-semibold text-blue-700"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <span>{item.label}</span>
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </div>
              ))}
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800">Order Summary</h3>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>{planName} Plan</span>
                  <span>₹{(amount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>Total</span>
                  <span>₹{(amount / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div>
            {selected === "upi" && <UPIPayment initiatePayment={initiatePayment} />}
            {selected === "card" && <CardPayment initiatePayment={initiatePayment} />}
            {selected === "wallet" && <WalletPayment initiatePayment={initiatePayment} />}
            {selected === "netbanking" && <NetBankingPayment initiatePayment={initiatePayment} />}
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

  const handleUpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpiId(e.target.value);
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(e.target.value)) {
      setError("Please enter a valid UPI ID");
    } else {
      setError("");
    }
  };

  if (step === "choose") {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Choose UPI App</h2>
        <div className="space-y-4">
          {["Google Pay", "PhonePe", "Paytm"].map((app) => (
            <button
              key={app}
              onClick={() => {
                setUpiApp(app);
                setStep("enterUpi");
              }}
              className="w-full py-3 px-4 bg-gray-50 rounded-md text-gray-700 hover:bg-gray-200 transition shadow-sm"
            >
              {app}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Enter UPI ID ({upiApp})</h2>
      <div className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="example@upi"
            value={upiId}
            onChange={handleUpiChange}
            className="w-full p-3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <button
          onClick={() => initiatePayment("upi", { vpa: upiId })}
          disabled={!upiId || !!error}
          className="w-full py-3 bg-blue-600 text-white rounded-md flex items-center justify-center space-x-2 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock className="h-5 w-5" />
          <span>Pay with {upiApp}</span>
        </button>
        <button
          onClick={() => {
            setStep("choose");
            setUpiId("");
            setError("");
          }}
          className="w-full py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
        >
          Back
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

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!cardNumber || !/^\d{16}$/.test(cardNumber.replace(/\s/g, "")))
      newErrors.cardNumber = "Valid card number is required";
    if (!cardholderName) newErrors.cardholderName = "Cardholder name is required";
    if (!expiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry))
      newErrors.expiry = "Valid expiry date (MM/YY) is required";
    if (!cvv || !/^\d{3,4}$/.test(cvv)) newErrors.cvv = "Valid CVV is required";
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
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Debit/Credit Card</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Card Number</label>
          <div className="mt-1 relative">
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10"
            />
            <CreditCard className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Cardholder Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.cardholderName && (
            <p className="text-red-500 text-sm mt-1">{errors.cardholderName}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
            <input
              type="text"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.expiry && <p className="text-red-500 text-sm mt-1">{errors.expiry}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CVV</label>
            <input
              type="text"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}
          </div>
        </div>
        <button
          onClick={handlePay}
          disabled={!!errors.cardNumber || !!errors.cardholderName || !!errors.expiry || !!errors.cvv}
          className="w-full py-3 bg-blue-600 text-white rounded-md flex items-center justify-center space-x-2 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock className="h-5 w-5" />
          <span>Pay Now</span>
        </button>
        <p className="mt-2 text-sm text-gray-500 text-center">Secure payment powered by Razorpay</p>
      </div>
    </div>
  );
};

const WalletPayment = ({ initiatePayment }: { initiatePayment: (method: string, params?: any) => void }) => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const wallets = [
    { name: "Paytm Wallet" },
    { name: "PhonePe Wallet" },
    { name: "Amazon Pay" },
  ];

  const mapWalletToCode = (name: string) => {
    switch (name) {
      case "Paytm Wallet":
        return "paytm";
      case "PhonePe Wallet":
        return "phonepewallet";
      case "Amazon Pay":
        return "amazonpay";
      default:
        return "";
    }
  };

  if (selectedWallet) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{selectedWallet}</h2>
        <div className="space-y-4">
          <p className="text-gray-600">You will be redirected to {selectedWallet} to complete the payment.</p>
          <button
            onClick={() => initiatePayment("wallet", { wallet: mapWalletToCode(selectedWallet) })}
            className="w-full py-3 bg-blue-600 text-white rounded-md flex items-center justify-center space-x-2 hover:bg-blue-700 transition"
          >
            <Lock className="h-5 w-5" />
            <span>Pay with {selectedWallet}</span>
          </button>
          <button
            onClick={() => setSelectedWallet(null)}
            className="w-full py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Choose Mobile Wallet</h2>
      <div className="grid grid-cols-2 gap-4">
        {wallets.map((w) => (
          <div
            key={w.name}
            onClick={() => setSelectedWallet(w.name)}
            className="cursor-pointer border border-gray-300 rounded-md p-4 flex flex-col items-center hover:bg-gray-100 transition shadow-sm"
          >
            <span className="text-gray-700">{w.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const NetBankingPayment = ({ initiatePayment }: { initiatePayment: (method: string, params?: any) => void }) => {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const banks = [
    { name: "HDFC Bank" },
    { name: "ICICI Bank" },
    { name: "State Bank of India" },
    { name: "Axis Bank" },
  ];

  const mapBankToCode = (name: string) => {
    switch (name) {
      case "HDFC Bank":
        return "HDFC";
      case "ICICI Bank":
        return "ICIC";
      case "State Bank of India":
        return "SBIN";
      case "Axis Bank":
        return "UTIB";
      default:
        return "";
    }
  };

  if (selectedBank) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{selectedBank}</h2>
        <div className="space-y-4">
          <p className="text-gray-600">Redirecting to {selectedBank} NetBanking...</p>
          <button
            onClick={() => initiatePayment("netbanking", { bank: mapBankToCode(selectedBank) })}
            className="w-full py-3 bg-blue-600 text-white rounded-md flex items-center justify-center space-x-2 hover:bg-blue-700 transition"
          >
            <Lock className="h-5 w-5" />
            <span>Login & Pay</span>
          </button>
          <button
            onClick={() => setSelectedBank(null)}
            className="w-full py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Choose Your Bank</h2>
      <div className="grid grid-cols-2 gap-4">
        {banks.map((b) => (
          <div
            key={b.name}
            onClick={() => setSelectedBank(b.name)}
            className="cursor-pointer border border-gray-300 rounded-md p-4 flex flex-col items-center hover:bg-gray-100 transition shadow-sm"
          >
            <span className="text-gray-700">{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
