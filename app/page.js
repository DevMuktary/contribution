import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
// We will create this auth options file next
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

async function getData(email) {
  // Fetch User, their Virtual Account, and their Contributions
  const user = await prisma.user.findUnique({
    where: { email: email },
    include: {
      virtualAccount: true,
      contributions: {
        orderBy: { createdAt: 'desc' }, // Newest transactions first
        take: 10 // Show last 10
      }
    }
  });
  return user;
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  // 1. Protect the route: Redirect to login if not authenticated
  if (!session) {
    // For now, if no auth is set up, we just show a message or redirect
    // redirect("/api/auth/signin"); 
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Welcome to the Contribution Platform</h1>
            <p className="mb-4">You need to sign in to view your dashboard.</p>
            <a href="/api/auth/signin" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Sign In</a>
        </div>
      </div>
    )
  }

  // 2. Get Data
  const user = await getData(session.user.email);
  
  // Calculate Total Saved
  const totalSaved = user.contributions.reduce((acc, curr) => acc + curr.amount, 0);
  
  // Hardcoded Target for now (You can fetch this from SystemSettings later)
  const targetAmount = 50000; 
  const progress = Math.min((totalSaved / targetAmount) * 100, 100);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hello, {user.name}</h1>
            <p className="text-gray-500">Welcome to your contribution dashboard.</p>
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
               
               <p className="mt-4 text-xs text-slate-500">Transfer to this account to contribute automatically.</p>
            </div>
          ) : (
             // Show this if they haven't generated an account yet
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You don't have a contribution account yet.</p>
              {/* This button needs a Client Component to handle the click/fetch, 
                  but for this simple file, users will get account on signup automatically */}
              <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium">
                Generating Account...
              </button>
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-sm font-medium">Total Saved</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">₦{totalSaved.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <div className="flex justify-between items-end mb-2">
                <h3 className="text-gray-500 text-sm font-medium">Target Progress</h3>
                <span className="text-sm font-bold text-blue-600">{progress.toFixed(1)}%</span>
             </div>
             <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
             </div>
             <p className="text-xs text-gray-400 mt-2">Target: ₦{targetAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
          </div>
          
          {user.contributions.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Reference</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {user.contributions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {tx.transactionReference}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      +₦{tx.amount.toLocaleString()}
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
          ) : (
            <div className="p-8 text-center text-gray-500">
              No contributions yet. Make a transfer to start!
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
