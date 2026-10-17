"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, X, ChevronRight, Clock } from "lucide-react";

interface CampaignInfo {
  id: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  minDiscount: number;
  maxDiscount: number;
  showBanner: boolean;
  bannerText: string;
  endsAtFormatted: string;
}

export function HeaderOfferBar() {
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(true); // default true to avoid flicker
  const [isMounted, setIsMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const dismissed = sessionStorage.getItem("shopzen_durga_sale_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
      return;
    }

    let clockOffset = 0;
    let timerId: NodeJS.Timeout | null = null;

    async function fetchCampaign() {
      try {
        const res = await fetch("/api/sales/active");
        if (!res.ok) return;
        const data = await res.json();
        if (data.active && data.campaign && data.campaign.showBanner) {
          setCampaign(data.campaign);
          setIsDismissed(false);

          if (data.serverTimeMs) {
            clockOffset = data.serverTimeMs - Date.now();
          }

          const endsAtMs = new Date(data.campaign.endsAt).getTime();

          const updateCountdown = () => {
            const nowCorrected = Date.now() + clockOffset;
            const diff = endsAtMs - nowCorrected;

            if (diff <= 0) {
              setTimeLeft(null);
              setCampaign(null); // automatically hide the bar at zero
              if (timerId) clearInterval(timerId);
              return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            setTimeLeft({ days, hours, minutes, seconds });
          };

          updateCountdown();
          timerId = setInterval(updateCountdown, 1000);
        } else {
          setCampaign(null);
        }
      } catch (e) {
        console.error("Failed to load header offer bar:", e);
      }
    }

    fetchCampaign();

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("shopzen_durga_sale_dismissed", "true");
    } catch {}
  };

  if (!isMounted || isDismissed || !campaign || !timeLeft) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <aside
      aria-label="Durga Puja Maha Sale Offer Bar"
      className="relative z-50 bg-gradient-to-r from-[#7a0c0c] via-[#b91c1c] to-[#b45309] text-white shadow-md border-b border-amber-400/40"
    >
      <div className="container mx-auto px-3 sm:px-4 py-1.5 sm:py-2">
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          {/* Left / Center content */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 min-w-0">
            {/* Festive badge */}
            <span className="hidden sm:inline-flex items-center gap-1 font-black bg-gradient-to-r from-amber-300 to-yellow-400 text-red-950 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase shadow-sm">
              <Sparkles className="w-3 h-3 fill-red-950 text-red-950" />
              Maha Sale
            </span>

            {/* Main title text */}
            <div className="flex items-center gap-1.5 font-bold truncate">
              <span className="text-yellow-200">🪔</span>
              <span className="truncate">
                {campaign.bannerText || "Durga Puja Maha Sale: Up to 95% OFF on everything"}
              </span>
              <span className="hidden md:inline-block text-amber-200/80 font-normal text-xs ml-1">
                ({campaign.endsAtFormatted || "Ends 22 Oct"})
              </span>
            </div>

            {/* Countdown timer */}
            <div className="flex items-center gap-1 font-mono text-[11px] sm:text-xs">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 shrink-0" />
              <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded border border-amber-400/30 text-yellow-200 font-bold">
                {timeLeft.days > 0 && (
                  <>
                    <span>{timeLeft.days}d</span>
                    <span className="opacity-60">:</span>
                  </>
                )}
                <span>{pad(timeLeft.hours)}h</span>
                <span className="opacity-60">:</span>
                <span>{pad(timeLeft.minutes)}m</span>
                <span className="opacity-60">:</span>
                <span className="text-white animate-pulse">{pad(timeLeft.seconds)}s</span>
              </div>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/sale"
              className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-red-950 font-black text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full shadow-sm hover:shadow transition transform active:scale-95"
            >
              <span>Shop Now</span>
              <ChevronRight className="w-3 h-3 stroke-[3]" />
            </Link>

            <button
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
