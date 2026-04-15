"use client";
import { useState } from "react";
import { logoSrc } from "@/lib/stockUtils";

interface Props {
  symbol: string;
  size?: number; // px, applied as both width and height
  className?: string;
}

const PALETTE = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#f97316",
];

function pickColor(symbol: string) {
  let n = 0;
  for (let i = 0; i < symbol.length; i++) n += symbol.charCodeAt(i);
  return PALETTE[n % PALETTE.length];
}

export function SymbolLogo({ symbol, size = 28, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full text-white font-bold select-none flex-none ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: pickColor(symbol) }}
        aria-label={symbol}
      >
        {symbol.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={logoSrc(symbol)}
      alt={symbol}
      width={size}
      height={size}
      className={`rounded-full object-cover flex-none ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
