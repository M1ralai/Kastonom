import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/widgets/Navbar";
import { KpiCard } from "@/widgets/KpiCard";
import { Badge } from "@/shared/ui/Badge";
import { listCreativeProjects } from "@/shared/api/kastonomApi";

interface ProjectBundle {
  creative_project: {
    id: string;
    name: string;
    status: string;
    updated_at: string;
  };
  creative_subject: {
    id: string;
    name: string;
    subject_type: string;
  } | null;
  source_assets: Array<{ id: string }>;
}

export const HomePage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    try {
      const data = await listCreativeProjects();
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError(err instanceof Error ? err.message : "Veriler yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate KPIs from real data
  const totalProjects = projects.length;
  const readyProjects = projects.filter(p => p.creative_project.status === "ready").length;
  const publishedProjects = projects.filter(p => p.creative_project.status === "published").length;

  // Get status info for activities
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "published": return { label: "Yayında", color: "#8CC63F", icon: "🟢" };
      case "ready": return { label: "Hazır", color: "#00ADEF", icon: "🔵" };
      case "generating": return { label: "Oluşturuluyor", color: "#F59E0B", icon: "🟡" };
      case "failed": return { label: "Başarısız", color: "#DC2626", icon: "🔴" };
      default: return { label: "Taslak", color: "#94A3B8", icon: "⚪" };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return "Az önce";
      if (hours < 24) return `${hours} saat önce`;
      const days = Math.floor(hours / 24);
      return `${days} gün önce`;
    } catch {
      return "Bilinmiyor";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: "#1B365D" }} />
          <p className="text-sm" style={{ color: "#64748B" }}>Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

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

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: "#FEE2E2", color: "#DC2626" }}>
            <p>{error}</p>
            <button onClick={loadProjects} className="mt-2 text-sm underline">Tekrar dene</button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 slide-in">
          <KpiCard 
            label="Toplam Proje" 
            value={totalProjects.toString()} 
            sub={totalProjects > 0 ? `En son ${formatDate(projects[0]?.creative_project.updated_at || "")}` : "Henüz proje yok"} 
            icon="🎬" 
            color="blue" 
          />
          <KpiCard 
            label="Hazır" 
            value={readyProjects.toString()} 
            sub={readyProjects > 0 ? "Yayınlanmayı bekliyor" : "Henüz video yok"} 
            icon="✅" 
            color="green" 
          />
          <KpiCard 
            label="Yayınlandı" 
            value={publishedProjects.toString()} 
            sub={publishedProjects > 0 ? "Aktif kampanya" : "Henüz yayınlanmadı"} 
            icon="🚀" 
            color="navy" 
          />
        </div>

        {/* Activity */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
          <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#F1F5F9" }}>
            <h2 className="font-black text-lg" style={{ color: "#1B365D" }}>Son Aktiviteler</h2>
            <span 
              className="text-sm font-medium cursor-pointer" 
              style={{ color: "#00ADEF" }}
              onClick={() => navigate("/products")}
            >
              Tümünü Gör →
            </span>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-sm" style={{ color: "#64748B" }}>Henüz proje oluşturulmadı</p>
              <button
                onClick={() => navigate("/products")}
                className="mt-4 px-6 py-2 rounded-xl font-bold text-sm text-white"
                style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)" }}
              >
                İlk Projemi Oluştur
              </button>
            </div>
          ) : (
            <div className="divide-y border-b" style={{ borderColor: "#F8FAFC" }}>
              {projects.slice(0, 10).map((bundle, i) => {
                const project = bundle.creative_project;
                const subject = bundle.creative_subject;
                const statusInfo = getStatusInfo(project.status);
                
                return (
                  <div 
                    key={project.id} 
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/create?project=${project.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: "#F8FAFC" }}>
                        {statusInfo.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "#1B365D" }}>
                          {subject?.name || project.name}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                          {formatDate(project.updated_at)} güncellendi
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: statusInfo.color + "18", color: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
