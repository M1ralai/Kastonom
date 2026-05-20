import { useLocation, useNavigate } from 'react-router-dom';

const pages = [
  { id: "/", icon: "🏠", label: "Anasayfa" },
  { id: "/about", icon: "ℹ️", label: "Hakkımızda" },
  { id: "/pricing", icon: "💰", label: "Fiyatlandırma" },
  { id: "/faq", icon: "❓", label: "SSS" },
  { id: "/profile", icon: "👤", label: "Profil" },
];

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t flex"
      style={{ background: "rgba(248,250,252,.97)", backdropFilter: "blur(12px)", borderColor: "#E2E8F0" }}
    >
      {pages.map(p => (
        <button
          key={p.id}
          onClick={() => navigate(p.id)}
          className="flex-1 flex flex-col items-center justify-center py-2.5 transition-all"
          style={{ color: location.pathname === p.id ? "#1B365D" : "#94A3B8" }}
        >
          <span className="text-lg">{p.icon}</span>
          <span className="text-xs font-semibold mt-0.5" style={{ fontSize: "10px" }}>{p.label}</span>
          {location.pathname === p.id && (
            <div className="w-4 h-0.5 rounded-full mt-1" style={{ background: "#8CC63F" }}></div>
          )}
        </button>
      ))}
    </div>
  );
};

export default Navbar;
