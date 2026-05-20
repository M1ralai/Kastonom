interface BadgeProps {
  children: React.ReactNode;
  color?: "blue" | "green" | "navy" | "orange";
}

const colorMap = {
  blue: { bg: "#EFF9FF", text: "#0284C7" },
  green: { bg: "#F0FDE8", text: "#4D7C0F" },
  navy: { bg: "#EFF3FA", text: "#1B365D" },
  orange: { bg: "#FFF7ED", text: "#C2410C" },
};

export const Badge = ({ children, color = "blue" }: BadgeProps) => {
  const c = colorMap[color];
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {children}
    </span>
  );
};

export default Badge;
