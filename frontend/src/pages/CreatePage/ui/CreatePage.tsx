import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_PRODUCTS } from "@/shared/api/kastonomApi";
import type { ProductDisplay } from "@/shared/types/api";

interface CreatePageProps {
  selectedProduct?: ProductDisplay | null;
}

export function CreatePage({ selectedProduct = MOCK_PRODUCTS[0] }: CreatePageProps) {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState("TikTok");
  const [tone, setTone] = useState("Enerjik");
  const [style, setStyle] = useState("Ürün Odaklı");
  const [cta, setCta] = useState("Hemen Al");
  const [isGenerating, setIsGenerating] = useState(false);

  const opts = {
    platform: [
      { label: "TikTok", icon: "🎵" },
      { label: "Instagram Reels", icon: "📱" },
      { label: "YouTube Shorts", icon: "▶️" },
      { label: "Google Ads", icon: "🔍" },
    ],
    tone: [
      { label: "Enerjik", icon: "⚡" },
      { label: "Kurumsal", icon: "🏢" },
      { label: "Eğlenceli", icon: "😄" },
      { label: "Güven Odaklı", icon: "🤝" },
    ],
    style: [
      { label: "Ürün Odaklı", icon: "📦" },
      { label: "Kutu Açılımı", icon: "🎁" },
      { label: "Kullanım Sahnesi", icon: "🎭" },
      { label: "Karşılaştırma", icon: "⚖️" },
    ],
    cta: [
      { label: "Hemen Al", icon: "🛒" },
      { label: "Daha Fazla Bilgi", icon: "ℹ️" },
      { label: "İndirim Kazan", icon: "🏷️" },
      { label: "Stok Tükenmeden", icon: "⏰" },
    ],
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      navigate("/preview");
    }, 2000);
  };

  const getDuration = () => {
    if (platform === "TikTok") return "15-30 sn";
    if (platform === "YouTube Shorts") return "30-60 sn";
    return "15-30 sn";
  };

  const getAspectRatio = () => {
    if (platform === "Google Ads") return "1920x1080";
    return "1080x1920 (9:16)";
  };

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 fade-in">
          <h1 className="text-3xl font-black" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>
            Reklam Filmi Oluştur
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>
            Prompt yazmadan, sadece seçimlerinizle kişiselleştirilmiş reklam üretin.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left – product summary */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl border p-5 sticky top-24"
              style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}
            >
              <div className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: "#94A3B8" }}>
                Seçilen Ürün
              </div>
              <div
                className="w-full h-32 rounded-xl flex items-center justify-center text-6xl mb-4"
                style={{ background: "linear-gradient(135deg,#EFF9FF,#F0FDE8)" }}
              >
                {selectedProduct?.img || "📦"}
              </div>
              <div className="font-black text-sm mb-1" style={{ color: "#1B365D" }}>
                {selectedProduct?.name || "Ürün Adı"}
              </div>
              <div className="text-xs mb-3" style={{ color: "#94A3B8" }}>
                {selectedProduct?.sku || "SKU"} · {selectedProduct?.category || "Kategori"}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#64748B" }}>Kâr Marjı</span>
                  <span className="font-bold" style={{ color: "#8CC63F" }}>
                    {selectedProduct?.margin || "42%"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#64748B" }}>AI Skoru</span>
                  <span className="font-bold" style={{ color: "#1B365D" }}>
                    {selectedProduct?.score || 87}/100
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#64748B" }}>Stok</span>
                  <span className="font-bold" style={{ color: "#1B365D" }}>
                    {selectedProduct?.stock || "248 adet"}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "#F1F5F9" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: "#64748B" }}>
                  AI Neden Önerdi?
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>
                  {selectedProduct?.reasons?.[0] || "Arama hacminde %40 artış ve mevsimsel talep yüksekliği tespit edildi."}
                </div>
              </div>
            </div>
          </div>

          {/* Center – selectors */}
          <div className="lg:col-span-5 space-y-6">
            {[
              { key: "platform", label: "📱 Platform", state: platform, set: setPlatform },
              { key: "tone", label: "🎙️ Ton", state: tone, set: setTone },
              { key: "style", label: "🎬 Stil", state: style, set: setStyle },
              { key: "cta", label: "🎯 CTA Mesajı", state: cta, set: setCta },
            ].map(({ key, label, state, set }) => (
              <div
                key={key}
                className="rounded-2xl border p-5"
                style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(27,54,93,.04)" }}
              >
                <div className="text-sm font-black mb-3" style={{ color: "#1B365D" }}>
                  {label}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {opts[key as keyof typeof opts].map((o) => (
                    <button
                      key={o.label}
                      onClick={() => set(o.label)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                      style={
                        state === o.label
                          ? { background: "#EFF3FA", borderColor: "#1B365D" }
                          : { background: "#F8FAFC", borderColor: "#E2E8F0", color: "#64748B" }
                      }
                    >
                      <span className="text-lg">{o.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: state === o.label ? "#1B365D" : "#64748B" }}>
                        {o.label}
                      </span>
                      {state === o.label && <span className="ml-auto text-xs" style={{ color: "#8CC63F" }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right – creative brief */}
          <div className="lg:col-span-4">
            <div
              className="rounded-2xl border sticky top-24 overflow-hidden"
              style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 4px 24px rgba(27,54,93,.08)" }}
            >
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "#F1F5F9", background: "linear-gradient(90deg,#F8FAFC,#fff)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#8CC63F" }}></div>
                  <span className="text-sm font-black" style={{ color: "#1B365D" }}>
                    Kreatif Brief Önizlemesi
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                  Seçimlerinize göre anlık güncelleniyor
                </div>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { label: "Ürün", value: selectedProduct?.name || "Erkek Koşu Ayakkabısı Pro X" },
                  { label: "Platform", value: platform, color: "#00ADEF" },
                  { label: "Ton", value: tone, color: "#8CC63F" },
                  { label: "Stil", value: style, color: "#1B365D" },
                  { label: "CTA", value: cta, color: "#F59E0B" },
                  { label: "Süre", value: getDuration() },
                  { label: "Boyut", value: getAspectRatio() },
                ].map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: "#94A3B8" }}>
                      {item.label}
                    </span>
                    <span className="text-xs font-bold text-right" style={{ color: item.color || "#1B365D" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t" style={{ borderColor: "#F1F5F9" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "#64748B" }}>
                    AI Senaryo Özeti
                  </div>
                  <div
                    className="text-xs p-3 rounded-xl leading-relaxed"
                    style={{ background: "#F8FAFC", color: "#475569" }}
                  >
                    "{tone === "Enerjik" ? "Hızlı tempolu, dikkat çekici açılış" : "Güven veren, bilgilendirici açılış"} ile başlayan {style.toLowerCase()} formatında {platform} için optimize edilmiş video. "{cta}" CTA ile kapanış."
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div
                  className="text-xs px-3 py-2 rounded-xl mb-3 flex items-center gap-2"
                  style={{ background: "#F0FDE8", color: "#4D7C0F" }}
                >
                  <span>✓</span> Tahmini maliyet: <strong>₺ 85–120</strong>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn-primary w-full py-4 rounded-xl font-black text-white text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    background: isGenerating ? "#94A3B8" : "linear-gradient(135deg,#8CC63F,#6BAA2F)",
                    boxShadow: isGenerating ? "none" : "0 6px 20px rgba(140,198,63,.35)",
                    cursor: isGenerating ? "not-allowed" : "pointer",
                  }}
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      ⚡ Otonom Varyantları Üret
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
