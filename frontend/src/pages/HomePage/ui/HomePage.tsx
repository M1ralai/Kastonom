import { useNavigate } from "react-router-dom";
import { NavBar } from "@/widgets/Navbar";
import { KpiCard } from "@/widgets/KpiCard";
import { Badge } from "@/shared/ui/Badge";

const activities = [
  { name: "Erkek Spor Ayakkabı – Nike Run", status: "Yayında", color: "#8CC63F", icon: "🟢", views: "4.2K", ctr: "3.1%" },
  { name: "Çocuk Sırt Çantası – Ergonomik", status: "Sırada", color: "#00ADEF", icon: "🔵", views: "—", ctr: "—" },
  { name: "Bluetooth Kulaklık – Pro X200", status: "Render", color: "#F59E0B", icon: "🟡", views: "—", ctr: "—" },
  { name: "Koşu Bandı – EV Serisi", status: "Tamamlandı", color: "#94A3B8", icon: "⚪", views: "11.8K", ctr: "2.7%" },
];

export const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <NavBar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16 fade-in">
          <Badge color="navy">🤖 Otonom AI Reklam Üretimi</Badge>
          <h1 className="font-black mt-4 mb-4" style={{ color: "#1B365D", fontSize: "clamp(2.5rem,5vw,4rem)", letterSpacing: "-0.04em", lineHeight: 1.1 }}>
            Veriyi Bağla.<br />
            Ürünü Seç.<br />
            <span style={{ background: "linear-gradient(90deg,#00ADEF,#8CC63F)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Reklamı Al.
            </span>
          </h1>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "#64748B", lineHeight: 1.7 }}>
            ERP'nizden gelen ürün verisini yapay zeka ile analiz eder, saniyeler içinde yayına hazır reklam filmi üretir.
          </p>
          <button
            onClick={() => navigate("/products")}
            className="btn-primary inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-white text-lg transition-all"
            style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)", boxShadow: "0 8px 32px rgba(140,198,63,.4)" }}
          >
            🚀 Yeni Otonom Kampanya Başlat
          </button>
          <div className="flex justify-center gap-6 mt-6 text-sm" style={{ color: "#94A3B8" }}>
            <span>✓ Prompt gerektirmez</span>
            <span>✓ ERP entegrasyonu</span>
            <span>✓ Çoklu platform</span>
          </div>
        </div>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 slide-in">
          <KpiCard label="Aylık Üretilen Video" value="47" sub="Bu ay 12 yeni" icon="🎬" trend={24} color="blue" />
          <KpiCard label="Kalan Bakiye" value="₺1.240" sub="∼ 8 video daha" icon="💳" trend={null} color="green" />
          <KpiCard label="Ortalama CTR" value="%2.8" sub="Sektör ort. %1.4" icon="📈" trend={18} color="navy" />
        </div>
        {/* Activity */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
          <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#F1F5F9" }}>
            <h2 className="font-black text-lg" style={{ color: "#1B365D" }}>Son Aktiviteler</h2>
            <span className="text-sm font-medium cursor-pointer" style={{ color: "#00ADEF" }}>Tümünü Gör →</span>
          </div>
          <div className="divide-y border-b" style={{ borderColor: "#F8FAFC" }}>
            {activities.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: "#F8FAFC" }}>{a.icon}</div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#1B365D" }}>{a.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>2 saat önce güncellendi</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center hidden md:block">
                    <div className="text-sm font-bold" style={{ color: "#1B365D" }}>{a.views}</div>
                    <div className="text-xs" style={{ color: "#94A3B8" }}>Gösterim</div>
                  </div>
                  <div className="text-center hidden md:block">
                    <div className="text-sm font-bold" style={{ color: "#1B365D" }}>{a.ctr}</div>
                    <div className="text-xs" style={{ color: "#94A3B8" }}>CTR</div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: a.color + "18", color: a.color }}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
