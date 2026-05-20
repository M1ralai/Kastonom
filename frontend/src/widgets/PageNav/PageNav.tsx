import { useLocation, useNavigate } from 'react-router-dom';

const pages = [
  { id: "/", icon: "🏠", label: "Anasayfa" },
  { id: "/products", icon: "📦", label: "Ürünler" },
  { id: "/create", icon: "🎬", label: "Oluştur" },
  { id: "/preview", icon: "👁️", label: "Önizle" },
  { id: "/about", icon: "ℹ️", label: "Hakkımızda" },
  { id: "/pricing", icon: "💰", label: "Fiyatlandırma" },
  { id: "/faq", icon: "❓", label: "SSS" },
];

export const PageNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ background: "rgba(248,250,252,.95)", backdropFilter: "blur(12px)", borderColor: "#E2E8F0" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => navigate('/')}>
          <span className="text-2xl font-black" style={{ color: "#1B365D" }}>Kastonom</span>
        </div>
        <div className="flex items-center gap-6">
          {pages.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(p.id)}
              className="flex items-center gap-2 text-sm font-medium cursor-pointer transition-colors hover:opacity-80"
              style={{ color: location.pathname === p.id ? "#00ADEF" : "#64748B" }}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default PageNav;
