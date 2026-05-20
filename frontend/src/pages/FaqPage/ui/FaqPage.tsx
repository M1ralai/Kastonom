import { useState } from "react";

const faqs = [
  {
    category: "Genel",
    items: [
      {
        q: "Kastonom nedir?",
        a: "Kastonom, KOBİ'ler için yapay zeka destekli video reklam üretim platformudur. ERP ve e-ticaret verilerinizi analiz ederek otomatik olarak profesyonel reklam videoları oluşturur."
      },
      {
        q: "Video üretimi ne kadar sürer?",
        a: "Normal üretim tipinde bir video ortalama 2-5 dakikada, bulk üretim modunda ise aynı anda birden fazla video paralel olarak üretilir."
      },
      {
        q: "Hangi platformlar için reklam üretebilirim?",
        a: "Starter paket ile tek platform (Google Ads veya Meta Ads), Growth paket ile tüm platformlar için reklam üretebilirsiniz. YouTube, Instagram, Facebook, TikTok ve daha fazlası desteklenir."
      },
    ]
  },
  {
    category: "Fiyatlandırma",
    items: [
      {
        q: "Fiyatlandırma nasıl çalışıyor?",
        a: "Aylık abonelik sistemiyle çalışıyoruz. Starter paket ₺4.500, Growth paket ₺7.500. Her iki pakette de ERP entegrasyonu ve AI destekli reklam üretimi dahil."
      },
      {
        q: "Kredi sistemi nedir?",
        a: "Her ay planınıza göre belirli sayıda video üretim kredisi alırsınız. Kullanılmayan krediler bir sonraki aya devredilmez."
      },
      {
        q: "İlk ay iade garantisi nedir?",
        a: "Beğenmezseniz ilk ayın ücretini koşulsuz iade ediyoruz. Risk sizin değil, bizim."
      },
      {
        q: "Kurumsal fatura alabilir miyim?",
        a: "Evet, tüm paketlerimizde kurumsal fatura ve vergi muafiyeti desteği sunuyoruz."
      },
    ]
  },
  {
    category: "Teknik",
    items: [
      {
        q: "ERP sistemimle entegre olabilir mi?",
        a: "Evet, Reybex ve popüler ERP sistemleriyle entegrasyon desteği sunuyoruz. API üzerinden ürün verilerinizi otomatik çekiyoruz."
      },
      {
        q: "Video çözünürlüğü nedir?",
        a: "Tüm videolar en az 1080p (Full HD) çözünürlükte üretilir. Growth paket kullanıcıları 4K çözünürlük seçeneğine de erişebilir."
      },
      {
        q: "Ürettiğim videoları indirebilir miyim?",
        a: "Evet, tüm videolarınızı MP4 formatında indirebilirsiniz. Bulut depolama alanınızda kalıcı olarak saklanır."
      },
      {
        q: "Otomatik hedefleme nasıl çalışıyor?",
        a: "AI, ürün özelliklerinizi ve hedef kitlenizi analiz ederek en uygun reklam hedeflemesini otomatik oluşturur. Google Ads ve Meta Ads'e direkt bağlanarak kampanyalarınızı başlatır."
      },
    ]
  },
  {
    category: "Destek",
    items: [
      {
        q: "Teknik destek alabilir miyim?",
        a: "Starter paket standart destek, Growth paket öncelikli özel destek sunar. Email ve canlı chat üzerinden 7/24 destek mevcut."
      },
      {
        q: "Eğitim alabilir miyim?",
        a: "Growth paket kullanıcılarına özel onboarding eğitimi ve kullanım kılavuzları sunuyoruz."
      },
      {
        q: "Paket değişikliği yapabilir miyim?",
        a: "Evet, istediğiniz zaman Starter'dan Growth'a veya tersi yönde geçiş yapabilirsiniz. Fark güncel dönem için hesaplanır."
      },
    ]
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="rounded-2xl border transition-all cursor-pointer"
      style={{
        background: isOpen ? "#fff" : "#fff",
        borderColor: isOpen ? "#00ADEF" : "#E2E8F0",
        boxShadow: isOpen ? "0 4px 20px rgba(0,173,239,.1)" : "none"
      }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center justify-between p-6">
        <h3 className="font-semibold pr-4" style={{ color: "#1B365D" }}>{q}</h3>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform"
          style={{
            background: isOpen ? "#00ADEF" : "#F8FAFC",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isOpen ? "#fff" : "#64748B"} strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
      {isOpen && (
        <div className="px-6 pb-6">
          <p className="leading-relaxed" style={{ color: "#64748B", lineHeight: 1.7 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export function FaqPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16 fade-in">
          <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-4" style={{ background: "#F0FDF4", color: "#16A34A" }}>
            ❓ SSS
          </div>
          <h1 className="text-4xl font-black mb-4" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>
            Sıkça Sorulan Sorular
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#64748B", lineHeight: 1.7 }}>
            Kastonom hakkında merak ettiğiniz her şeyi burada bulabilirsiniz.
            Başka sorularınız varsa bizimle iletişime geçin.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-12">
          {faqs.map((category, i) => (
            <div key={i}>
              <h2 className="text-xl font-black mb-6 flex items-center gap-3" style={{ color: "#1B365D" }}>
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#1B365D,#00ADEF)" }}
                >
                  <span className="text-white text-sm">{(i + 1).toString().padStart(2, '0')}</span>
                </span>
                {category.category}
              </h2>
              <div className="space-y-3">
                {category.items.map((item, j) => (
                  <FaqItem key={j} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div
          className="mt-16 rounded-3xl p-8 text-center"
          style={{ background: "linear-gradient(145deg,#1B365D 0%,#0F2247 100%)" }}
        >
          <h2 className="text-2xl font-black mb-3 text-white">Sorunuz burada yok mu?</h2>
          <p className="mb-6" style={{ color: "rgba(255,255,255,.7)" }}>
            Size özel yardımcı olmaktan mutluluk duyarız.
          </p>
          <button
            className="px-8 py-4 rounded-2xl font-black text-base text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)", boxShadow: "0 6px 24px rgba(140,198,63,.4)" }}
          >
            Bizimle İletişime Geç →
          </button>
        </div>

        {/* Quick Links */}
        <div className="mt-12 text-center">
          <p className="text-sm mb-4" style={{ color: "#94A3B8" }}>Hızlı erişim</p>
          <div className="flex justify-center gap-4">
            <a
              href="/pricing"
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: "#EFF9FF", color: "#00ADEF" }}
            >
              Fiyatlandırma
            </a>
            <a
              href="/about"
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: "#EFF9FF", color: "#00ADEF" }}
            >
              Hakkımızda
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FaqPage;
