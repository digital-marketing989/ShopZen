"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Save,
  RotateCcw,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPaymentSettingsPage() {
  const { data: session, status } = useSession();
  const [link, setLink] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [source, setSource] = useState<"DATABASE" | "ENV">("ENV");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isSuperAdmin = (session?.user as { role?: string })?.role === "SUPER_ADMIN";

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/settings/payments");
        if (!res.ok) {
          if (res.status === 403) {
            toast.error("Access restricted to SUPER_ADMIN");
          }
          return;
        }
        const data = await res.json();
        if (data.settings) {
          setLink(data.settings.link);
          setEnabled(data.settings.enabled);
          setSource(data.settings.source);
        }
      } catch (err) {
        console.error("Failed to load payment settings:", err);
        toast.error("Failed to load payment settings");
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      loadSettings();
    }
  }, [status]);

  const validateUrl = (urlStr: string) => {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== "https:") {
        return "URL must use secure HTTPS protocol.";
      }
      const host = parsed.hostname.toLowerCase();
      if (host !== "cfpe.me" && host !== "cashfree.com" && !host.endsWith(".cashfree.com")) {
        return "Host must be cfpe.me or cashfree.com (e.g. https://cfpe.me/krishnadas).";
      }
      return null;
    } catch {
      return "Please enter a valid URL (e.g. https://cfpe.me/krishnadas).";
    }
  };

  const handleLinkChange = (val: string) => {
    setLink(val);
    if (val.trim()) {
      setValidationError(validateUrl(val.trim()));
    } else {
      setValidationError("Payment link is required.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateUrl(link.trim());
    if (err) {
      setValidationError(err);
      toast.error(err);
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/admin/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: link.trim(),
          enabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "Failed to update settings");
      }

      setSource("DATABASE");
      setValidationError(null);
      toast.success("Payment settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToEnv = () => {
    const envLink = process.env.NEXT_PUBLIC_CASHFREE_PAYMENT_LINK || "https://cfpe.me/krishnadas";
    setLink(envLink);
    setValidationError(validateUrl(envLink));
  };

  if (status === "loading" || loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-32 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-sm text-gray-500">
          Only Super Administrators can configure payment gateway links and settings.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Payment Gateway Settings
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Configure Cashfree direct payment link, active payment methods, and customer verification rules.
        </p>
      </div>

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pay via Cashfree (Payment Link)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Customers can pay via UPI, Card, or Net Banking using your existing Cashfree link and submit proof.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-600">
              {enabled ? "Enabled" : "Disabled"}
            </span>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                enabled ? "bg-blue-600" : "bg-gray-200"
              }`}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Payment Link Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="cashfree-link" className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
              Cashfree Payment URL <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] font-medium text-gray-500">
              Active Source: <strong className="text-blue-600 font-bold">{source === "DATABASE" ? "Database Setting" : "Environment Variable (.env)"}</strong>
            </span>
          </div>

          <div className="relative">
            <input
              id="cashfree-link"
              type="text"
              value={link}
              onChange={(e) => handleLinkChange(e.target.value)}
              placeholder="https://cfpe.me/krishnadas"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 ${
                validationError
                  ? "border-red-300 bg-red-50 text-red-900 focus:ring-red-400"
                  : "border-gray-200 focus:ring-blue-500 focus:border-blue-500"
              }`}
            />
            {link && !validationError && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition"
                title="Open Link"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {validationError ? (
            <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium mt-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </p>
          ) : (
            <p className="text-[11px] text-gray-500">
              Only secure HTTPS links with hosts <strong>cfpe.me</strong> or <strong>cashfree.com</strong> are permitted.
            </p>
          )}
        </div>

        {/* Receiver Name & Instruction Note */}
        <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Customer Instructions Reminder</span>
          </div>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            Customers will see: <em>&ldquo;On the next page, enter exactly ₹{`{amount}`} and add Order ID {`{orderId}`} in the note or remark field if available. The payment page will show the receiver name <strong>DIGITAL MARKETING</strong>.&rdquo;</em>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleResetToEnv}
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to .env value</span>
          </button>

          <button
            type="submit"
            disabled={saving || Boolean(validationError)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 text-sm shadow-md transition disabled:opacity-50"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Payment Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
