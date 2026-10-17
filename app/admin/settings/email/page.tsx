"use client";
// app/admin/settings/email/page.tsx
// Admin email settings: SMTP status, send test email, last 20 send logs.

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Clock,
  Server,
} from "lucide-react";

interface SmtpStatus {
  provider: string;
  host: string;
  port: number;
  configured: boolean;
  verified: boolean;
  error: string | null;
}

interface EmailLog {
  id: string;
  toEmail: string;
  purpose: string;
  status: "SUCCESS" | "FAILED";
  error: string | null;
  provider: string | null;
  createdAt: string;
}

export default function AdminEmailSettingsPage() {
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatus | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email/logs");
      if (res.ok) {
        const data = await res.json();
        setSmtpStatus(data.smtpStatus);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch email data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendTestEmail = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email/test");
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || data.error || "Unknown response",
      });
      if (data.success) fetchData(); // Refresh logs
    } catch {
      setTestResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setTestSending(false);
    }
  };

  const statusIcon = (status: SmtpStatus | null) => {
    if (!status) return null;
    if (status.verified) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status.configured && !status.verified) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const statusText = (status: SmtpStatus | null) => {
    if (!status) return "Unknown";
    if (status.verified) return "Connected & ready";
    if (status.configured && !status.verified) return "Configured but verify failed";
    return "Not configured";
  };

  const statusClass = (status: SmtpStatus | null) => {
    if (!status) return "bg-gray-100 text-gray-600";
    if (status.verified) return "bg-green-50 text-green-700 border border-green-200";
    if (status.configured && !status.verified) return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    return "bg-red-50 text-red-700 border border-red-200";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Email Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            SMTP configuration, send test emails, and delivery audit logs.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* SMTP Status Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Server className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-800">SMTP Status</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div className="space-y-4">
              {/* Status badge */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${statusClass(smtpStatus)}`}>
                {statusIcon(smtpStatus)}
                <div>
                  <p className="font-semibold">{statusText(smtpStatus)}</p>
                  {smtpStatus?.error && (
                    <p className="text-sm opacity-80 mt-0.5">{smtpStatus.error}</p>
                  )}
                </div>
              </div>

              {/* Config grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Provider", value: smtpStatus?.provider || "—" },
                  { label: "Host", value: smtpStatus?.host || "—" },
                  { label: "Port", value: smtpStatus?.port?.toString() || "—" },
                  {
                    label: "Auth",
                    value: smtpStatus?.configured ? "Configured" : "Missing",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      {label}
                    </p>
                    <p className="font-mono text-sm text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              {/* Send test button */}
              <div className="flex items-start gap-4 pt-2">
                <button
                  onClick={sendTestEmail}
                  disabled={testSending || !smtpStatus?.configured}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testSending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {testSending ? "Sending…" : "Send test email"}
                </button>

                {!smtpStatus?.configured && (
                  <p className="text-sm text-gray-400 pt-2">
                    Configure SMTP credentials in your .env to enable test sends.
                  </p>
                )}
              </div>

              {/* Test result */}
              {testResult && (
                <div
                  className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${
                    testResult.success
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <p>{testResult.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Email Send Logs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          <h2 className="font-semibold text-gray-800">Last 20 Email Sends</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No email logs yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["To (masked)", "Purpose", "Provider", "Status", "Error", "Time"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-700">{log.toEmail}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        {log.purpose}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{log.provider || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                          log.status === "SUCCESS"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {log.status === "SUCCESS" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate text-xs">
                      {log.error || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
