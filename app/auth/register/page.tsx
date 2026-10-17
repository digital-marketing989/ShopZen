"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
} from "lucide-react";

// -------------------------------------------------------
// Zod schema (client-side mirror)
// -------------------------------------------------------
const step1Schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .regex(
        /^[6-9]\d{9}$/,
        "Enter a valid 10-digit Indian number starting with 6–9"
      )
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Step1Data = z.infer<typeof step1Schema>;
type Step1Errors = Partial<Record<keyof Step1Data, string>>;

// -------------------------------------------------------
// OTP Input – 6 individual boxes
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
// Step 1: Registration form
// -------------------------------------------------------
function Step1Form({
  onSuccess,
}: {
  onSuccess: (email: string, maskedEmail: string, devOtp?: string) => void;
}) {
  const [form, setForm] = useState<Step1Data>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Step1Errors>({});
  const [apiError, setApiError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const setField = (field: keyof Step1Data, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setApiError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");

    const result = step1Schema.safeParse(form);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]])
        ) as Step1Errors
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setApiError(data.message || data.error || "Registration failed");
        return;
      }

      onSuccess(
        result.data.email.trim().toLowerCase(),
        data.maskedEmail || `${result.data.email.slice(0, 2)}****@${result.data.email.split("@")[1]}`,
        data.devOtp
      );
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof Step1Data) =>
    `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      errors[field] ? "border-red-300 bg-red-50" : "border-gray-200"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {apiError}
        </div>
      )}

      {/* Full Name */}
      <div>
        <label htmlFor="reg-name" className="block text-xs font-semibold text-gray-700">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="reg-name"
          type="text"
          autoComplete="name"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Rahul Sharma"
          className={inputClass("name")}
        />
        {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
      </div>

      {/* Email (required) */}
      <div>
        <label htmlFor="reg-email" className="block text-xs font-semibold text-gray-700">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="name@example.com"
          className={inputClass("email")}
        />
        {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
      </div>

      {/* Mobile Number (optional) */}
      <div>
        <label htmlFor="reg-phone" className="block text-xs font-semibold text-gray-700">
          Mobile Number{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="mt-1 flex">
          <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium">
            +91
          </span>
          <input
            id="reg-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) =>
              setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="9876543210"
            className={`flex-1 rounded-r-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? "border-red-300 bg-red-50" : "border-gray-200"
            }`}
          />
        </div>
        {errors.phone && <p className="mt-1 text-[11px] text-red-500">{errors.phone}</p>}
        <p className="mt-1 text-[11px] text-gray-400">For profile use only. Never used for login or verification.</p>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="reg-password" className="block text-xs font-semibold text-gray-700">
          Password <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <input
            id="reg-password"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password ? "border-red-300 bg-red-50" : "border-gray-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-label="Toggle password visibility"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-[11px] text-red-500">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="reg-confirm" className="block text-xs font-semibold text-gray-700">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <input
            id="reg-confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            placeholder="Repeat your password"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.confirmPassword ? "border-red-300 bg-red-50" : "border-gray-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-label="Toggle confirm password visibility"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-[11px] text-red-500">{errors.confirmPassword}</p>
        )}
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
        <span>{loading ? "Sending code..." : "Continue"}</span>
      </button>
    </form>
  );
}

// -------------------------------------------------------
// Step 2: Email OTP verification
// -------------------------------------------------------
function Step2Otp({
  email,
  maskedEmail,
  devOtp: initialDevOtp,
  onBack,
}: {
  email: string;
  maskedEmail: string;
  devOtp?: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | undefined>();
  const [verified, setVerified] = useState(false);
  const [otpExpired, setOtpExpired] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [resendLoading, setResendLoading] = useState(false);
  const [devOtp, setDevOtp] = useState(initialDevOtp || "");

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
        setError(data.message || data.error || "Invalid OTP");
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft);
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

  // Auto-submit
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
        setError(data.message || data.error || "Failed to resend OTP");
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
          <span className="font-mono text-yellow-900 text-base font-bold tracking-widest">
            {devOtp}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          {attemptsLeft !== undefined && (
            <span className="ml-auto text-xs font-semibold">
              {attemptsLeft} left
            </span>
          )}
        </div>
      )}

      <OtpInput value={otp} onChange={setOtp} disabled={loading || otpExpired} />

      <p className="text-center text-xs text-gray-500">
        {otpExpired ? (
          <span className="text-red-500">OTP expired. Please resend.</span>
        ) : (
          <>
            Expires in{" "}
            <Countdown seconds={300} onExpired={() => setOtpExpired(true)} />
          </>
        )}
      </p>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verifying...
        </div>
      )}

      <div className="flex items-center justify-between text-xs pt-1">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 font-medium"
        >
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

      {cooldown > 0 && (
        <CooldownTick seconds={cooldown} onDone={() => setCooldown(0)} />
      )}
    </div>
  );
}

// -------------------------------------------------------
// Main register page
// -------------------------------------------------------
function RegisterContent() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>();

  const handleStep1Success = (em: string, masked: string, otp?: string) => {
    setEmail(em);
    setMaskedEmail(masked);
    setDevOtp(otp);
    setStep(2);
  };

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
        <h1 className="text-xl font-bold text-gray-900">
          {step === 1 ? "Create your account" : "Verify your email"}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {step === 1 ? (
            <>
              Already have an account?{" "}
              <Link href="/auth/login" className="font-semibold text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </>
          ) : (
            <span>
              Step 2 of 2 –{" "}
              <button
                onClick={() => setStep(1)}
                className="font-semibold text-blue-600 hover:text-blue-500"
              >
                Back to details
              </button>
            </span>
          )}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4 px-2 max-w-xs mx-auto">
          {[1, 2].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition ${
                  step >= s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              <div
                className={`flex-1 h-0.5 ${
                  s < 2 ? (step > s ? "bg-blue-600" : "bg-gray-200") : "hidden"
                }`}
              />
            </div>
          ))}
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 sm:px-10">
          {step === 1 ? (
            <Step1Form onSuccess={handleStep1Success} />
          ) : (
            <Step2Otp
              email={email}
              maskedEmail={maskedEmail}
              devOtp={devOtp}
              onBack={() => setStep(1)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
