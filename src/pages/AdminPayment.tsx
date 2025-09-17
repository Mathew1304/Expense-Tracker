import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout/Layout";
import { ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type PaymentMethod = "upi" | "card" | "wallet" | "netbanking";

export const AdminPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const planName = location.state?.planName || "Basic";
  const planId = location.state?.planId || null;

  const [selected, setSelected] = useState<PaymentMethod>("upi");

  // Hardcoded for demo; in real, fetch based on plan or from state
  const amount = 10000; // 100 INR in paise
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
        theme: { color: "#F37254" },
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
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">
          Payment Options for {planName}
        </h1>
        <div className="flex border rounded-lg shadow">
          {/* Left Menu */}
          <div className="w-1/3 border-r">
            {[
              { key: "upi", label: "Pay by UPI" },
              { key: "card", label: "Debit/Credit Card" },
              { key: "wallet", label: "Mobile Wallets" },
              { key: "netbanking", label: "Net Banking" },
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => setSelected(item.key as PaymentMethod)}
                className={`p-4 cursor-pointer flex items-center justify-between ${
                  selected === item.key ? "bg-red-100 font-semibold" : ""
                } hover:bg-gray-100`}
              >
                <span>{item.label}</span>
                <ChevronRight size={18} />
              </div>
            ))}
          </div>

          {/* Right Panel */}
          <div className="w-2/3 p-6">
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

  if (step === "choose") {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Choose UPI App</h2>
        {["Google Pay", "PhonePe", "Paytm"].map((app) => (
          <button
            key={app}
            onClick={() => { setUpiApp(app); setStep("enterUpi"); }}
            className="w-full mb-3 p-3 border rounded bg-gray-50 hover:bg-gray-100"
          >
            {app}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Enter UPI ID ({upiApp})</h2>
      <input
        type="text"
        placeholder="example@upi"
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
        className="w-full p-3 mb-3 border rounded"
      />
      <button
        onClick={() => initiatePayment("upi", { vpa: upiId })}
        disabled={!upiId}
        className="w-full p-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
      >
        Pay with {upiApp}
      </button>
    </div>
  );
};

const CardPayment = ({ initiatePayment }: { initiatePayment: (method: string, params?: any) => void }) => {
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const isFormValid = cardNumber && cardholderName && expiry && cvv;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Debit/Credit Card</h2>
      <input
        type="text"
        placeholder="Card Number"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value)}
        className="w-full p-3 mb-3 border rounded"
      />
      <input
        type="text"
        placeholder="Cardholder Name"
        value={cardholderName}
        onChange={(e) => setCardholderName(e.target.value)}
        className="w-full p-3 mb-3 border rounded"
      />
      <div className="flex gap-3 mb-3">
        <input
          type="text"
          placeholder="Expiry MM/YY"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          className="w-1/2 p-3 border rounded"
        />
        <input
          type="text"
          placeholder="CVV"
          value={cvv}
          onChange={(e) => setCvv(e.target.value)}
          className="w-1/2 p-3 border rounded"
        />
      </div>
      <button
        onClick={() => initiatePayment("card")}
        disabled={!isFormValid}
        className="w-full p-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
      >
        Pay Now
      </button>
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
      case "Paytm Wallet": return "paytm";
      case "PhonePe Wallet": return "phonepewallet";
      case "Amazon Pay": return "amazonpay";
      default: return "";
    }
  };

  if (selectedWallet) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">{selectedWallet}</h2>
        <p className="mb-4">You will be redirected to {selectedWallet} to complete the payment.</p>
        <button
          onClick={() => initiatePayment("wallet", { wallet: mapWalletToCode(selectedWallet) })}
          className="w-full p-3 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Pay with {selectedWallet}
        </button>
        <button
          onClick={() => setSelectedWallet(null)}
          className="w-full p-3 mt-2 border rounded"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Choose Mobile Wallet</h2>
      <div className="grid grid-cols-2 gap-4">
        {wallets.map((w) => (
          <div
            key={w.name}
            onClick={() => setSelectedWallet(w.name)}
            className="cursor-pointer border rounded p-4 flex flex-col items-center hover:shadow-lg transition"
          >
            <span>{w.name}</span>
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
      case "HDFC Bank": return "HDFC";
      case "ICICI Bank": return "ICIC";
      case "State Bank of India": return "SBIN";
      case "Axis Bank": return "UTIB";
      default: return "";
    }
  };

  if (selectedBank) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">{selectedBank}</h2>
        <p className="mb-4">Redirecting to {selectedBank} NetBanking...</p>
        <button
          onClick={() => initiatePayment("netbanking", { bank: mapBankToCode(selectedBank) })}
          className="w-full p-3 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Login & Pay
        </button>
        <button
          onClick={() => setSelectedBank(null)}
          className="w-full p-3 mt-2 border rounded"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Choose Your Bank</h2>
      <div className="grid grid-cols-2 gap-4">
        {banks.map((b) => (
          <div
            key={b.name}
            onClick={() => setSelectedBank(b.name)}
            className="cursor-pointer border rounded p-4 flex flex-col items-center hover:shadow-lg transition"
          >
            <span>{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};