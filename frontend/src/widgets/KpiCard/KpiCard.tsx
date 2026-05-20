import { Badge } from "@/shared/ui/Badge";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  trend?: number | null;
  color?: "blue" | "green" | "navy";
}

const colorMap = {
  blue: "#00ADEF",
  green: "#8CC63F",
  navy: "#1B365D",
};

export const KpiCard = ({ label, value, sub, icon, trend, color = "blue" }: KpiCardProps) => {
  return (
    <div
      className="card-hover transition-all rounded-2xl p-6 border"
      style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(27,54,93,.06)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
          style={{ background: colorMap[color] + "18" }}
        >
          {icon}
        </div>
        {trend && <Badge color={trend > 0 ? "green" : "orange"}>{trend > 0 ? "+" : ""}{trend}%</Badge>}
      </div>
      <div className="text-3xl font-black mb-1" style={{ color: "#1B365D" }}>{value}</div>
      <div className="text-sm font-semibold mb-0.5" style={{ color: "#1B365D" }}>{label}</div>
      {sub && <div className="text-xs" style={{ color: "#94A3B8" }}>{sub}</div>}
    </div>
  );
};

export default KpiCard;
