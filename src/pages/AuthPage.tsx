"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignUpForm";
import OtpForm from "@/components/auth/OtpForm";

const AnimationPanel = dynamic(() => import("@/components/auth/AnimationPanel"), {
  ssr: false,
  loading: () => <div className="hidden lg:block h-full w-full" />,
});

interface AuthPageProps {
  initialMode?: "login" | "signup";
}

const AuthPage = ({ initialMode = "login" }: AuthPageProps) => {
  const router = useRouter();
  const [mode] = useState<"login" | "signup">(initialMode);
  const [otpStep, setOtpStep] = useState(false);
  const [otpContext, setOtpContext] = useState<"login" | "signup">("login");
  const [userEmail, setUserEmail] = useState("");

  const handleOtpVerified = () => {
    setOtpStep(false);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-teal-950 px-6 py-16">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/10">
        <AnimationPanel page={mode} />
        {otpStep ? (
          <OtpForm email={userEmail} context={otpContext} onVerified={handleOtpVerified} />
        ) : mode === "login" ? (
          <LoginForm
            setOtpStep={setOtpStep}
            setUserEmail={setUserEmail}
            setOtpContext={setOtpContext}
          />
        ) : (
          <SignupForm
            setOtpStep={setOtpStep}
            setUserEmail={setUserEmail}
            setOtpContext={setOtpContext}
          />
        )}
      </div>
    </div>
  );
};

export default AuthPage;
