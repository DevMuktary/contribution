"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminControls({ activeGoal }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // States for "Create Goal"
  const [goalTitle, setGoalTitle] = useState("");
  const [cashOutDate, setCashOutDate] = useState("");

  // States for "Set Target"
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [targetAmount, setTargetAmount] = useState("");

  // Handler: Create New Goal
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if(!confirm("Creating a new goal will archive the old one. Continue?")) return;
    
    setLoading(true);
    await fetch("/api/admin/create-goal", {
      method: "POST",
      body: JSON.stringify({ title: goalTitle, date: cashOutDate }),
    });
    setLoading(false);
    setGoalTitle("");
    setCashOutDate("");
    router.refresh(); // Reload page to see changes
  };

  // Handler: Set Monthly Target
  const handleSetTarget = async (e) => {
    e.preventDefault();
    if (!activeGoal) return alert("Please create a Goal first!");

    setLoading(true);
    await fetch("/api/admin/set-target", {
      method: "POST",
      body: JSON.stringify({ 
        month: targetMonth, 
        year: targetYear, 
        amount: targetAmount, 
        goalId: activeGoal.id 
      }),
    });
    setLoading(false);
    setTargetAmount("");
    alert("Target Updated Successfully!");
    router.refresh();
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      
      {/* --- BOX 1: CREATE NEW CYCLE --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          Step 1: Create Saving Cycle
        </h2>
        
        {activeGoal && (
          <div className="mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
            <p className="text-blue-800 font-bold">Current Active Goal:</p>
            <p className="text-blue-600">{activeGoal.title}</p>
            <p className="text-blue-500 text-xs">Cash Out: {new Date(activeGoal.cashOutDate).toDateString()}</p>
          </div>
        )}

        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Goal Title</label>
            <input 
              type="text" 
              placeholder="e.g. Ramadan 2026 Relief" 
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cash Out Date</label>
            <input 
              type="date" 
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              value={cashOutDate}
              onChange={(e) => setCashOutDate(e.target.value)}
              required
            />
          </div>
          <button disabled={loading} className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition">
            {loading ? "Processing..." : "Start New Cycle"}
          </button>
        </form>
      </div>

      {/* --- BOX 2: MONTHLY TARGETS --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 opacity-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Step 2: Set Monthly Target
        </h2>
        
        {!activeGoal ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
            Create a cycle first to unlock this.
          </div>
        ) : (
          <form onSubmit={handleSetTarget} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Month</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                >
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Amount (₦)</label>
              <input 
                type="number" 
                placeholder="50000" 
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>

            <button disabled={loading} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition">
              {loading ? "Saving..." : "Set Target for Selected Month"}
            </button>
          </form>
        )}
      </div>

    </div>
  );
}
