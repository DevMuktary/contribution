import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { redirect } from "next/navigation";

async function getData(email) {
  // 1. Fetch User Data
  const user = await prisma.user.findUnique({
    where: { email: email },
    include: {
      virtualAccount: true,
      contributions: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  // 2. Fetch System Settings (The Goal & Deadline)
  // We use findFirst() because there is only one global setting
  const settings = await prisma.systemSettings.findFirst();

  return { user, settings };
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { user, settings } = await getData(session.user.email);
  
  // --- Dynamic Calculations ---
  
  // 1. Calculate Total Saved by User
  const userTotalSaved = user.contributions.reduce((acc, curr) => acc + curr.amount, 0);
  
  // 2. Get Target from DB (Default to 0 if not set by Admin)
  const targetAmount = settings?.targetAmount || 0;
  
  // 3. Calculate Progress % (Avoid division by zero)
  const progress = targetAmount > 0 
    ? Math.min((userTotalSaved / targetAmount) * 100, 100) 
    : 0;

  // 4. Format Deadline
  const deadline = settings?.deadlineDate 
    ? new Date(settings.deadlineDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : "No deadline set";

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hello, {user.name}</h1>
            <p className="text-gray-500">
              {targetAmount > 0 ? `Target: ₦${targetAmount.toLocaleString()}` : "No active target"}
            </p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            Member
          </div>
        </div>

        {/* Account Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Your Contribution Account</h2>
          
          {user.virtualAccount ? (
            <div className="bg-slate-900 text-white p-6 rounded-lg relative overflow-hidden">
               {/* Decorative Circle */}
               <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
               
               <p className="text-slate-400 text-sm uppercase tracking-wide">Bank Name</p>
               <p className="text-xl font-bold mb-4">{user.virtualAccount.bankName}</p>
               
               <p className="text-slate-400 text-sm uppercase tracking-wide">Account Number</p>
               <div className="flex items-center gap-3">
                 <p className="text-3xl font-mono tracking-wider">{user.virtualAccount.accountNumber}</p>
               </div>
               
               <p className="mt-4 text-xs text-slate-500">
                 Account Name: {user.virtualAccount.accountName}
               </p>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 mb-2">Account generation in progress...</p>
              <span className="text-xs text-blue-500">Please refresh in a moment</span>
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Box 1: User Savings */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-medium">Your Total Contribution</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">₦{userTotalSaved.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1 font-medium">
               {progress === 100 ? "Target Reached! 🎉" : "Keep going!"}
            </p>
          </div>
          
          {/* Box 2: Target Progress */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <div className="flex justify-between items-end mb-2">
                <h3 className="text-gray-500 text-sm font-medium">Goal Progress</h3>
                <span className="text-sm font-bold text-blue-600">{progress.toFixed(1)}%</span>
             </div>
             <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
             </div>
             <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>Goal: ₦{targetAmount.toLocaleString()}</span>
                <span>Due: {deadline}</span>
             </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">History</h3>
            <span className="text-xs text-gray-400">Last 10 transactions</span>
          </div>
          
          {user.contributions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium text-right">Reference</th>
                    <th className="px-6 py-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {user.contributions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        +₦{tx.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs text-right">
                        {tx.transactionReference.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No contributions received yet.</p>
              <p className="text-xs mt-1">Transfers to your dedicated account will appear here automatically.</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
