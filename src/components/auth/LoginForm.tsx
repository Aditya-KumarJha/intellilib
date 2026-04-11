"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SocialButtons from "./SocialButtons";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";
import Link from "next/link";
import { isEmailVerified } from "@/lib/authUser";
import { getErrorMessage } from "@/lib/errorMessage";
import { useMutation } from "@tanstack/react-query";

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
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });
      if (error) {
        throw error;
      }

      if (!isEmailVerified(data.user)) {
        await supabase.auth.signOut();
        throw new Error("Please verify your email OTP first before logging in.");
      }

      await supabase.auth.signOut();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: payload.email,
        options: {
          shouldCreateUser: false,
        },
      });
      if (otpError) {
        throw otpError;
      }

      return payload.email;
    },
    onSuccess: (email) => {
      setUserEmail(email);
      setOtpContext("login");
      setOtpStep(true);
      toast.success("Enter OTP from email.");
    },
    onError: (err) => {
      const message = getErrorMessage(err, "Login failed");
      setServerError(message);
      toast.error(message);
    },
  });

  useEffect(() => {
    const error = searchParams?.get("error");
    if (error) {
      if (!searchParams) return;
      setServerError(error);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("error");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

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
    setServerError(null);
    loginMutation.mutate({ email: form.email, password: form.password });
  };

  const handleSocialLogin = async (provider: string) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider.toLowerCase() as "google" | "github",
      });
      if (error) {
        throw error;
      }
      // No toast on OAuth start; show success after redirect if needed.
    } catch (err: unknown) {
      const message = getErrorMessage(err, `${provider} login failed.`);
      setServerError(message);
      toast.error(message);
    }
  };

  const inputBaseClasses =
    "w-full px-4 py-3 rounded-lg border outline-none transition";

  const inputStyle: React.CSSProperties = {
    background: "var(--ai-panel-bg)",
    borderColor: "var(--ai-card-border)",
    color: "var(--ai-input-text)",
  };

  return (
    <div
      className="backdrop-blur-md p-10 flex flex-col justify-center rounded-r-2xl"
      style={{
        background: "var(--ai-card-bg)",
        border: "1px solid var(--ai-card-border)",
        color: "var(--ai-input-text)",
      }}
    >
      <h2 className="text-2xl font-bold text-center mb-2">Login to Intellilib</h2>
      <p className="text-sm text-center mb-8" style={{ color: "var(--ai-subtitle-color)" }}>
        Access your IntelliLib account to manage books and activity.
      </p>
      <SocialButtons onClick={handleSocialLogin} />
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1" style={{ background: "var(--ai-row-border)" }} />
        <span className="text-xs" style={{ color: "var(--ai-icon-muted)" }}>
          or continue with email
        </span>
        <div className="h-px flex-1" style={{ background: "var(--ai-row-border)" }} />
      </div>
      {(errorMessage || serverError) && (
        <div
          className="mb-3 p-3 rounded-md text-sm text-center"
          style={{
            background: "var(--ai-status-issued-bg)",
            color: "var(--ai-status-issued-text)",
            border: "1px solid var(--ai-status-issued-border)",
          }}
        >
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
            className={inputBaseClasses}
            style={{
              ...inputStyle,
              borderColor: errors.email ? "var(--ai-status-issued-border)" : inputStyle.borderColor,
            }}
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
            className={inputBaseClasses}
            style={{
              ...inputStyle,
              borderColor: errors.password ? "var(--ai-status-issued-border)" : inputStyle.borderColor,
            }}
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
          disabled={loginMutation.isPending}
          className="w-full py-3 rounded-lg transition font-medium active:scale-95 text-white shadow-md hover:shadow-lg disabled:opacity-50"
          style={{ background: "linear-gradient(90deg, var(--ai-accent), var(--search-accent))" }}
        >
          {loginMutation.isPending ? "Logging in..." : "Login"}
        </button>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
          Don’t have a IntelliLib account?{" "}
          <Link href="/signup" className="hover:underline" style={{ color: "var(--search-accent)" }}>
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}
