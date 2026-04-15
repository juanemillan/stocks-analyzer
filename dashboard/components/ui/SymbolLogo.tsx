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

// Symbols whose logos are white — always render on a dark background
const DARK_BG_SYMBOLS = new Set(["GLNG", "IRDM", "APP", "MRVL", "NOK", "APLS", "SOXL", "AGRO", "CVE", "HUT", "FLR", "ASML", "ACLS","ZION", "LABU", "APG", "AIP", "FOSL", "HLX", "AROC", "LI", "ERIC", "OIH", "AMZN", "DPST", "CRSR", "APH", "PSNY", "ALTO", "JD", "BB", "VFC", "MUX", "ZIM", "SPRO", "ROKU", "DRUG", "DLO", "QQQ", "METU", "MARA", "ZM", "UBS", "AOMR", "CLSK", "BLK", "CAKE", "ASO", "BAM", "ATEX", "UNH", "IREN", "STLA", "ARKG", "ABR", "CAL", "ATO", "OSCR", "GLPI", "ANET", "AVT", "SLB", "NIO", "ALKS", "CSX", "ALB", "AXON", "RANI", "FTCI", "SNBR", "EVTL", "APPF", "KULR", "PRPL", "MVST", "YEXT", "DRV", "BJDX", "AVAV", "WRAP", "TMC", "TENB", "LU", "HIMS", "BBAI", "OKTA", "NKE", "FLNC", "OPEN", "JOBY", "APTV", "ACM", "KOSS", "ELF", "EVGO", "XPEV", "DOCU", "Z", "IOT", "LCID", "PLTR", "ONON", "AI", "BTU", "NTNX", "ATEC", "CEG", "QS", "OCUL", "ARKF", "LAC", "IBM", "ROOT", "ARHS", "CQQQ", "ULTA", "RH", "ARE", "SNDL", "ADSK", "DDOG", "FSP", "RGTI", "UBER", "KMX", "CHWY", "VRTX", "CTAS", "QFIN"]);

// Symbols whose logos need a white background (transparent PNG with colored logo)
const LIGHT_BG_SYMBOLS = new Set(["C", "STX", "EQNR", "AOSL", "AVO", "BK", "BF-B", "NUE", "TRMD", "MU", "HLT", "HPE", "BLX", "OGN", "UNFI", "GPRK", "LPG", "ROST", "IBKR", "TER", "CAR", "AEHR", "GLW", "FUN", "NRG", "LEVI", "QSR", "ABEV", "XBI", "ZYME", "DOW", "SWBI", "BLDP", "R", "BFH", "EBAY", "AGEN", "AA", "E", "SPG", "LSTR", "EXEL", "AAP", "MCHP", "AVAL", "IRM", "CTVA", "USB", "HYDR", "PENN", "BFLY", "DOCN", "CHGG", "SMFG", "BURL", "CMI", "FDX", "ASND", "CRDO", "DAL", "NVDA", "BSAC", "CNI", "MANU", "ATRO", "BKU", "SPB", "MTCH", "VYMI", "NVGS", "PLD", "BNS", "CSCO", "ALGN", "TX", "MRK", "SIG", "SPXC", "ALLY", "MDLZ", "CCJ", "LNG", "WTBA", "USO", "MUSA", "SKYT", "GMED", "WSO", "AXSM", "BUD", "SAN", "MUFG", "CIB", "MFC", "COPX", "TANH", "WKHS", "PRZO", "FICO", "BTAI", "VRCA", "BKNG", "HUBS", "NUWE", "CISO", "MNDY", "KALA", "TME", "ADMA", "FUBO", "FIG", "SRG", "TEAM", "SNOW", "MDB", "CSIQ", "ZS", "CRM", "ACHR", "HCI", "PCSA", "AFCG", "WING", "DKNG", "JKS", "EL", "TPST", "EPAM", "RBRK", "TOP", "GLBE", "APPS", "VRNS", "NSIT", "PRCH", "BZFD", "PATH", "KTOS", "ASAN", "NOW", "PRFX", "FND", "BYND", "SAP", "NRGV", "ATHM", "DT", "ALRM", "GEN", "ENPH", "UAVS", "WHR", "W", "BIDU", "ADBE", "ACN", "DPZ", "SMCI", "CRWD", "DG", "JMIA", "DLTR", "MKC", "UHS", "TNXP", "TSLA", "WOOF", "NTES", "G", "TDOC", "RUM", "HMC", "ADP", "VIPS", "MOS", "GDRX", "GIS", "GPK", "TDC", "BABA", "NOMD", "NET", "ANGI", "PNNT", "COUR", "TOST", "TXRH", "PANW", "LLY", "SQQQ", "THRY", "TLRY", "GEVO", "AVNW", "UL", "UNG", "MTN", "MSA", "CYH", "SOFI", "SSNC", "ARKK"]);

function bgStyle(symbol: string): string | undefined {
  if (DARK_BG_SYMBOLS.has(symbol)) return "#1f2937"; // gray-800
  if (LIGHT_BG_SYMBOLS.has(symbol)) return "#ffffff";
  return undefined;
}

function pickColor(symbol: string) {
  let n = 0;
  for (let i = 0; i < symbol.length; i++) n += symbol.charCodeAt(i);
  return PALETTE[n % PALETTE.length];
}

export function SymbolLogo({ symbol, size = 28, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const sym = symbol.toUpperCase();

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
    <div
      className={`rounded-full flex-none overflow-hidden flex items-center justify-center ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: size, minWidth: size, backgroundColor: bgStyle(sym) }}
    >
      <img
        src={logoSrc(symbol)}
        alt={symbol}
        width={size}
        height={size}
        className="rounded-full object-contain w-full h-full"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
