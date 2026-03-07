"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { cn } from "@/lib/utils";

interface LoadingCoinProps {
  label?: string;
  className?: string;
}

export function LoadingCoin({
  label = "Carregando...",
  className,
}: LoadingCoinProps) {
  const coinRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!coinRef.current || !glowRef.current) return;

    const coinSpin = animate(coinRef.current, {
      rotate: "1turn",
      scaleX: [1, 0.32, 1],
      duration: 1100,
      ease: "linear",
      loop: true,
    });

    const glowPulse = animate(glowRef.current, {
      opacity: [0.3, 0.65],
      scale: [0.85, 1.1],
      duration: 900,
      ease: "inOutSine",
      direction: "alternate",
      loop: true,
    });

    return () => {
      coinSpin.pause();
      glowPulse.pause();
    };
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative flex size-14 items-center justify-center">
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-full bg-emerald-500/40 blur-md"
          aria-hidden
        />
        <div
          ref={coinRef}
          className="relative size-10 rounded-full border-2 border-emerald-100/70 bg-linear-to-br from-emerald-300 via-emerald-500 to-emerald-700 shadow-[0_0_16px_rgba(34,197,94,0.45)]"
          aria-hidden
        >
          <span className="absolute inset-[5px] rounded-full border border-emerald-100/40" />
          <span className="absolute left-1/2 top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/75" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
