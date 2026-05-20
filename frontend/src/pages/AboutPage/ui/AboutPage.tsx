import { Logo } from "@/shared/ui/Logo";

export function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12 fade-in">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <h1 className="text-4xl font-black mb-3" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>
            Hakkımızda
          </h1>
          <p className="text-base" style={{ color: "#64748B" }}>AI destekli reklam platformu</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Mission Section */}
          <div className="rounded-2xl p-8 border" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
            <h2 className="text-xl font-black mb-4" style={{ color: "#1B365D" }}>Misyonumuz</h2>
            <p className="leading-relaxed" style={{ color: "#64748B", lineHeight: 1.7 }}>
              Kastonom, KOBİ'lerin yapay zeka destekli video reklamlar oluşturmasını kolaylaştıran
              bir platformdur. Geleneksel reklamcılık süreçlerini modernize ederek, işletmelerin
              dijital pazarlama hedeflerine ulaşmasını sağlıyoruz.
            </p>
          </div>

          {/* Features Section */}
          <div className="rounded-2xl p-8 border" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
            <h2 className="text-xl font-black mb-6" style={{ color: "#1B365D" }}>Özelliklerimiz</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EFF9FF" }}>
                  <span className="text-xl">🎬</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: "#1B365D" }}>AI Video Üretimi</h3>
                  <p className="text-sm" style={{ color: "#64748B" }}>
                    Metin açıklamasından profesyonel reklam videoları oluşturun
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F5F3FF" }}>
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: "#1B365D" }}>Performans Analizi</h3>
                  <p className="text-sm" style={{ color: "#64748B" }}>
                    Reklam kampanyalarınızın performansını takip edin
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F0FDF4" }}>
                  <span className="text-xl">🔄</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: "#1B365D" }}>Akıllı Optimizasyon</h3>
                  <p className="text-sm" style={{ color: "#64748B" }}>
                    AI destekli önerilerle reklamlarınızı iyileştirin
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FFF7ED" }}>
                  <span className="text-xl">🔗</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: "#1B365D" }}>Entegrasyonlar</h3>
                  <p className="text-sm" style={{ color: "#64748B" }}>
                    ERP ve e-ticaret sistemleriyle entegrasyon
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Technology Section */}
          <div className="rounded-2xl p-8 border" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
            <h2 className="text-xl font-black mb-4" style={{ color: "#1B365D" }}>Teknoloji</h2>
            <p className="leading-relaxed mb-6" style={{ color: "#64748B", lineHeight: 1.7 }}>
              Kastonom, modern web teknolojileri ve yapay zeka modelleri kullanılarak geliştirilmiştir.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {["React", "TypeScript", "Node.js", "PostgreSQL", "AI/ML"].map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 text-sm font-semibold rounded-xl"
                  style={{ background: "#EFF9FF", color: "#00ADEF" }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Team Section */}
          <div className="rounded-2xl p-8 border" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
            <h2 className="text-xl font-black mb-6" style={{ color: "#1B365D" }}>Ekibimiz</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1B365D,#00ADEF)" }}>
                  <span className="text-white text-sm font-bold">AD</span>
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "#1B365D" }}>Atahan Demirer</h3>
                <p className="text-xs" style={{ color: "#94A3B8" }}>Founder</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)" }}>
                  <span className="text-white text-sm font-bold">MBY</span>
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "#1B365D" }}>Miraç Burak Yorulmaz</h3>
                <p className="text-xs" style={{ color: "#94A3B8" }}>AI Engineer</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F59E0B,#EA580C)" }}>
                  <span className="text-white text-sm font-bold">OÖ</span>
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "#1B365D" }}>Oğuzhan Özdemir</h3>
                <p className="text-xs" style={{ color: "#94A3B8" }}>Developer</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>
                  <span className="text-white text-sm font-bold">STK</span>
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "#1B365D" }}>Selçuk Tuğra Köroğlu</h3>
                <p className="text-xs" style={{ color: "#94A3B8" }}>ML Engineer</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#EC4899,#DB2777)" }}>
                  <span className="text-white text-sm font-bold">EK</span>
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "#1B365D" }}>Emrullah Keskin</h3>
                <p className="text-xs" style={{ color: "#94A3B8" }}>Designer</p>
              </div>
            </div>
          </div>

          {/* Version Info */}
          <div className="text-center py-6">
            <p style={{ color: "#94A3B8" }}>Version 0.1.0 • Hackathon MVP</p>
          </div>
        </div>
      </div>
    </div>
  );
}
