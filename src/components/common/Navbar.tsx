"use client";

import { useState, useEffect, type MouseEvent } from "react";
import { Home, Search, Bot, Mail, UserPlus, LogIn, Menu, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import Button from "../ui/Button";
import ThemeToggleButton from "../ui/theme-toggle-button";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import useAuthStore from "@/lib/authStore";
import { toast } from "react-toastify";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home, href: "/#home" },
  { id: "search", label: "Search", icon: Search, href: "/#smart-search" },
  { id: "assistant", label: "AI Assistant", icon: Bot, href: "/#ai-assistant" },
  { id: "contact", label: "Contact", icon: Mail, href: "/#contact" },
];

function scrollToHash(event: MouseEvent<HTMLAnchorElement>, href: string) {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) {
    return;
  }

  event.preventDefault();
  const targetId = href.slice(hashIndex + 1);
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function Navbar() {
  const initAuth = useAuthStore((state) => state.init);
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
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        <NavLogo scrolledTextClass={scrolledTextClass} />

        <DesktopNav
          items={NAV_ITEMS}
          active={active}
          setActive={setActive}
          scrolled={scrolled}
          scrolledIconButtonClass={scrolledIconButtonClass}
        />

        <AuthButtons scrolledTextClass={scrolledTextClass} scrolled={scrolled} />

        <MobileControls
          scrolled={scrolled}
          scrolledTextClass={scrolledTextClass}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
      </div>

      <MobileMenu items={NAV_ITEMS} menuOpen={menuOpen} closeMenu={() => setMenuOpen(false)} />
    </nav>
  );
}

function NavLogo({ scrolledTextClass }: { scrolledTextClass: string }) {
  return (
    <Link
      href="/"
      className={`text-xl lg:text-2xl font-bold tracking-wide ${scrolledTextClass}`}
      aria-label="IntelliLib home"
    >
      Intelli<span className="text-purple-400">Lib</span>
    </Link>
  );
}

function DesktopNav({
  items,
  active,
  setActive,
  scrolled,
  scrolledIconButtonClass,
}: {
  items: NavItem[];
  active: string | null;
  setActive: (value: string | null) => void;
  scrolled: boolean;
  scrolledIconButtonClass: string;
}) {
  return (
    <div
      className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-500
      ${scrolled ? "bg-black/10 border-white/30 backdrop-blur-md" : "bg-white/5 border-white/20"}`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;

        return (
          <Link key={item.id} href={item.href} onClick={(event) => scrollToHash(event, item.href)}>
            <div
              onMouseEnter={() => setActive(item.id)}
              onMouseLeave={() => setActive(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all duration-300
              ${isActive ? "bg-white text-black" : scrolledIconButtonClass}`}
            >
              <Icon size={18} />

              <span
                className={`whitespace-nowrap text-sm font-medium transition-all duration-300 overflow-hidden
                ${isActive ? "max-w-25 opacity-100 ml-1" : "max-w-0 opacity-0"}`}
              >
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function MobileControls({
  scrolled,
  scrolledTextClass,
  menuOpen,
  setMenuOpen,
}: {
  scrolled: boolean;
  scrolledTextClass: string;
  menuOpen: boolean;
  setMenuOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}) {
  return (
    <div className={`flex items-center gap-2 md:hidden ${scrolledTextClass}`}>
      <ThemeToggleButton
        className={
          scrolled
            ? "bg-black/10 border-black/20 text-black dark:bg-white/10 dark:border-white/20 dark:text-white"
            : ""
        }
      />
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
  );
}

function MobileMenu({
  items,
  menuOpen,
  closeMenu,
}: {
  items: NavItem[];
  menuOpen: boolean;
  closeMenu: () => void;
}) {
  return (
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
              <Link
                key={item.id}
                href={item.href}
                onClick={(event) => {
                  scrollToHash(event, item.href);
                  closeMenu();
                }}
              >
                <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-white hover:bg-white/10">
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <MobileAuthButtons onClickAction={closeMenu} />
      </div>
    </div>
  );
}

function AuthButtons({ scrolledTextClass, scrolled }: { scrolledTextClass: string; scrolled: boolean }) {
  const router = useRouter();
  const { user, role, isAuthenticated, clearUser } = useAuthStore();
  const dashboardHref = role ? `/dashboard/${role}` : "/dashboard/user";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
    toast.success("Logged out successfully.");
    router.push("/");
  };

  if (isAuthenticated && user) {
    return (
      <div className={`hidden md:flex items-center gap-3 ${scrolledTextClass}`}>
        <ThemeToggleButton
          className={
            scrolled
              ? "bg-black/10 border-black/20 text-black dark:bg-white/10 dark:border-white/20 dark:text-white"
              : ""
          }
        />
        <Button
          text="Dashboard"
          icon={<Home size={16} />}
          bgColor="bg-linear-to-b from-purple-400 to-purple-600"
          textColor="text-white"
          href={dashboardHref}
        />
        <Button
          text="Logout"
          icon={<LogIn size={16} />}
          textColor="text-white"
          bgColor="bg-linear-to-b from-teal-400 to-cyan-500"
          onClick={handleLogout}
        />
      </div>
    );
  }

  return (
    <div className={`hidden md:flex items-center gap-3 ${scrolledTextClass}`}>
      <ThemeToggleButton
        className={
          scrolled
            ? "bg-black/10 border-black/20 text-black dark:bg-white/10 dark:border-white/20 dark:text-white"
            : ""
        }
      />
      <Button
        text="Login"
        icon={<LogIn size={16} />}
        bgColor="bg-linear-to-b from-zinc-200 to-zinc-400"
        textColor="text-black"
        href="/login"
      />

      <Button
        text="Sign Up"
        icon={<UserPlus size={16} />}
        bgColor="bg-linear-to-b from-purple-400 to-purple-600"
        textColor="text-white"
        href="/signup"
      />
    </div>
  );
}

function MobileAuthButtons({ onClickAction }: { onClickAction: () => void }) {
  const router = useRouter();
  const { user, role, isAuthenticated, clearUser } = useAuthStore();
  const dashboardHref = role ? `/dashboard/${role}` : "/dashboard/user";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
    toast.success("Logged out successfully.");
    onClickAction();
    router.push("/");
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      {isAuthenticated && user ? (
        <>
          <div className="flex-1">
            <Button
              text="Dashboard"
              icon={<Home size={16} />}
              bgColor="bg-linear-to-b from-purple-400 to-purple-600"
              textColor="text-white"
              href={dashboardHref}
              onClick={onClickAction}
            />
          </div>
          <div className="flex-1">
            <Button
              text="Logout"
              icon={<LogIn size={16} />}
              textColor="text-white"
              bgColor="bg-linear-to-b from-teal-400 to-cyan-500"
              onClick={handleLogout}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex-1">
            <Button
              text="Login"
              icon={<LogIn size={16} />}
              bgColor="bg-linear-to-b from-zinc-200 to-zinc-400"
              textColor="text-black"
              href="/login"
              onClick={onClickAction}
            />
          </div>
          <div className="flex-1">
            <Button
              text="Sign Up"
              icon={<UserPlus size={16} />}
              bgColor="bg-linear-to-b from-purple-400 to-purple-600"
              textColor="text-white"
              href="/signup"
              onClick={onClickAction}
            />
          </div>
        </>
      )}
    </div>
  );
}
