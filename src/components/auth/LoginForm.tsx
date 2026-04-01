"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SocialButtons from "./SocialButtons";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";
import Link from "next/link";

interface Props {
  setOtpStep: (value: boolean) => void;
  setUserEmail: (email: string) => void;
  setOtpContext: (value: "login" | "signup") => void;
  errorMessage?: string;
}

export default function LoginForm({
  setOtpStep,
  setUserEmail,
  setOtpContext,
  errorMessage,
}: Props) {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const error = searchParams?.get("error");
    if (error) {
      if (!searchParams) return;
      setServerError(error);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("error");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: false });
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = {
      email: form.email.trim() === "",
      password: form.password.trim() === "",
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;
    try {
      setLoading(true);
      setServerError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) {
        throw error;
      }
      await supabase.auth.signOut();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: form.email,
      });
      if (otpError) {
        throw otpError;
      }
      setUserEmail(form.email);
      setOtpContext("login");
      setOtpStep(true);
      toast.success("OTP sent to your email.");
    } catch (err: any) {
      const message = err?.message || "Login failed";
      setServerError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider.toLowerCase() as "google" | "github",
      });
      if (error) {
        throw error;
      }
    } catch (err: any) {
      const message = err?.message || `${provider} login failed.`;
      setServerError(message);
      toast.error(message);
    }
  };

  const inputBaseClasses =
    "w-full px-4 py-3 rounded-lg border focus:border-teal-400 focus:ring-2 focus:ring-cyan-400 outline-none placeholder-gray-400 dark:placeholder-gray-500 transition";

  return (
    <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md p-10 flex flex-col justify-center text-gray-900 dark:text-white rounded-r-2xl">
      <h2 className="text-2xl font-bold text-center mb-2">Login to Credexa</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-8">
        Access your Credexa account to manage verified skills and micro-credentials.
      </p>
      <SocialButtons onClick={handleSocialLogin} />
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
        <span className="text-xs text-gray-500 dark:text-gray-400">or continue with email</span>
        <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1" />
      </div>
      {(errorMessage || serverError) && (
        <div className="mb-3 p-3 rounded-md bg-red-100 text-red-700 text-sm border border-red-300 text-center">
          {errorMessage || serverError}
        </div>
      )}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            className={`${inputBaseClasses} ${
              errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">Please fill this field</p>}
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className={`${inputBaseClasses} ${
              errors.password ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">Please fill this field</p>}
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-cyan-400 transition"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-cyan-500 hover:to-teal-400 rounded-lg transition font-medium active:scale-95 text-white shadow-md hover:shadow-lg disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Don’t have a Credexa account?{" "}
          <Link href="/signup" className="text-teal-500 dark:text-cyan-400 hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}
