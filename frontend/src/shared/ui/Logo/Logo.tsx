interface LogoProps {
  size?: "md" | "lg";
}

export const Logo = ({ size = "md" }: LogoProps) => {
  const s = size === "lg"
    ? { text: "text-3xl", dot: "w-3 h-3" }
    : { text: "text-xl", dot: "w-2 h-2" };

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ background: "linear-gradient(135deg,#1B365D,#00ADEF)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" fill="white" fillOpacity=".9"/>
          <path d="M9 12l2 2 4-4" stroke="#8CC63F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span
        className={`font-black tracking-tight ${s.text}`}
        style={{ color: "#1B365D", letterSpacing: "-0.02em" }}
      >
        kasto<span style={{ color: "#00ADEF" }}>nom</span>
      </span>
    </div>
  );
};

export default Logo;
