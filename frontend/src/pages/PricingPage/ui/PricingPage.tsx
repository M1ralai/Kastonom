
const features = {
  starter: [
    { icon: "🎬", label: "Video Üretimi", value: "50 video/ay", highlight: false },
    { icon: "⚡", label: "Üretim Tipi", value: "Normal Üretim", highlight: false },
    { icon: "📊", label: "Performans Takibi", value: "Standart Dashboard", highlight: false },
    { icon: "🔄", label: "Tekrar Üretim", value: "5 tekrar/ay", highlight: false },
    { icon: "📱", label: "Platform Desteği", value: "Tek platform", highlight: false },
    { icon: "💾", label: "Depolama", value: "10 GB bulut", highlight: false },
  ],
  growth: [
    { icon: "🎬", label: "Video Üretimi", value: "100 video/ay", highlight: true },
    { icon: "⚡", label: "Üretim Tipi", value: "Bulk Üretim", highlight: true },
    { icon: "📊", label: "Performans Takibi", value: "Gelişmiş Analytics", highlight: true },
    { icon: "🔄", label: "Tekrar Üretim", value: "Sınırsız tekrar", highlight: true },
    { icon: "📱", label: "Platform Desteği", value: "Çoklu platform", highlight: true },
    { icon: "💾", label: "Depolama", value: "50 GB bulut", highlight: true },
  ],
};

const automationFeatures = [
  { icon: "🎯", label: "Otomatik Hedefleme", desc: "AI destekli hedef kitle analizi ve otomatik segmentasyon", starter: false, growth: true },
  { icon: "🔗", label: "Google Ads Entegrasyonu", desc: "Reklamlarınızı otomatik olarak Google Ads'e yükleyin", starter: false, growth: true },
  { icon: "📘", label: "Meta Ads Bağlantısı", desc: "Facebook ve Instagram reklamlarınızı direkt yayınlayın", starter: false, growth: true },
  { icon: "🧪", label: "A/B Testleri", desc: "Otomatik varyasyon testleri ile en etkili reklamı bulun", starter: false, growth: true },
  { icon: "📈", label: "ROI Optimizasyonu", desc: "Performans verilerine göre bütçe dağılımı", starter: false, growth: true },
  { icon: "🤖", label: "Otonom Kampanya", desc: "AI kendi başına kampanya oluşturur ve yönetir", starter: false, growth: true },
];

