"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-white/10 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <div className="text-xl font-bold text-white tracking-wide">
          SmartLib<span className="text-purple-400">AI</span>
        </div>

        {/* Center Links */}
        <div className="hidden md:flex gap-8 text-white/80">
          <Link href="#" className="hover:text-white transition">Explore</Link>
          <Link href="#" className="hover:text-white transition">Categories</Link>
          <Link href="#" className="hover:text-white transition">Dashboard</Link>
          <Link href="#" className="hover:text-white transition">Requests</Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">

          {/* Search */}
          <button className="text-white/80 hover:text-white transition">
            🔍
          </button>

          {/* AI Button */}
          <button className="px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 hover:bg-purple-500/30 transition">
            🤖 AI
          </button>

          {/* Login */}
          <button className="px-4 py-1.5 rounded-full bg-white text-black font-medium hover:bg-gray-200 transition">
            Login
          </button>

        </div>
      </div>
    </nav>
  );
}
