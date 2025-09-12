import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout/Layout";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface Project {
  id: string;
  name: string;
  location: string;
  type: string;
  start_date: string;
  end_date: string;
  manager_id: string | null;
  created_at: string;
}

interface Renovation {
  id: string;
  project_id: string;
  requirement: string;
  status: string;
  created_by: string;
  created_at: string;
}

interface Bid {
  id: string;
  renovation_id: string;
  admin_id: string;
  proposal: string;
  tokens_used: number;
  bid_status: string;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
}

export const Renovations: React.FC = () => {
  const { user, userRole } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [renovations, setRenovations] = useState<Renovation[]>([]);
  const [form, setForm] = useState({
    project_name: "",
    title: "",
    type: "Renovation",
    budget: "",
    location: "",
    timeline: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTokenPopupOpen, setIsTokenPopupOpen] = useState(false);
  const [tokens, setTokens] = useState(150);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase.from("projects").select("*");
      if (!error && data) {
        setProjects(data);
      }
    };
    fetchProjects();

    const fetchProfiles = async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (!error && data) {
        const profileMap = data.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, Profile>);
        setProfiles(profileMap);
      }
    };
    fetchProfiles();

    if (userRole === "Project Manager" || userRole === "Site Engineer" || userRole === "Accounts") {
      const fetchBids = async () => {
        const { data, error } = await supabase
          .from("bids")
          .select("*")
          .eq("admin_id", user?.id);
        if (!error && data) setBids(data);
      };
      fetchBids();
    } else if (userRole === "Admin") {
      const fetchRenovations = async () => {
        const { data, error } = await supabase
          .from("renovations")
          .select("*")
          .neq("created_by", user?.id);
        if (!error && data) {
          setRenovations(data);
        }
      };
      fetchRenovations();
    } else {
      const fetchUserRenovations = async () => {
        const { data, error } = await supabase
          .from("renovations")
          .select("*")
          .eq("created_by", user?.id);
        if (!error && data) {
          setRenovations(data);
          const renovationIds = data.map(r => r.id);
          if (renovationIds.length > 0) {
            const { data: bidData, error: bidError } = await supabase
              .from("bids")
              .select("*")
              .in("renovation_id", renovationIds);
            if (!bidError && bidData) setBids(bidData);
          }
        }
      };
      fetchUserRenovations();
    }
  }, [user, userRole]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id) {
      alert("Please log in to post a renovation request.");
      return;
    }

    let userExists = null;
    let userError = null;
    for (let i = 0; i < 3; i++) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();
        userExists = data;
        userError = error;
        if (!error && data) break;
      } catch (err) {
        userError = { message: "Cannot coerce the result to a single JSON object" };
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (userError || !userExists) {
      console.error("User validation failed:", userError?.message || "User not found in public.profiles");
      alert("User account not found. Please ensure your account is valid or try logging in again. If the issue persists, contact support to sync your account.");
      return;
    }

    if (!form.project_name) {
      alert("Please enter a project name");
      return;
    }
    setLoading(true);

    const requirement = `
Title: ${form.title}
Type: ${form.type}
Budget: ${form.budget}
Location: ${form.location}
Timeline: ${form.timeline}
Description: ${form.description}
    `.trim();

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .insert([{ name: form.project_name, status: "Not Started", start_date: new Date().toISOString().split('T')[0] }])
      .select("id")
      .single();
    if (projectError || !projectData) {
      console.error("Error creating project:", projectError?.message);
      alert("Failed to create project. Please try again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("renovations").insert([
      {
        project_id: projectData.id,
        requirement: requirement,
        created_by: user.id,
        status: "pending",
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("Error inserting renovation:", error.message);
      alert("Failed to post renovation request. Please try again.");
    } else {
      alert("Renovation request posted successfully!");
      setForm({
        project_name: "",
        title: "",
        type: "Renovation",
        budget: "",
        location: "",
        timeline: "",
        description: "",
      });
      setIsFormOpen(false);
      if (userRole !== "Admin") {
        const { data } = await supabase.from("renovations").select("*").eq("created_by", user.id);
        if (data) setRenovations(data);
      }
    }
  };

  const handleBidAction = async (bidId: string, action: string) => {
    const { error } = await supabase
      .from("bids")
      .update({ bid_status: action === "accept" ? "accepted" : "rejected" })
      .eq("id", bidId);
    if (!error) {
      setBids(bids.map(bid => bid.id === bidId ? { ...bid, bid_status: action === "accept" ? "accepted" : "rejected" } : bid));
    }
  };

  const handleBidForProject = async (renovationId: string) => {
    if (tokens < 10) {
      alert("Insufficient tokens. Please purchase more to bid.");
      setIsTokenPopupOpen(true);
      return;
    }
    const proposal = prompt("Enter your bid proposal:");
    if (proposal) {
      const { error } = await supabase.from("bids").insert([
        { renovation_id: renovationId, admin_id: user?.id || "", proposal, tokens_used: 10, bid_status: "active" },
      ]);
      if (!error) {
        setTokens(tokens - 10);
        const { data } = await supabase.from("bids").select("*").eq("admin_id", user?.id);
        if (data) setBids(data);
      } else {
        alert("Failed to submit bid. Please try again.");
      }
    }
  };

  const handlePurchaseTokens = (amount: number, price: number) => {
    setTokens(tokens + amount);
    alert(`${amount} tokens purchased for ₹${price}!`);
    setIsTokenPopupOpen(false);
  };

  if (userRole === "Admin") {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 sm:p-6">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsTokenPopupOpen(true)}
              className="bg-blue-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
            >
              Purchase Tokens
            </button>
          </div>
          <h1 className="text-2xl font-bold mb-4">Manage Job Postings</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {renovations.map((renovation) => (
              <div key={renovation.id} className="p-3 sm:p-4 border rounded-lg bg-gray-50 shadow-sm">
                <h2 className="text-lg sm:text-xl font-semibold">{renovation.requirement.split("\n")[0].replace("Title: ", "")}</h2>
                <p className="text-gray-500 text-sm sm:text-base">Client: {profiles[renovation.created_by]?.full_name || renovation.created_by}</p>
                <p className="text-sm sm:text-base text-gray-600">Status: {renovation.status}</p>
                <p className="text-sm sm:text-base text-gray-600">Posted: {new Date(renovation.created_at).toLocaleDateString()}</p>
                <button
                  onClick={() => handleBidForProject(renovation.id)}
                  className="mt-2 bg-green-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-green-700 text-sm sm:text-base"
                >
                  Bid for Project
                </button>
              </div>
            ))}
          </div>
          {isTokenPopupOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-11/12 sm:w-3/4 md:w-1/2 lg:w-1/3">
                <h2 className="text-xl sm:text-2xl font-bold mb-3">Wallet</h2>
                <p className="text-gray-600 mb-3 text-sm sm:text-base">Manage your tokens and track bidding transactions</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-3">
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">Current Balance</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">{tokens} tokens</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">Total Purchased</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-600">500 tokens</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">Total Spent</p>
                    <p className="text-lg sm:text-2xl font-bold text-red-600">350 tokens</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">Pending Refunds</p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-600">25 tokens</p>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">Purchase Tokens</h3>
                <p className="text-gray-600 mb-3 text-sm sm:text-base">Buy tokens to participate in project bidding</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 border rounded-lg text-center">
                    <p className="text-xl sm:text-2xl font-bold">50</p>
                    <p className="text-sm sm:text-base">Tokens</p>
                    <p className="text-gray-600 text-sm sm:text-base">₹49.99</p>
                    <p className="text-gray-500 text-xs sm:text-sm">₹1.00 per token</p>
                    <button
                      onClick={() => handlePurchaseTokens(50, 49.99)}
                      className="mt-1 sm:mt-2 bg-gray-200 text-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-gray-300 text-xs sm:text-sm"
                    >
                      Purchase
                    </button>
                  </div>
                  <div className="p-2 sm:p-3 border rounded-lg text-center bg-blue-50">
                    <span className="bg-blue-200 text-blue-800 text-xs font-semibold mr-1 px-1.5 py-0.5 rounded">Most Popular</span>
                    <p className="text-xl sm:text-2xl font-bold">100</p>
                    <p className="text-sm sm:text-base">Tokens</p>
                    <p className="text-gray-600 text-sm sm:text-base">₹89.99</p>
                    <p className="text-gray-500 text-xs sm:text-sm">₹0.90 per token</p>
                    <button
                      onClick={() => handlePurchaseTokens(100, 89.99)}
                      className="mt-1 sm:mt-2 bg-blue-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-blue-700 text-xs sm:text-sm"
                    >
                      Purchase
                    </button>
                  </div>
                  <div className="p-2 sm:p-3 border rounded-lg text-center">
                    <p className="text-xl sm:text-2xl font-bold">250</p>
                    <p className="text-sm sm:text-base">Tokens</p>
                    <p className="text-gray-600 text-sm sm:text-base">₹199.99</p>
                    <p className="text-gray-500 text-xs sm:text-sm">₹0.80 per token</p>
                    <button
                      onClick={() => handlePurchaseTokens(250, 199.99)}
                      className="mt-1 sm:mt-2 bg-gray-200 text-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-gray-300 text-xs sm:text-sm"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setIsTokenPopupOpen(false)}
                  className="mt-3 sm:mt-4 bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-red-700 text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  const activeProjects = projects.filter(p => p.status === "In Progress" || p.status === "Not Started").length;
  const completedProjects = projects.filter(p => p.status === "Completed").length;
  const totalInvestment = projects.reduce((sum, p) => sum + (p.manager_id ? 10000 : 0), 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 sm:p-6">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
          >
            + Post New Job
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-4">Client Dashboard</h1>
        <p className="text-gray-600 mb-4 text-sm sm:text-base">Manage your construction projects and job requests</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 text-xs sm:text-sm">Total Projects</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600">{projects.length}</p>
          </div>
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 text-xs sm:text-sm">Active Projects</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-600">{activeProjects}</p>
          </div>
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 text-xs sm:text-sm">Completed</p>
            <p className="text-lg sm:text-2xl font-bold text-green-600">{completedProjects}</p>
          </div>
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 text-xs sm:text-sm">Total Investment</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-600">₹{totalInvestment}</p>
          </div>
        </div>
        <h2 className="text-xl font-bold mb-4">Active Projects</h2>
        <p className="text-gray-600 mb-4 text-sm sm:text-base">Monitor progress of your ongoing construction projects</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold">{project.name}</h3>
              <p className="text-gray-500 text-sm sm:text-base">Location: {project.location}</p>
              <div className="mt-2">
                <p className="text-sm sm:text-base text-gray-600">Status</p>
                <span
                  className={`inline-block mt-1 px-2 py-1 rounded-full text-sm ${
                    project.status === "In Progress"
                      ? "bg-blue-100 text-blue-800"
                      : project.status === "Completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {project.status}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-sm sm:text-base">Start: {project.start_date}</p>
                <p className="text-sm sm:text-base">End: {project.end_date}</p>
              </div>
              <button className="mt-2 text-blue-600 hover:underline text-sm sm:text-base">View Details</button>
            </div>
          ))}
        </div>
        <h2 className="text-xl font-bold mt-6 mb-4">Posted Jobs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renovations.map((renovation) => (
            <div key={renovation.id} className="p-3 sm:p-4 border rounded-lg bg-gray-50 shadow-sm">
              <h3 className="text-lg sm:text-xl font-semibold">{renovation.requirement.split("\n")[0].replace("Title: ", "")}</h3>
              <p className="text-gray-500 text-sm sm:text-base">Status: {renovation.status}</p>
              <p className="text-sm sm:text-base text-gray-600">Posted: {new Date(renovation.created_at).toLocaleDateString()}</p>
              <h4 className="text-md font-semibold mt-2">Bids:</h4>
              {bids.filter(bid => bid.renovation_id === renovation.id).map((bid) => (
                <div key={bid.id} className="mt-1 p-2 bg-gray-100 rounded">
                  <p className="text-sm">Admin: {profiles[bid.admin_id]?.full_name || bid.admin_id}</p>
                  <p className="text-sm">Proposal: {bid.proposal}</p>
                  <p className="text-sm">Tokens: {bid.tokens_used}</p>
                  <p className="text-sm">Status: {bid.bid_status}</p>
                  <div className="mt-1">
                    <button
                      onClick={() => handleBidAction(bid.id, "accept")}
                      className="bg-green-600 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg mr-1 hover:bg-green-700 text-xs sm:text-sm"
                      disabled={bid.bid_status !== "active"}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleBidAction(bid.id, "reject")}
                      className="bg-red-600 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg hover:bg-red-700 text-xs sm:text-sm"
                      disabled={bid.bid_status !== "active"}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-11/12 sm:w-3/4 md:w-1/2">
              <h2 className="text-xl sm:text-2xl font-bold mb-3">Post New Job Request</h2>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block font-medium mb-1 text-sm sm:text-base">Project Name</label>
                  <input
                    type="text"
                    name="project_name"
                    value={form.project_name}
                    onChange={handleChange}
                    placeholder="e.g., Modern Kitchen Renovation Project"
                    className="w-full border rounded-lg p-2 text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm sm:text-base">Project Title</label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g., Modern Kitchen Renovation"
                    className="w-full border rounded-lg p-2 text-sm sm:text-base"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-sm sm:text-base">Project Type</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className="w-full border rounded-lg p-2 text-sm sm:text-base"
                    >
                      <option value="Renovation">Renovation</option>
                      <option value="New Construction">New Construction</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-sm sm:text-base">Budget (₹)</label>
                    <input
                      type="number"
                      name="budget"
                      value={form.budget}
                      onChange={handleChange}
                      placeholder="e.g., 25000"
                      className="w-full border rounded-lg p-2 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block font-medium mb-1 text-sm sm:text-base">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      placeholder="City, State"
                      className="w-full border rounded-lg p-2 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-sm sm:text-base">Expected Timeline</label>
                    <input
                      type="text"
                      name="timeline"
                      value={form.timeline}
                      onChange={handleChange}
                      placeholder="e.g., 6–8 weeks"
                      className="w-full border rounded-lg p-2 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-sm sm:text-base">Project Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Provide details about scope, materials, requirements..."
                    className="w-full border rounded-lg p-2 text-sm sm:text-base"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="bg-gray-300 text-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-gray-400 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
                  >
                    {loading ? "Posting..." : "Post Job Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};