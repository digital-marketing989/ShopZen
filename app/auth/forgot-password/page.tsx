"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
} from "lucide-react";

// -------------------------------------------------------
// OTP Input
// -------------------------------------------------------
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
      const chars = value.split("");
      chars[i - 1] = "";
      onChange(chars.join(""));
    }
  };

  const handleChange = (i: number, ch: string) => {
    const digit = ch.replace(/\D/, "").slice(-1);
    const chars = value.split("");
    chars[i] = digit;
    onChange(chars.join(""));
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    if (pasted.length > 0) inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition disabled:opacity-40 bg-white"
        />
      ))}
    </div>
  );
}

// -------------------------------------------------------
// Steps: 1 = enter email, 2 = enter OTP, 3 = new password, done
// -------------------------------------------------------
type Step = "email" | "otp" | "password" | "done";

function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number | undefined>();
  const [otpExpired, setOtpExpired] = useState(false);

  // Masked email for display
  const maskedEmail = (() => {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    return `${local.slice(0, Math.min(2, local.length))}****@${domain}`;
  })();

  // Step 1: Send OTP
  const sendOtp = async () => {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("otp");
        setCooldown(30);
        if (data.devOtp) setDevOtp(data.devOtp);
        toast.success("If this email exists, a code was sent.");
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP (not consuming – consumed at reset step)
  const verifyOtp = async (code: string) => {
    if (code.length < 6) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          purpose: "RESET_PASSWORD",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid OTP");
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft);
        return;
      }
      setStep("password");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit OTP
  useEffect(() => {
    if (otp.length === 6) verifyOtp(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // Step 3: Reset password (also consumes the OTP)
  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!/[A-Z]/.test(newPassword)) { setError("Password must contain an uppercase letter"); return; }
    if (!/[0-9]/.test(newPassword)) { setError("Password must contain a number"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: otp,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to reset password");
        return;
      }
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setDevOtp("");
    setError("");
    setOtp("");
    setAttemptsLeft(undefined);
    await sendOtp();
  };

  // Cooldown tick helper (invisible)
  const CooldownTick = ({ seconds, onDone }: { seconds: number; onDone: () => void }) => {
    const [s, setS] = useState(seconds);
    useEffect(() => { setS(seconds); }, [seconds]);
    useEffect(() => {
      if (s <= 0) { onDone(); return; }
      const t = setTimeout(() => setS((v) => v - 1), 1000);
      return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [s]);
    return null;
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="w-14 h-14 text-green-500" />
        <h3 className="text-lg font-bold text-gray-900">Password Reset!</h3>
        <p className="text-sm text-gray-500">Your password has been updated. Please sign in.</p>
        <Link
          href="/auth/login"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 text-sm shadow-md transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          {attemptsLeft !== undefined && (
            <span className="ml-auto text-xs font-semibold">{attemptsLeft} left</span>
          )}
        </div>
      )}

      {devOtp && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-center">
          <span className="font-bold text-yellow-800">DEV OTP: </span>
          <span className="font-mono text-yellow-900 text-base font-bold tracking-widest">
            {devOtp}
          </span>
        </div>
      )}

      {step === "email" && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">
              Enter your email address and we&apos;ll send you a verification code.
            </p>
          </div>
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-semibold text-gray-700">
              Email Address
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="name@example.com"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendOtp(); } }}
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={sendOtp}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 text-sm shadow-md transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            <span>{loading ? "Sending..." : "Send Reset Code"}</span>
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">
              Enter the OTP sent to{" "}
              <span className="font-semibold text-gray-800">{maskedEmail}</span>
            </p>
          </div>
          <OtpInput value={otp} onChange={setOtp} disabled={loading || otpExpired} />
          {loading && (
            <p className="text-center text-sm text-blue-600 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
            </p>
          )}
          <p className="text-center text-xs text-gray-500">
            {otpExpired ? (
              <span className="text-red-500">OTP expired. Please resend.</span>
            ) : (
              <>Expires in{" "}
                <span className="text-blue-600 font-semibold">
                  {/* simple display – no live countdown needed here */}
                  5:00
                </span>
              </>
            )}
          </p>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); setError(""); }}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              ← Change email
            </button>
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={handleResend}
              className="text-blue-600 font-semibold hover:underline disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
          {cooldown > 0 && (
            <CooldownTick seconds={cooldown} onDone={() => setCooldown(0)} />
          )}
        </div>
      )}

      {step === "password" && (
        <form onSubmit={resetPassword} className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Create a new password for your account.
          </p>
          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-gray-700">
              New Password
            </label>
            <div className="relative mt-1">
              <input
                id="new-password"
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-new-password" className="block text-xs font-semibold text-gray-700">
              Confirm New Password
            </label>
            <div className="relative mt-1">
              <input
                id="confirm-new-password"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                placeholder="Repeat your password"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 text-sm shadow-md transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{loading ? "Resetting..." : "Reset Password"}</span>
          </button>
        </form>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-2xl shadow-md">
            S
          </div>
          <span className="text-3xl font-black tracking-tight text-gray-900">
            Shop<span className="text-blue-600">Zen</span>
          </span>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Reset your password</h1>
        <p className="text-xs text-gray-500 mt-1">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-500"
          >
            <ArrowLeft className="w-3 h-3" /> Back to sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10">
          <Suspense fallback={<div className="py-8 text-center text-gray-400">Loading...</div>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
