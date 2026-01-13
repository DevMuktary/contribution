"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [data, setData] = useState({ name: "", email: "", phone: "", password: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Registration failed");

      // Success State
      setStatus("success");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/login?registered=true");
      }, 2000);

    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message);
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-500">Your account and wallet have been created.</p>
          <p className="text-sm text-blue-600 mt-4 font-medium animate-pulse">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Join the Circle</h1>
          <p className="text-gray-500 mt-2 text-sm">Create your account to start contributing.</p>
        </div>

        {status === "error" && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 text-sm">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              placeholder="e.g. Mukhtar Abdulwaheed"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              placeholder="name@example.com"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
            <input
              type="text" // Changed to text to avoid browser validation issues
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              placeholder="08012345678"
              value={data.phone}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              placeholder="••••••••"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-lg transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {status === "loading" ? "Creating Wallet..." : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Already a member?{" "}
          <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
