"use client";

import { useState } from "react";
import SocialButtons from "./SocialButtons";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";
import Link from "next/link";
import { getErrorMessage } from "@/lib/errorMessage";

interface Props {
  setOtpStep: (value: boolean) => void;
  setUserEmail: (email: string) => void;
  setOtpContext: (value: "login" | "signup") => void;
}

export default function SignupForm({
  setOtpStep,
  setUserEmail,
  setOtpContext,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "password") {
      setErrors({ ...errors, password: "" });
    } else {
      setErrors({ ...errors, [e.target.name]: false });
    }
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors = {
      firstName: form.firstName.trim() === "",
      lastName: form.lastName.trim() === "",
      email: form.email.trim() === "",
      password: "",
    };

    if (form.password.trim() === "") {
      newErrors.password = "Please fill this field";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);

    if (
      newErrors.firstName ||
      newErrors.lastName ||
      newErrors.email ||
      newErrors.password !== ""
    ) {
      return;
    }

    try {
      setLoading(true);
      setServerError(null);
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            role: "user",
          },
        },
      });
      if (error) {
        throw error;
      }

      // Keep signup users in a pending state until email OTP verification completes.
      if (data.session) {
        await supabase.auth.signOut();
      }

      setUserEmail(form.email);
      setOtpContext("signup");
      setOtpStep(true);
      toast.success("Enter OTP from email.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Something went wrong. Please try again.");
      setServerError(msg);
      toast.error(msg);
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
      // No toast on OAuth start; show success after redirect if needed.
    } catch (err: unknown) {
      const msg = getErrorMessage(err, `${provider} signup failed.`);
      setServerError(msg);
      toast.error(msg);
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
      <h2 className="text-2xl font-bold text-center mb-2">
        Sign Up for IntelliLib
      </h2>
      <p
        className="text-sm text-center mb-6"
        style={{ color: "var(--ai-subtitle-color)" }}
      >
        Join IntelliLib to explore and manage books effortlessly.
      </p>

      <SocialButtons onClick={handleSocialLogin} />

      <div className="flex items-center gap-4 mb-6">
        <div
          className="h-px flex-1"
          style={{ background: "var(--ai-row-border)" }}
        />
        <span className="text-xs" style={{ color: "var(--ai-icon-muted)" }}>
          or sign up with email
        </span>
        <div
          className="h-px flex-1"
          style={{ background: "var(--ai-row-border)" }}
        />
      </div>

      {serverError && (
        <div
          className="mb-4 p-3 rounded-md text-sm"
          style={{
            background: "var(--ai-status-issued-bg)",
            color: "var(--ai-status-issued-text)",
            border: "1px solid var(--ai-status-issued-border)",
          }}
        >
          {serverError}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <input
              type="text"
              name="firstName"
              placeholder="First name"
              value={form.firstName}
              onChange={handleChange}
              className={inputBaseClasses}
              style={{
                ...inputStyle,
                borderColor: errors.firstName
                  ? "var(--ai-status-issued-border)"
                  : inputStyle.borderColor,
              }}
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">
                Please fill this field
              </p>
            )}
          </div>
          <div>
            <input
              type="text"
              name="lastName"
              placeholder="Last name"
              value={form.lastName}
              onChange={handleChange}
              className={`${inputBaseClasses} ${
                errors.lastName
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">
                Please fill this field
              </p>
            )}
          </div>
        </div>

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
              borderColor: errors.email
                ? "var(--ai-status-issued-border)"
                : inputStyle.borderColor,
            }}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">Please fill this field</p>
          )}
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
              borderColor: errors.password
                ? "var(--ai-status-issued-border)"
                : inputStyle.borderColor,
            }}
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password}</p>
          )}
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg transition font-medium active:scale-95 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background:
              "linear-gradient(90deg, var(--ai-accent), var(--search-accent))",
          }}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <p
          className="text-center text-sm mt-4"
          style={{ color: "var(--ai-subtitle-color)" }}
        >
          Already registered?{" "}
          <Link
            href="/login"
            className="hover:underline"
            style={{ color: "var(--ai-accent)" }}
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
