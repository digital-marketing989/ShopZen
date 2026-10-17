"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, Bell, Shield, User } from "lucide-react";

export function AdminTopbar() {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Shield className="w-3.5 h-3.5 text-amber-600" />
          SUPER ADMIN
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            {session?.user?.name?.[0]?.toUpperCase() || "A"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-gray-900 leading-tight">
              {session?.user?.name || "Admin User"}
            </p>
            <p className="text-[10px] text-gray-500">
              {session?.user?.email || "admin@shopzen.com"}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
