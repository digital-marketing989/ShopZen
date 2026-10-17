"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Check, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SubOrderManager({ subOrders }: { subOrders: any[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState("");
  const [courierName, setCourierName] = useState("Delhivery");
  const [status, setStatus] = useState("SHIPPED");
  const [saving, setSaving] = useState(false);

  const startEdit = (subOrder: any) => {
    setEditingId(subOrder.id);
    setTrackingId(subOrder.trackingId || "");
    setCourierName(subOrder.courierName || "Delhivery");
    setStatus(subOrder.status);
  };

  const handleUpdate = async (subOrderId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/seller/suborders/${subOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          trackingId: trackingId.trim() || null,
          courierName: courierName.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update SubOrder");
      }

      toast.success("SubOrder dispatch details updated!");
      setEditingId(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {subOrders.length === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">No orders assigned to your store yet.</p>
      ) : (
        subOrders.map((so) => (
          <div key={so.id} className="py-3 text-xs space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono font-bold text-gray-900">{so.subOrderNumber}</p>
                <p className="text-[10px] text-gray-400">
                  Master #{so.order?.orderNumber} · {new Date(so.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                  {so.status}
                </span>
                <button
                  onClick={() => startEdit(so)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition"
                  title="Update Tracking"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {editingId === so.id ? (
              <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full text-xs p-1.5 border border-gray-200 rounded-lg bg-white"
                    >
                      <option value="PLACED">PLACED</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PACKED">PACKED</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Courier</label>
                    <input
                      type="text"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="e.g. BlueDart"
                      className="w-full text-xs p-1.5 border border-gray-200 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-semibold">Tracking Number / AWB</label>
                  <input
                    type="text"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="e.g. DEL78912345"
                    className="w-full text-xs p-1.5 border border-gray-200 rounded-lg bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg bg-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdate(so.id)}
                    disabled={saving}
                    className="px-3 py-1 text-xs bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-gray-600 flex justify-between">
                <span>
                  {so.courierName ? `${so.courierName}: ` : ""}
                  {so.trackingId ? (
                    <strong className="font-mono">{so.trackingId}</strong>
                  ) : (
                    <span className="text-gray-400 italic">No tracking ID yet</span>
                  )}
                </span>
                <span className="font-bold text-gray-900">
                  ₹{so.subtotal.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