export function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16 fade-in">
          <Badge color="green">💰 Fiyatlandırma</Badge>
          <h1 className="text-4xl font-black mt-4 mb-4" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>
            İhtiyacınıza Uygun Planı Seçin
          </h1>
          <p className="text-base max-w-2xl mx-auto" style={{ color: "#64748B", lineHeight: 1.7 }}>
            KOBİ'lerin büyümesi için tasarlanmış, esnek ve güçlü paketler.
            Her iki pakette de ERP entegrasyonu ve AI destekli reklam üretimi dahil.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 slide-in">
          {/* Starter Card */}
          <div
            className="rounded-3xl p-8 border-2 transition-all hover:shadow-xl"
            style={{ background: "#fff", borderColor: "#E2E8F0" }}
          >
            <div className="mb-6">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3" style={{ background: "#EFF9FF", color: "#00ADEF" }}>
                STARTER
              </div>
              <h2 className="text-2xl font-black mb-2" style={{ color: "#1B365D" }}>Başlangıç Paketi</h2>
              <p className="text-sm" style={{ color: "#64748B" }}>İlk adımınızı atın, AI reklam gücünü keşfedin</p>
            </div>

            <div className="mb-8">
              <span className="text-5xl font-black" style={{ color: "#1B365D" }}>₺4.500</span>
              <span style={{ color: "#94A3B8" }}> /ay</span>
            </div>

            {/* Mini Chart */}
            <div className="mb-8 p-6 rounded-2xl" style={{ background: "#F8FAFC" }}>
              <div className="flex items-end justify-between h-32 gap-4">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg" style={{ height: "50px", background: "linear-gradient(180deg, #00ADEF, #00ADEF50)" }}></div>
                  <span className="text-xs font-semibold" style={{ color: "#1B365D" }}>50</span>
                  <span className="text-xs" style={{ color: "#94A3B8" }}>Video</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg" style={{ height: "24px", background: "linear-gradient(180deg, #8CC63F, #8CC63F50)" }}></div>
                  <span className="text-xs font-semibold" style={{ color: "#1B365D" }}>10 GB</span>
                  <span className="text-xs" style={{ color: "#94A3B8" }}>Depo</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg" style={{ height: "16px", background: "linear-gradient(180deg, #F59E0B, #F59E0B50)" }}></div>
                  <span className="text-xs font-semibold" style={{ color: "#1B365D" }}>5x</span>
                  <span className="text-xs" style={{ color: "#94A3B8" }}>Tekrar</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {features.starter.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EFF9FF" }}>
                    <span className="text-sm">{f.icon}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm" style={{ color: "#64748B" }}>{f.label}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "#1B365D" }}>{f.value}</span>
                </div>
              ))}
            </div>

            <button
              className="w-full py-4 rounded-2xl font-black text-base transition-all"
              style={{ background: "#F8FAFC", color: "#1B365D", border: "2px solid #E2E8F0" }}
            >
              Starter ile Başla →
            </button>
          </div>

          {/* Growth Card */}
          <div
            className="rounded-3xl p-8 border-2 relative overflow-hidden"
            style={{ background: "linear-gradient(145deg,#1B365D 0%,#0F2247 100%)" }}
          >
            {/* Popular Badge */}
            <div
              className="absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: "#8CC63F", color: "#fff" }}
            >
              ⭐ ÖNERİLEN
            </div>

            <div className="mb-6">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3" style={{ background: "rgba(140,198,63,.2)", color: "#8CC63F" }}>
                GROWTH
              </div>
              <h2 className="text-2xl font-black mb-2 text-white">Büyüme Paketi</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,.7)" }}>
                Tam otonom reklam gücü, sınırsız potansiyel
              </p>
            </div>

            <div className="mb-8">
              <span className="text-5xl font-black text-white">₺7.500</span>
              <span style={{ color: "rgba(255,255,255,.5)" }}> /ay</span>
            </div>

            {/* Mini Chart */}
            <div className="mb-8 p-6 rounded-2xl" style={{ background: "rgba(255,255,255,.05)" }}>
              <div className="flex items-end justify-between h-32 gap-4">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg" style={{ height: "100px", background: "linear-gradient(180deg, #8CC63F, #8CC63F50)" }}></div>
                  <span className="text-xs font-semibold text-white">100</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,.5)" }}>Video</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg" style={{ height: "48px", background: "linear-gradient(180deg, #00ADEF, #00ADEF50)" }}></div>
                  <span className="text-xs font-semibold text-white">50 GB</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,.5)" }}>Depo</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg" style={{ height: "32px", background: "linear-gradient(180deg, #F59E0B, #F59E0B50)" }}></div>
                  <span className="text-xs font-semibold text-white">∞</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,.5)" }}>Tekrar</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {features.growth.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(140,198,63,.2)" }}>
                    <span className="text-sm">{f.icon}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm" style={{ color: "rgba(255,255,255,.7)" }}>{f.label}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "#8CC63F" }}>{f.value}</span>
                </div>
              ))}
            </div>

            <button
              className="w-full py-4 rounded-2xl font-black text-base text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)", boxShadow: "0 6px 24px rgba(140,198,63,.4)" }}
            >
              Growth ile Başla →
            </button>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="rounded-3xl p-8 border mb-16" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
          <h2 className="text-2xl font-black mb-2 text-center" style={{ color: "#1B365D" }}>
            📊 Özellik Karşılaştırması
          </h2>
          <p className="text-sm text-center mb-8" style={{ color: "#64748B" }}>
            İki paket arasındaki farkları inceleyin
          </p>

          {/* Feature Bars */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold" style={{ color: "#1B365D" }}>Video Üretimi</span>
                <div className="flex gap-8 text-sm">
                  <span style={{ color: "#64748B" }}>50/ay</span>
                  <span className="font-bold" style={{ color: "#8CC63F" }}>100/ay</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-3 rounded-full" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: "50%", background: "#00ADEF" }}></div>
                </div>
                <div className="flex-1 h-3 rounded-full" style={{ background: "rgba(140,198,63,.2)" }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: "#8CC63F" }}></div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold" style={{ color: "#1B365D" }}>Bulut Depolama</span>
                <div className="flex gap-8 text-sm">
                  <span style={{ color: "#64748B" }}>10 GB</span>
                  <span className="font-bold" style={{ color: "#8CC63F" }}>50 GB</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-3 rounded-full" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: "20%", background: "#00ADEF" }}></div>
                </div>
                <div className="flex-1 h-3 rounded-full" style={{ background: "rgba(140,198,63,.2)" }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: "#8CC63F" }}></div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold" style={{ color: "#1B365D" }}>Aylık Tekrar Hakkı</span>
                <div className="flex gap-8 text-sm">
                  <span style={{ color: "#64748B" }}>5 kez</span>
                  <span className="font-bold" style={{ color: "#8CC63F" }}>Sınırsız</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-3 rounded-full" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: "15%", background: "#00ADEF" }}></div>
                </div>
                <div className="flex-1 h-3 rounded-full" style={{ background: "rgba(140,198,63,.2)" }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: "#8CC63F" }}></div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold" style={{ color: "#1B365D" }}>Platform Desteği</span>
                <div className="flex gap-8 text-sm">
                  <span style={{ color: "#64748B" }}>1 platform</span>
                  <span className="font-bold" style={{ color: "#8CC63F" }}>Tüm platformlar</span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-3 rounded-full" style={{ background: "#E2E8F0" }}>
                  <div className="h-full rounded-full" style={{ width: "25%", background: "#00ADEF" }}></div>
                </div>
                <div className="flex-1 h-3 rounded-full" style={{ background: "rgba(140,198,63,.2)" }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: "#8CC63F" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Features */}
        <div className="rounded-3xl p-8 border" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black mb-2" style={{ color: "#1B365D" }}>
              🚀 Growth'a Özel Otomasyonlar
            </h2>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Growth paketi ile reklamlarınız otonom olarak yönetilir
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {automationFeatures.map((feature, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border transition-all"
                style={{
                  background: feature.growth ? "linear-gradient(135deg, rgba(140,198,63,.05), rgba(140,198,63,.02))" : "#F8FAFC",
                  borderColor: feature.growth ? "#8CC63F" : "#E2E8F0"
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: feature.growth ? "rgba(140,198,63,.15)" : "#E2E8F0" }}
                  >
                    <span className="text-lg">{feature.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1" style={{ color: "#1B365D" }}>{feature.label}</h3>
                    <p className="text-xs" style={{ color: "#64748B", lineHeight: 1.5 }}>{feature.desc}</p>
                    {feature.growth && (
                      <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#8CC63F", color: "#fff" }}>
                        Dahil
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-sm mb-4" style={{ color: "#64748B" }}>
            Hangi planı seçerseniz seçin, ilk ayın ücretini iade garantisi sunuyoruz.
          </p>
          <div className="flex justify-center gap-4 text-sm" style={{ color: "#94A3B8" }}>
            <span>✓ Kurumsal fatura</span>
            <span>✓ Vergi muafiyeti</span>
            <span>✓ Özel destek</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import Badge component
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, { bg: string; text: string }> = {
    green: { bg: "#F0FDF4", text: "#16A34A" },
    blue: { bg: "#EFF9FF", text: "#00ADEF" },
    navy: { bg: "rgba(27,54,93,.1)", text: "#1B365D" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span
      className="inline-block px-4 py-1.5 rounded-full text-sm font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      {children}
    </span>
  );
}

export default PricingPage;
