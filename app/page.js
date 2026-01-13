import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { redirect } from "next/navigation";

// Helper to get month name
const getMonthName = (monthIndex) => {
  const date = new Date();
  date.setMonth(monthIndex - 1);
  return date.toLocaleString('default', { month: 'long' });
};

async function getData(email) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // JS months are 0-11
  const currentYear = now.getFullYear();

  // 1. Fetch User & Their Contributions
  const user = await prisma.user.findUnique({
    where: { email: email },
    include: {
      virtualAccount: true,
      contributions: {
        orderBy: { createdAt: 'desc' },
      }
    }
  });

  // 2. Fetch the Active Goal (The "Cash Out" Event)
  const activeGoal = await prisma.savingsGoal.findFirst({
    where: { isActive: true },
    include: {
      monthlyTargets: true
    }
  });

  // 3. Find target for THIS specific month
  const currentMonthTarget = activeGoal?.monthlyTargets.find(
    t => t.month === currentMonth && t.year === currentYear
  );

  return { user, activeGoal, currentMonthTarget };
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { user, activeGoal, currentMonthTarget } = await getData(session.user.email);

  // --- CALCULATIONS ---
  const now = new Date();
  
  // 1. Calculate Monthly Progress
  // Filter contributions made in the current month only
  const thisMonthPaid = user.contributions
    .filter(c => {
      const d = new Date(c.createdAt);
      return d.getMonth() + 1 === (now.getMonth() + 1) && d.getFullYear() === now.getFullYear();
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthTargetAmount = currentMonthTarget?.targetAmount || 0;
  const monthProgress = monthTargetAmount > 0 
    ? Math.min((thisMonthPaid / monthTargetAmount) * 100, 100) 
    : 0;

  // 2. Calculate Total Savings (Lifetime or for this Goal)
  const totalSaved = user.contributions.reduce((acc, curr) => acc + curr.amount, 0);

  // 3. Countdown Logic
  const cashOutDate = activeGoal ? new Date(activeGoal.cashOutDate) : null;
  const daysLeft = cashOutDate 
    ? Math.ceil((cashOutDate - now) / (1000 * 60 * 60 * 24)) 
    : 0;

  return (
    <main className="min-h-screen bg-gray-100">
      
      {/* --- HERO SECTION (Dark Gradient) --- */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-32 pt-10 px-4 md:px-8 text-white relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-8 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

        <div className="max-w-4xl mx-auto flex justify-between items-center relative z-10">
          <div>
            <p className="text-blue-200 text-sm font-medium uppercase tracking-wider mb-1">Welcome back</p>
            <h1 className="text-3xl font-bold">{user.name}</h1>
          </div>
          <div className="text-right">
             <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <span className="block text-xs text-blue-200 uppercase">Total Balance</span>
                <span className="text-xl font-bold font-mono">₦{totalSaved.toLocaleString()}</span>
             </div>
          </div>
        </div>

        {/* ACTIVE GOAL BANNER */}
        <div className="max-w-4xl mx-auto mt-10">
          {activeGoal ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{activeGoal.title}</h2>
                <p className="text-blue-200 text-sm">Target Cash Out Day</p>
              </div>
              <div className="flex gap-4 text-center">
                 <div className="bg-blue-600/30 px-4 py-3 rounded-xl border border-blue-400/30 backdrop-blur-sm">
                    <span className="block text-3xl font-bold text-white leading-none">{Math.max(0, daysLeft)}</span>
                    <span className="text-xs text-blue-200 uppercase tracking-wide">Days Left</span>
                 </div>
              </div>
            </div>
          ) : (
            <div className="text-blue-200 italic">No active savings cycle initialized.</div>
          )}
        </div>
      </div>

      {/* --- MAIN CONTENT (Floating Cards) --- */}
      <div className="max-w-4xl mx-auto px-4 -mt-24 relative z-20 space-y-6 pb-12">

        {/* CARD 1: CURRENT MONTH TARGET */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                {new Date().toLocaleString('default', { month: 'long' })} Target
              </h3>
              <p className="text-3xl font-bold text-slate-800 mt-2">
                ₦{monthTargetAmount.toLocaleString()}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${monthProgress >= 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {monthProgress >= 100 ? 'COMPLETED' : 'IN PROGRESS'}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {Math.round(monthProgress)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-slate-100 box-shadow-inner">
              <div style={{ width: `${monthProgress}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${monthProgress >= 100 ? 'bg-green-500' : 'bg-blue-600'} transition-all duration-1000 ease-out`}></div>
            </div>
            <p className="text-sm text-gray-500">
              You have contributed <span className="font-bold text-slate-800">₦{thisMonthPaid.toLocaleString()}</span> this month.
            </p>
          </div>
        </div>

        {/* CARD 2: ACCOUNT DETAILS (The Black Card) */}
        {user.virtualAccount ? (
          <div className="bg-slate-900 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden group">
            {/* Glossy Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mt-10 -mr-10 transition-transform group-hover:scale-110 duration-700"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Funding Account</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-mono tracking-tighter font-bold">{user.virtualAccount.accountNumber}</h2>
                  <span className="bg-white/20 hover:bg-white/30 cursor-pointer px-2 py-1 rounded text-xs transition">COPY</span>
                </div>
                <p className="text-slate-400 mt-2 text-sm">{user.virtualAccount.bankName} • {user.virtualAccount.accountName}</p>
              </div>
              <div className="text-right">
                <div className="inline-block bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase animate-pulse">
                  System Active
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Generating your personal account...</p>
          </div>
        )}

        {/* CARD 3: RECENT ACTIVITY */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-gray-700 font-bold text-sm uppercase tracking-wide">Recent Inflows</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {user.contributions.length > 0 ? (
              user.contributions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Bank Transfer</p>
                      <p className="text-xs text-slate-400">{new Date(tx.createdAt).toDateString()}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600">+₦{tx.amount.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                No transactions found yet.
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
