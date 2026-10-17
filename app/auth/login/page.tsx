"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// -------------------------------------------------------
// OTP Input: 6 individual digit boxes
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
    const next = chars.join("");
    onChange(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    if (pasted.length > 0) {
      inputs.current[Math.min(pasted.length, 5)]?.focus();
    }
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
          className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-0 transition disabled:opacity-40 bg-white"
        />
      ))}
    </div>
  );
}

// -------------------------------------------------------
// Countdown timer
// -------------------------------------------------------
function Countdown({ seconds, onExpired }: { seconds: number; onExpired: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => { setRemaining(seconds); }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onExpired(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onExpired]);

  const m = Math.floor(remaining / 60).toString().padStart(2, "0");
  const s = (remaining % 60).toString().padStart(2, "0");
  return <span className="text-blue-600 font-semibold">{m}:{s}</span>;
}

function CooldownTick({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [s, setS] = useState(seconds);
  useEffect(() => { setS(seconds); }, [seconds]);
  useEffect(() => {
    if (s <= 0) { onDone(); return; }
    const t = setTimeout(() => setS((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [s, onDone]);
  return null;
}

// -------------------------------------------------------
// Unverified email OTP screen (shown when login is blocked)
// -------------------------------------------------------
function VerifyEmailOtpScreen({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpExpired, setOtpExpired] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [resendLoading, setResendLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const maskedEmail = (() => {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    return `${local.slice(0, Math.min(2, local.length))}****@${domain}`;
  })();

  const verifyOtp = async (code: string) => {
    if (code.length < 6) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, purpose: "REGISTER" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid OTP");
        return;
      }
      setVerified(true);
      toast.success("Email verified!");
      setTimeout(() => {
        router.push("/auth/login?message=" + encodeURIComponent("Email verified, please sign in"));
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otp.length === 6) verifyOtp(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResendLoading(true);
    setDevOtp("");
    setError("");
    setOtp("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "REGISTER" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("OTP resent!");
        setCooldown(30);
        setOtpExpired(false);
        if (data.devOtp) setDevOtp(data.devOtp);
      } else {
        setError(data.message || "Failed to resend OTP");
        if (data.cooldownSecondsLeft) setCooldown(data.cooldownSecondsLeft);
      }
    } catch {
      setError("Failed to resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="w-14 h-14 text-green-500" />
        <h3 className="text-lg font-bold text-gray-900">Email Verified!</h3>
        <p className="text-sm text-gray-500">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Verify your email</h3>
        <p className="text-sm text-gray-500 mt-1">
          We sent a code to{" "}
          <span className="font-semibold text-gray-800">{maskedEmail}</span>
        </p>
      </div>

      {devOtp && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-center">
          <span className="font-bold text-yellow-800">DEV OTP: </span>
          <span className="font-mono text-yellow-900 text-base font-bold tracking-widest">{devOtp}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <OtpInput value={otp} onChange={setOtp} disabled={loading || otpExpired} />

      <p className="text-center text-xs text-gray-500">
        {otpExpired ? (
          <span className="text-red-500">OTP expired. Please resend.</span>
        ) : (
          <>Expires in <Countdown seconds={300} onExpired={() => setOtpExpired(true)} /></>
        )}
      </p>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
        </div>
      )}

      <div className="flex items-center justify-between text-xs pt-1">
        <button type="button" onClick={onBack} className="text-gray-500 hover:text-gray-700 font-medium">
          ← Change email
        </button>
        <button
          type="button"
          disabled={cooldown > 0 || resendLoading}
          onClick={handleResend}
          className="text-blue-600 font-semibold hover:underline disabled:opacity-40 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : resendLoading ? "Sending..." : "Resend OTP"}
        </button>
      </div>

      {cooldown > 0 && <CooldownTick seconds={cooldown} onDone={() => setCooldown(0)} />}
    </div>
  );
}

// -------------------------------------------------------
// Login form
// -------------------------------------------------------
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const message = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [sendingVerify, setSendingVerify] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [verifyDevOtp, setVerifyDevOtp] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUnverifiedEmail("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.includes("EMAIL_NOT_VERIFIED")) {
          setUnverifiedEmail(email.trim().toLowerCase());
          setError("Your email is not verified.");
        } else if (res.error.includes("ACCOUNT_BLOCKED")) {
          setError("Your account has been blocked. Contact support.");
        } else if (res.error.includes("ACCOUNT_INACTIVE")) {
          setError("Your account is inactive.");
        } else {
          setError("Invalid credentials. Please check and try again.");
        }
      } else {
        toast.success("Welcome back to ShopZen!");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendVerifyOtp = async () => {
    setSendingVerify(true);
    setVerifyDevOtp("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail, purpose: "REGISTER" }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.devOtp) setVerifyDevOtp(data.devOtp);
        setShowOtpScreen(true);
      } else {
        toast.error(data.message || "Failed to send OTP");
      }
    } catch {
      toast.error("Failed to send OTP");
    } finally {
      setSendingVerify(false);
    }
  };

  if (showOtpScreen) {
    return (
      <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10 space-y-5">
        {verifyDevOtp && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-center">
            <span className="font-bold text-yellow-800">DEV OTP: </span>
            <span className="font-mono text-yellow-900 text-base font-bold tracking-widest">{verifyDevOtp}</span>
          </div>
        )}
        <VerifyEmailOtpScreen
          email={unverifiedEmail}
          onBack={() => { setShowOtpScreen(false); setUnverifiedEmail(""); setError(""); }}
        />
      </div>
    );
  }

  return (
    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10 space-y-5">
      {/* Success/info message (e.g. after registration) */}
      {message && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm text-green-800">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {decodeURIComponent(message)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Unverified email notice */}
        {unverifiedEmail && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
            <p className="text-amber-800 font-medium">Your email is not verified.</p>
            <button
              type="button"
              onClick={sendVerifyOtp}
              disabled={sendingVerify}
              className="mt-2 flex items-center gap-1.5 text-blue-600 font-semibold hover:underline disabled:opacity-50"
            >
              {sendingVerify ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Verify now →
            </button>
          </div>
        )}

        {/* Error message */}
        {error && !unverifiedEmail && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-gray-700">
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); setUnverifiedEmail(""); }}
            placeholder="name@example.com"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="block text-xs font-semibold text-gray-700">
              Password
            </label>
            <Link href="/auth/forgot-password" className="text-[11px] text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="mt-1 relative">
            <input
              id="login-password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 text-sm shadow-md transition disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          <span>{loading ? "Signing In..." : "Sign In"}</span>
        </button>
      </form>

      <div className="flex items-center gap-2 text-[11px] text-gray-400 justify-center">
        <ShieldCheck className="w-3.5 h-3.5" />
        Protected by ShopZen Secure Identity Services
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------
export default function LoginPage() {
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
        <h1 className="text-xl font-bold text-gray-900">Sign in to your account</h1>
        <p className="text-xs text-gray-500 mt-1">
          Or{" "}
          <Link href="/auth/register" className="font-semibold text-blue-600 hover:text-blue-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="bg-white p-8 rounded-2xl text-center text-sm text-gray-400">
              Loading...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
