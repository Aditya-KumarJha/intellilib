"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";
import useAuthStore from "@/lib/authStore";

interface Props {
  email: string;
  context: "signup" | "login" | "forgot";
  onVerified?: (email: string) => void; 
}

export default function OtpForm({ email, context, onVerified }: Props) {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    new Date(Date.now() + 10 * 60 * 1000)
  );
  const [remainingTime, setRemainingTime] = useState<number>(10 * 60);
  const setUser = useAuthStore((s) => s.setUser);

  // Resend button timer
  useEffect(() => {
    let interval: number;
    if (resendDisabled) {
      interval = window.setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setResendDisabled(false);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendDisabled]);

  // OTP expiry timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = window.setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000)
      );
      setRemainingTime(diff);

      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Verify OTP
  const verifyOtp = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setServerError("Please enter all 6 digits.");
      return;
    }

    if (remainingTime <= 0) {
      setServerError("OTP has expired. Please resend.");
      return;
    }

    try {
      setLoading(true);
      setServerError(null);

      const otpType = context === "forgot" ? "recovery" : "email";
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: otpType,
      });

      if (error) {
        throw error;
      }

      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser({ id: data.user.id, email: data.user.email ?? null });
      }
      toast.success(
        context === "signup"
          ? "Account verified. Welcome to IntelliLib!"
          : "OTP verified successfully."
      );
      if (onVerified) {
        onVerified(email);
      }
    } catch (err: any) {
      const message = err?.message || "OTP verification failed.";
      setServerError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const val = e.target.value.replace(/\D/, "");
    if (!val && otp[index] === "") return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setServerError(null);
    setResendMessage(null);

    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    const target = e.target as HTMLInputElement;

    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0 && target.selectionStart === 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (
      e.key === "ArrowRight" &&
      index < 5 &&
      target.selectionStart === target.value.length
    ) {
      otpRefs.current[index + 1]?.focus();
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (otp.join("").length === 6 && remainingTime > 0 && !loading) {
        verifyOtp();
      }
    }
  };

  // Handle resend OTP
  const handleResend = async () => {
    setResendDisabled(true);
    setTimer(30);
    setServerError(null);
    setResendMessage(null);

    try {
      const otpType = context === "forgot" ? "recovery" : "email";
      const { error } = await supabase.auth.resend({
        type: otpType,
        email,
      });
      if (error) {
        throw error;
      }
      setResendMessage("OTP has been resent to your email.");
      setExpiresAt(new Date(Date.now() + 10 * 60 * 1000));
      setRemainingTime(10 * 60);
    } catch (err: any) {
      const message = err?.message || "Failed to resend OTP.";
      setServerError(message);
      toast.error(message);
      setResendDisabled(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
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
      <h2 className="text-2xl font-bold text-center mb-4">Verify OTP</h2>
      <p className="text-sm text-center mb-6" style={{ color: "var(--ai-subtitle-color)" }}>
        Enter the 6-digit OTP sent to <strong>{email}</strong>
      </p>

      {remainingTime > 0 ? (
        <p className="text-xs text-center mb-4" style={{ color: "var(--ai-icon-muted)" }}>
          OTP is valid for{" "}
          <span className="font-semibold">{formatTime(remainingTime)}</span>
        </p>
      ) : (
        <p className="text-xs text-center text-red-500 mb-4">
          OTP has expired. Please resend.
        </p>
      )}

      {serverError && (
        <div
          className="mb-3 p-3 rounded-md text-sm text-center"
          style={{
            background: "var(--ai-status-issued-bg)",
            color: "var(--ai-status-issued-text)",
            border: "1px solid var(--ai-status-issued-border)",
          }}
        >
          {serverError}
        </div>
      )}
      {resendMessage && (
        <div
          className="mb-3 p-3 rounded-md text-sm text-center"
          style={{
            background: "var(--ai-status-available-bg)",
            color: "var(--ai-status-available-text)",
            border: "1px solid var(--ai-status-available-border)",
          }}
        >
          {resendMessage}
        </div>
      )}

      <form
        className="space-y-4 flex flex-col items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (otp.join("").length === 6 && remainingTime > 0 && !loading) {
            verifyOtp();
          }
        }}
      >
        <div className="flex gap-3">
          {otp.map((val, i) => (
            <input
              key={i}
              type="text"
              maxLength={1}
              value={val}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              ref={(el) => {
                otpRefs.current[i] = el;
              }}
              className="w-14 h-14 text-center text-2xl rounded-lg outline-none shadow hover:scale-105 transition active:scale-95"
              style={{
                background: "var(--ai-panel-bg)",
                border: "1px solid var(--ai-card-border)",
                color: "var(--ai-input-text)",
              }}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || otp.join("").length !== 6 || remainingTime <= 0}
          className="mt-6 px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
          style={{ background: "var(--search-accent)", color: "white" }}
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendDisabled}
          className="text-sm mt-4 disabled:opacity-50"
          style={{ color: "var(--search-accent)" }}
        >
          {resendDisabled
            ? `Resend OTP in ${timer}s`
            : "Didn’t receive? Resend OTP"}
        </button>
      </form>
    </div>
  );
}