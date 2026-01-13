import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AdminControls from "./AdminControls"; // We will create this client component next

async function getAdminData() {
  // 1. Get All Users and their contributions
  const users = await prisma.user.findMany({
    include: {
      contributions: true,
      virtualAccount: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // 2. Get the Active Goal
  const activeGoal = await prisma.savingsGoal.findFirst({
    where: { isActive: true },
    include: { monthlyTargets: true }
  });

  // 3. Calculate Global Total
  const grandTotal = users.reduce((acc, user) => {
    const userTotal = user.contributions.reduce((sum, c) => sum + c.amount, 0);
    return acc + userTotal;
  }, 0);

  return { users, activeGoal, grandTotal };
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  
  // Security Check
  if (!session) redirect("/login");
  const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!adminUser?.isAdmin) redirect("/"); // Kick them out if not admin

  const { users, activeGoal, grandTotal } = await getAdminData();

  return (
    <main className="min-h-screen bg-gray-100">
      
      {/* --- ADMIN HEADER --- */}
      <div className="bg-slate-900 text-white pt-10 pb-24 px-6 md:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Command Center</h1>
            <p className="text-slate-400 text-sm">Manage savings cycles and monitor funds.</p>
          </div>
          <div className="text-right">
             <span className="block text-xs text-slate-400 uppercase tracking-widest">Global Vault Balance</span>
             <span className="text-4xl font-mono font-bold text-green-400">₦{grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 space-y-8 pb-12 relative z-10">
        
        {/* --- CONTROL PANELS (Client Component) --- */}
        {/* We pass the activeGoal ID to the controls so we can attach targets to it */}
        <AdminControls activeGoal={activeGoal} />

        {/* --- USERS TABLE --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Member Contributions</h3>
            <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Total Members: {users.length}</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Account Number</th>
                  <th className="px-6 py-4 font-medium text-right">Total Saved</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => {
                  const userTotal = user.contributions.reduce((sum, c) => sum + c.amount, 0);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600">
                        {user.virtualAccount?.accountNumber || "Generating..."}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">
                        ₦{userTotal.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${userTotal > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {userTotal > 0 ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
