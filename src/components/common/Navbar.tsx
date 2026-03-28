"use client";

import { useState, useEffect } from "react";
import { Home, Search, Bookmark, User, UserPlus, LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import Button from "../ui/Button";
import ThemeToggleButton from "../ui/theme-toggle-button";

export default function Navbar() {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const items = [
    { id: "home", label: "Home", icon: Home, href: "#" },
    { id: "search", label: "Search", icon: Search, href: "#" },
    { id: "saved", label: "Saved", icon: Bookmark, href: "#" },
    { id: "profile", label: "Profile", icon: User, href: "#" },
  ];

  const scrolledTextClass = scrolled ? "text-black dark:text-white" : "text-white";
  const scrolledIconButtonClass = scrolled
    ? "text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
    : "text-white hover:bg-white/10";

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-500
      ${
        scrolled
          ? "top-0 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-black/10 dark:border-white/10 py-2"
          : "top-0 bg-transparent py-3 md:top-2 md:py-4"
      }`}
    >
      <div
        className={`w-full px-8 flex items-center justify-between transition-all duration-500
        ${scrolled ? "scale-95" : "scale-100"}`}
      >
        {/* Left - Logo */}
        <div className={`text-xl lg:text-2xl font-bold tracking-wide ${scrolledTextClass}`}>
          Intelli<span className="text-purple-400">Lib</span>
        </div>

        {/* Center - Floating Nav */}
        <div
          className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-500
          ${
            scrolled
              ? "bg-white/10 border-white/30 backdrop-blur-md"
              : "bg-white/5 border-white/20"
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;

            return (
              <Link key={item.id} href={item.href}>
                <div
                  onMouseEnter={() => setActive(item.id)}
                  onMouseLeave={() => setActive(null)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all duration-300
                  ${
                    isActive
                      ? "bg-white text-black"
                      : scrolledIconButtonClass
                  }`}
                >
                  <Icon size={18} />

                  <span
                    className={`whitespace-nowrap text-sm font-medium transition-all duration-300 overflow-hidden
                    ${
                      isActive
                        ? "max-w-25 opacity-100 ml-1"
                        : "max-w-0 opacity-0"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Right - Auth Buttons */}
        <div className={`hidden md:flex items-center gap-3 ${scrolledTextClass}`}>
          <ThemeToggleButton className={scrolled ? "text-black dark:text-white" : ""} />
          <Button
            text="Login"
            icon={<LogIn size={16} />}
            bgColor="bg-gradient-to-b from-zinc-200 to-zinc-400"
            textColor="text-black"
          />

          <Button
            text="Sign Up"
            icon={<UserPlus size={16} />}
            bgColor="bg-gradient-to-b from-purple-400 to-purple-600"
            textColor="text-white"
          />
        </div>

        {/* Mobile - Theme + Hamburger */}
        <div className={`flex items-center gap-2 md:hidden ${scrolledTextClass}`}>
          <ThemeToggleButton className={scrolled ? "text-black dark:text-white" : ""} />
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={`inline-flex items-center justify-center h-9 w-9 rounded-full border border-white/20 bg-white/10 backdrop-blur-md ${
              scrolledTextClass
            }`}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-4 mt-3 rounded-2xl border border-white/15 bg-black/80 backdrop-blur-xl p-3">
          <div className="grid gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href} onClick={() => setMenuOpen(false)}>
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-white hover:bg-white/10">
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1">
              <Button
                text="Login"
                icon={<LogIn size={16} />}
                bgColor="bg-gradient-to-b from-zinc-200 to-zinc-400"
                textColor="text-black"
              />
            </div>
            <div className="flex-1">
              <Button
                text="Sign Up"
                icon={<UserPlus size={16} />}
                bgColor="bg-gradient-to-b from-purple-400 to-purple-600"
                textColor="text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
