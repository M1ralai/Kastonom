import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '@/shared/ui/Logo';
import { logout, getAuthUser } from '@/shared/api/kastonomApi';

const navItems = [
  { label: "Video Oluştur", path: "/create" },
  { label: "Ürünler", path: "/products" },
  { label: "Önizle", path: "/preview" },
];

export const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getAuthUser();

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!user) return '??';
    const nameParts = user.name?.split(' ') || [];
    if (nameParts.length >= 2) {
      return nameParts[0][0] + nameParts[1][0];
    }
    return user.name?.substring(0, 2).toUpperCase() || user.email.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t flex"
      style={{ background: "rgba(248,250,252,.97)", backdropFilter: "blur(12px)", borderColor: "#E2E8F0" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between w-full">
        <div className="cursor-pointer" onClick={handleLogoClick}>
          <Logo />
        </div>
        <div className="hidden md:flex items-center gap-6">
          {navItems.map(item => (
            <span
              key={item.path}
              className="text-sm font-medium cursor-pointer transition-colors hover:opacity-80"
              style={{ color: location.pathname === item.path ? "#00ADEF" : "#64748B" }}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl border"
            style={{ borderColor: "#E2E8F0", background: "#fff" }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: "#8CC63F" }}></div>
            <span className="text-sm font-semibold" style={{ color: "#1B365D" }}>₺ 1.240</span>
            <span className="text-xs" style={{ color: "#94A3B8" }}>kredi</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer"
              style={{ background: "linear-gradient(135deg,#1B365D,#00ADEF)" }}
              title={user?.email || 'Kullanıcı'}
            >
              {getUserInitials()}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer"
              style={{
                borderColor: "#E2E8F0",
                background: "#fff",
                color: "#64748B"
              }}
              title="Çıkış Yap"
            >
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
