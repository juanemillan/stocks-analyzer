export function MomStat({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  const formatted = value != null ? (value * 100).toFixed(2) + "%" : "—";
  const color =
    value == null
      ? ""
      : value > 0
      ? "text-emerald-600"
      : value < 0
      ? "text-red-500"
      : "text-gray-500";
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className={`font-medium tabular-nums ${color}`}>{formatted}</span>
    </div>
  );
}
