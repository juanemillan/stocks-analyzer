export function FundStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "up" | "down";
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 leading-none">{label}</div>
      <div
        className={`text-sm font-semibold tabular-nums mt-0.5 ${
          highlight === "up"
            ? "text-emerald-600"
            : highlight === "down"
            ? "text-red-500"
            : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
