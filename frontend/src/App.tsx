import { useState, useEffect, useRef } from "react";

// ─── GOOGLE FONTS ───────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700;800;900&display=swap');
    * { font-family: 'Urbanist', sans-serif; box-sizing: border-box; }
    :root {
      --bg: #F8FAFC;
      --navy: #1B365D;
      --blue: #00ADEF;
      --green: #8CC63F;
      --navy10: rgba(27,54,93,0.10);
      --blue10: rgba(0,173,239,0.10);
      --green10: rgba(140,198,63,0.10);
    }
    body { background: var(--bg); margin:0; }
    .fade-in { animation: fadeIn .45s ease both; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
    .slide-in { animation: slideIn .4s cubic-bezier(.22,1,.36,1) both; }
    @keyframes slideIn { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:none} }
    .pulse-green { animation: pulseG 2s ease-in-out infinite; }
    @keyframes pulseG { 0%,100%{box-shadow:0 0 0 0 rgba(140,198,63,.4)} 50%{box-shadow:0 0 0 12px rgba(140,198,63,0)} }
    .spin { animation: spin 1.2s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .progress-bar { animation: progressFill 2.5s ease forwards; }
    @keyframes progressFill { from{width:0} }
    .float { animation: float 4s ease-in-out infinite; }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    .chip-active { background:#1B365D !important; color:#fff !important; }
    input:focus, textarea:focus, select:focus { outline:none; border-color:#00ADEF !important; box-shadow:0 0 0 3px rgba(0,173,239,.15); }
    ::-webkit-scrollbar { width:6px; }
    ::-webkit-scrollbar-track { background:#F1F5F9; }
    ::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:3px; }
    .nav-link:hover { color:#00ADEF !important; }
    .card-hover:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(27,54,93,.12) !important; }
    .btn-primary { transition: all .2s; }
    .btn-primary:hover { transform:translateY(-1px); filter:brightness(1.07); box-shadow:0 8px 24px rgba(140,198,63,.35) !important; }
    .btn-blue:hover { transform:translateY(-1px); filter:brightness(1.07); box-shadow:0 8px 24px rgba(0,173,239,.3) !important; }
    .variant-card:hover .select-overlay { opacity:1 !important; }
    .radial-progress { transition: stroke-dashoffset 1.5s ease; }
  `}</style>
);

// ─── SHARED COMPONENTS ──────────────────────────────────────────

const Logo = ({ size = "md" }) => {
  const s = size === "lg" ? { text: "text-3xl", dot: "w-3 h-3" } : { text: "text-xl", dot: "w-2 h-2" };
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: "linear-gradient(135deg,#1B365D,#00ADEF)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" fill="white" fillOpacity=".9"/>
          <path d="M9 12l2 2 4-4" stroke="#8CC63F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className={`font-black tracking-tight ${s.text}`} style={{ color: "#1B365D", letterSpacing: "-0.02em" }}>
        kasto<span style={{ color: "#00ADEF" }}>nom</span>
      </span>
    </div>
  );
};

const Navbar = ({ setPage, showNav = true }) => {
  const links = [
    { label: "Hakkımızda", id: "about" },
    { label: "Nasıl Çalışır", id: "how" },
    { label: "Fiyatlandırma", id: "pricing" },
    { label: "SSS", id: "faq" },
  ];
  return (
    <nav className="sticky top-0 z-50 border-b" style={{ background: "rgba(248,250,252,.95)", backdropFilter: "blur(12px)", borderColor: "#E2E8F0" }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => setPage("home")}><Logo /></div>
        {showNav && (
          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <span key={l.id} className="nav-link text-sm font-medium cursor-pointer transition-colors" style={{ color: "#64748B" }}>{l.label}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ borderColor: "#E2E8F0", background: "#fff" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#8CC63F" }}></div>
            <span className="text-sm font-semibold" style={{ color: "#1B365D" }}>₺ 1.240</span>
            <span className="text-xs" style={{ color: "#94A3B8" }}>kredi</span>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer" style={{ background: "linear-gradient(135deg,#1B365D,#00ADEF)" }}>AY</div>
        </div>
      </div>
    </nav>
  );
};

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: { bg: "#EFF9FF", text: "#0284C7" },
    green: { bg: "#F0FDE8", text: "#4D7C0F" },
    navy: { bg: "#EFF3FA", text: "#1B365D" },
    orange: { bg: "#FFF7ED", text: "#C2410C" },
  };
  const c = colors[color];
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>{children}</span>
  );
};

const KpiCard = ({ label, value, sub, icon, trend, color = "blue" }) => {
  const colors = { blue: "#00ADEF", green: "#8CC63F", navy: "#1B365D" };
  return (
    <div className="card-hover transition-all rounded-2xl p-6 border" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(27,54,93,.06)" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: colors[color] + "18" }}>{icon}</div>
        {trend && <Badge color={trend > 0 ? "green" : "orange"}>{trend > 0 ? "+" : ""}{trend}%</Badge>}
      </div>
      <div className="text-3xl font-black mb-1" style={{ color: "#1B365D" }}>{value}</div>
      <div className="text-sm font-semibold mb-0.5" style={{ color: "#1B365D" }}>{label}</div>
      {sub && <div className="text-xs" style={{ color: "#94A3B8" }}>{sub}</div>}
    </div>
  );
};

// ─── PAGE 1: LOGIN ───────────────────────────────────────────────
const LoginPage = ({ setPage }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  return (
    <div className="min-h-screen flex" style={{ background: "#F8FAFC" }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(145deg,#1B365D 0%,#0F2247 50%,#00334D 100%)" }}>
        {/* Decorative circles */}
        <div className="absolute" style={{ width: 500, height: 500, borderRadius: "50%", background: "rgba(0,173,239,.08)", top: -100, left: -100 }}></div>
        <div className="absolute" style={{ width: 300, height: 300, borderRadius: "50%", background: "rgba(140,198,63,.08)", bottom: -50, right: -50 }}></div>
        <div className="relative z-10 text-center px-12 fade-in">
          <div className="float mb-8">
            {/* AI Node Illustration */}
            <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
              {/* Central hexagon */}
              <polygon points="140,60 200,95 200,165 140,200 80,165 80,95" fill="rgba(0,173,239,.15)" stroke="#00ADEF" strokeWidth="1.5"/>
              {/* Inner hexagon */}
              <polygon points="140,85 175,103 175,139 140,157 105,139 105,103" fill="rgba(140,198,63,.2)" stroke="#8CC63F" strokeWidth="1.5"/>
              {/* Center circle */}
              <circle cx="140" cy="130" r="22" fill="#00ADEF" fillOpacity=".9"/>
              <text x="140" y="136" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">AI</text>
              {/* Outer nodes */}
              {[[140,32],[218,75],[218,185],[140,228],[62,185],[62,75]].map(([cx,cy],i) => (
                <g key={i}>
                  <line x1={cx} y1={cy} x2="140" y2="130" stroke="rgba(255,255,255,.15)" strokeWidth="1" strokeDasharray="4,4"/>
                  <circle cx={cx} cy={cy} r="14" fill={i%2===0?"rgba(140,198,63,.3)":"rgba(0,173,239,.3)"} stroke={i%2===0?"#8CC63F":"#00ADEF"} strokeWidth="1.5"/>
                  <text x={cx} y={cy+5} textAnchor="middle" fill="white" fontSize="10">
                    {["📦","📊","🎬","📣","⚡","🔗"][i]}
                  </text>
                </g>
              ))}
              {/* Orbit ring */}
              <circle cx="140" cy="130" r="70" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1.5" strokeDasharray="6,6"/>
            </svg>
          </div>
          <div className="mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-lg font-medium mt-4" style={{ color: "rgba(255,255,255,.7)", lineHeight: 1.6 }}>
            Veriyi Bağla. Ürünü Seç.<br />
            <span style={{ color: "#8CC63F", fontWeight: 700 }}>Reklamı Al.</span>
          </p>
          <div className="mt-8 flex justify-center gap-6">
            {["ERP Bağlantısı", "AI Öneri", "Otonom Üretim"].map((t, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 mx-auto rounded-xl mb-2 flex items-center justify-center text-lg" style={{ background: "rgba(255,255,255,.1)" }}>
                  {["🔌","🤖","🚀"][i]}
                </div>
                <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,.5)" }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md fade-in">
          <div className="lg:hidden mb-8"><Logo size="lg" /></div>
          <div className="mb-10">
            <h1 className="text-4xl font-black mb-2" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>Tekrar Hoş<br />Geldiniz 👋</h1>
            <p className="text-sm" style={{ color: "#64748B" }}>Hesabınıza giriş yapın ve yapay zeka reklamlarınızı yönetin.</p>
          </div>
          {/* Reybex Button - STAR CTA */}
          <button
            className="btn-blue w-full py-4 rounded-2xl font-bold text-base mb-6 flex items-center justify-center gap-3 border-2 transition-all"
            style={{ background: "#EFF9FF", borderColor: "#00ADEF", color: "#0284C7" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#00ADEF" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </div>
            Reybex (ERP) ile Bağlan
            <Badge color="blue">Önerilen</Badge>
          </button>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{ background: "#E2E8F0" }}></div>
            <span className="text-xs font-medium" style={{ color: "#94A3B8" }}>veya e-posta ile</span>
            <div className="flex-1 h-px" style={{ background: "#E2E8F0" }}></div>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#1B365D" }}>E-posta Adresi</label>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="ahmet@sirket.com"
                className="w-full px-4 py-3.5 rounded-xl border text-sm transition-all"
                style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold" style={{ color: "#1B365D" }}>Şifre</label>
                <span className="text-xs font-medium cursor-pointer" style={{ color: "#00ADEF" }}>Şifremi Unuttum</span>
              </div>
              <input
                type="password" value={pass} onChange={e=>setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-xl border text-sm transition-all"
                style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
              />
            </div>
          </div>
          <button
            onClick={() => setPage("home")}
            className="btn-primary pulse-green w-full py-4 rounded-2xl font-black text-base text-white mb-6 transition-all"
            style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)", boxShadow: "0 6px 24px rgba(140,198,63,.35)" }}
          >
            Giriş Yap →
          </button>
          <p className="text-center text-sm" style={{ color: "#94A3B8" }}>
            Hesabınız yok mu?{" "}
            <span className="font-semibold cursor-pointer" style={{ color: "#00ADEF" }}>Ücretsiz Başlayın</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE 2: HOME / DASHBOARD ────────────────────────────────────
const HomePage = ({ setPage }) => {
  const activities = [
    { name: "Erkek Spor Ayakkabı – Nike Run", status: "Yayında", color: "#8CC63F", icon: "🟢", views: "4.2K", ctr: "3.1%" },
    { name: "Çocuk Sırt Çantası – Ergonomik", status: "Sırada", color: "#00ADEF", icon: "🔵", views: "—", ctr: "—" },
    { name: "Bluetooth Kulaklık – Pro X200", status: "Render", color: "#F59E0B", icon: "🟡", views: "—", ctr: "—" },
    { name: "Koşu Bandı – EV Serisi", status: "Tamamlandı", color: "#94A3B8", icon: "⚪", views: "11.8K", ctr: "2.7%" },
  ];
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <Navbar setPage={setPage} page="home" />
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
            onClick={() => setPage("products")}
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
          <div className="divide-y" style={{ divideColor: "#F8FAFC" }}>
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

// ─── PAGE 3: PRODUCT DASHBOARD ───────────────────────────────────
const ProductsPage = ({ setPage }) => {
  const [activeChip, setActiveChip] = useState("En Çok Satanlar");
  const chips = ["Tümü", "En Çok Satanlar", "Yüksek Kâr Marjı", "Stok Azalıyor", "Yeni Ürünler", "Mevsimsel"];
  const products = [
    { name: "Erkek Koşu Ayakkabısı Pro X", sku: "SKU-4421", score: 87, category: "Spor", img: "👟", reasons: ["Arama hacmi %40 arttı","Sepet terk oranı düşük","Rakip stok azaldı"], margin: "42%", stock: "248 adet" },
    { name: "Bluetooth Kulaklık Wave 200", sku: "SKU-2981", score: 73, category: "Elektronik", img: "🎧", reasons: ["Yaz sezonu talebi yüksek","Sosyal medya trendi","Geri dönüş oranı düşük"], margin: "38%", stock: "115 adet" },
    { name: "Ergonomik Sırt Çantası Kids", sku: "SKU-7734", score: 65, category: "Çocuk", img: "🎒", reasons: ["Okul sezonu yaklaşıyor","Kâr marjı güçlü","Yorumlar pozitif"], margin: "55%", stock: "430 adet" },
  ];
  const featured = products[0];
  const radius = 54, circ = 2 * Math.PI * radius;
  const offset = circ - (featured.score / 100) * circ;
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <Navbar setPage={setPage} page="products" />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 fade-in">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>Ürün Dashboard</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>ERP verinizden analiz edilen ürünler · Bugün 09:42 senkronize edildi</p>
        </div>
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {chips.map(c => (
            <button
              key={c}
              onClick={() => setActiveChip(c)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${activeChip === c ? "chip-active border-transparent" : "border-slate-200 hover:border-blue-300"}`}
              style={activeChip === c ? {} : { background: "#fff", color: "#64748B" }}
            >{c}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Featured card */}
          <div className="lg:col-span-2 rounded-2xl border overflow-hidden fade-in" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 4px 24px rgba(27,54,93,.08)" }}>
            <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "#F1F5F9", background: "linear-gradient(90deg,#F0FDE8,#fff)" }}>
              <span className="text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: "#8CC63F" }}>⭐ GÜNÜN ÖNERİSİ</span>
              <span className="text-xs" style={{ color: "#94A3B8" }}>AI tarafından belirlendi · 3 saat önce</span>
            </div>
            <div className="p-6">
              <div className="flex gap-6 items-start">
                <div className="w-32 h-32 rounded-2xl flex items-center justify-center text-6xl flex-shrink-0" style={{ background: "linear-gradient(135deg,#EFF9FF,#F0FDE8)" }}>
                  {featured.img}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color="navy">{featured.category}</Badge>
                    <span className="text-xs" style={{ color: "#94A3B8" }}>{featured.sku}</span>
                  </div>
                  <h2 className="text-xl font-black mb-3" style={{ color: "#1B365D" }}>{featured.name}</h2>
                  <div className="flex gap-6 mb-4">
                    <div><div className="text-lg font-black" style={{ color: "#8CC63F" }}>{featured.margin}</div><div className="text-xs" style={{ color: "#94A3B8" }}>Kâr Marjı</div></div>
                    <div><div className="text-lg font-black" style={{ color: "#1B365D" }}>{featured.stock}</div><div className="text-xs" style={{ color: "#94A3B8" }}>Stok</div></div>
                  </div>
                  <div className="space-y-2">
                    {featured.reasons.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: "#F0FDE8", color: "#8CC63F" }}>✓</div>
                        <span style={{ color: "#475569" }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Score ring */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="relative">
                    <svg width="130" height="130" viewBox="0 0 130 130">
                      <circle cx="65" cy="65" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="10"/>
                      <circle cx="65" cy="65" r={radius} fill="none" stroke="#8CC63F" strokeWidth="10"
                        strokeDasharray={circ} strokeDashoffset={offset}
                        strokeLinecap="round" transform="rotate(-90 65 65)"
                        className="radial-progress"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-3xl font-black" style={{ color: "#1B365D" }}>{featured.score}</div>
                      <div className="text-xs font-medium" style={{ color: "#94A3B8" }}>/ 100</div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold mt-1" style={{ color: "#64748B" }}>AI Potansiyel</div>
                  <div className="text-xs font-semibold" style={{ color: "#8CC63F" }}>Skoru</div>
                </div>
              </div>
              <button
                onClick={() => setPage("create")}
                className="btn-primary w-full mt-6 py-4 rounded-xl font-black text-white text-base transition-all"
                style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)", boxShadow: "0 6px 20px rgba(140,198,63,.35)" }}
              >
                🎬 Bu Ürün İçin Video Üret
              </button>
            </div>
          </div>
          {/* Other products */}
          <div className="space-y-4">
            {products.slice(1).map((p, i) => (
              <div key={i} className="card-hover transition-all rounded-2xl border p-5 cursor-pointer" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(27,54,93,.05)" }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: "#F8FAFC" }}>{p.img}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black truncate" style={{ color: "#1B365D" }}>{p.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{p.sku}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                        <div className="h-full rounded-full" style={{ width: p.score + "%", background: p.score > 75 ? "#8CC63F" : "#00ADEF" }}></div>
                      </div>
                      <span className="text-xs font-bold" style={{ color: "#1B365D" }}>{p.score}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer hover:border-blue-300 transition-colors" style={{ borderColor: "#E2E8F0" }}>
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-sm font-semibold" style={{ color: "#94A3B8" }}>Tüm ürünleri gör</div>
              <div className="text-xs mt-1" style={{ color: "#CBD5E1" }}>247 ürün mevcut</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE 4: AD FILM CREATION ────────────────────────────────────
const CreatePage = ({ setPage }) => {
  const [platform, setPlatform] = useState("TikTok");
  const [tone, setTone] = useState("Enerjik");
  const [style, setStyle] = useState("Ürün Odaklı");
  const [cta, setCta] = useState("Hemen Al");
  const opts = {
    platform: [{ label: "TikTok", icon: "🎵" },{ label: "Instagram Reels", icon: "📱" },{ label: "YouTube Shorts", icon: "▶️" },{ label: "Google Ads", icon: "🔍" }],
    tone: [{ label: "Enerjik", icon: "⚡" },{ label: "Kurumsal", icon: "🏢" },{ label: "Eğlenceli", icon: "😄" },{ label: "Güven Odaklı", icon: "🤝" }],
    style: [{ label: "Ürün Odaklı", icon: "📦" },{ label: "Kutu Açılımı", icon: "🎁" },{ label: "Kullanım Sahnesi", icon: "🎭" },{ label: "Karşılaştırma", icon: "⚖️" }],
    cta: [{ label: "Hemen Al", icon: "🛒" },{ label: "Daha Fazla Bilgi", icon: "ℹ️" },{ label: "İndirim Kazan", icon: "🏷️" },{ label: "Stok Tükenmeden", icon: "⏰" }],
  };
  const selMap = { platform, tone, style, cta };
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <Navbar setPage={setPage} page="create" />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 fade-in">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setPage("products")} className="text-sm font-medium flex items-center gap-1" style={{ color: "#94A3B8" }}>← Geri</button>
          </div>
          <h1 className="text-3xl font-black" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>Reklam Filmi Oluştur</h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>Prompt yazmadan, sadece seçimlerinizle kişiselleştirilmiş reklam üretin.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left – product summary */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border p-5 sticky top-24" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
              <div className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: "#94A3B8" }}>Seçilen Ürün</div>
              <div className="w-full h-32 rounded-xl flex items-center justify-center text-6xl mb-4" style={{ background: "linear-gradient(135deg,#EFF9FF,#F0FDE8)" }}>👟</div>
              <div className="font-black text-sm mb-1" style={{ color: "#1B365D" }}>Erkek Koşu Ayakkabısı Pro X</div>
              <div className="text-xs mb-3" style={{ color: "#94A3B8" }}>SKU-4421 · Spor</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#64748B" }}>Kâr Marjı</span>
                  <span className="font-bold" style={{ color: "#8CC63F" }}>42%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#64748B" }}>AI Skoru</span>
                  <span className="font-bold" style={{ color: "#1B365D" }}>87/100</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "#64748B" }}>Stok</span>
                  <span className="font-bold" style={{ color: "#1B365D" }}>248 adet</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "#F1F5F9" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: "#64748B" }}>AI Neden Önerdi?</div>
                <div className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>Arama hacminde %40 artış ve mevsimsel talep yüksekliği tespit edildi.</div>
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
              <div key={key} className="rounded-2xl border p-5" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(27,54,93,.04)" }}>
                <div className="text-sm font-black mb-3" style={{ color: "#1B365D" }}>{label}</div>
                <div className="grid grid-cols-2 gap-2">
                  {opts[key].map(o => (
                    <button
                      key={o.label}
                      onClick={() => set(o.label)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                      style={state === o.label
                        ? { background: "#EFF3FA", borderColor: "#1B365D" }
                        : { background: "#F8FAFC", borderColor: "#E2E8F0", color: "#64748B" }
                      }
                    >
                      <span className="text-lg">{o.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: state === o.label ? "#1B365D" : "#64748B" }}>{o.label}</span>
                      {state === o.label && <span className="ml-auto text-xs" style={{ color: "#8CC63F" }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Right – creative brief */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border sticky top-24 overflow-hidden" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 4px 24px rgba(27,54,93,.08)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#F1F5F9", background: "linear-gradient(90deg,#F8FAFC,#fff)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#8CC63F" }}></div>
                  <span className="text-sm font-black" style={{ color: "#1B365D" }}>Kreatif Brief Önizlemesi</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>Seçimlerinize göre anlık güncelleniyor</div>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { label: "Ürün", value: "Erkek Koşu Ayakkabısı Pro X" },
                  { label: "Platform", value: platform, color: "#00ADEF" },
                  { label: "Ton", value: tone, color: "#8CC63F" },
                  { label: "Stil", value: style, color: "#1B365D" },
                  { label: "CTA", value: cta, color: "#F59E0B" },
                  { label: "Süre", value: platform === "TikTok" ? "15-30 sn" : platform === "YouTube Shorts" ? "30-60 sn" : "15-30 sn" },
                  { label: "Boyut", value: platform === "Google Ads" ? "1920x1080" : "1080x1920 (9:16)" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: "#94A3B8" }}>{item.label}</span>
                    <span className="text-xs font-bold text-right" style={{ color: item.color || "#1B365D" }}>{item.value}</span>
                  </div>
                ))}
                <div className="pt-3 border-t" style={{ borderColor: "#F1F5F9" }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: "#64748B" }}>AI Senaryo Özeti</div>
                  <div className="text-xs p-3 rounded-xl leading-relaxed" style={{ background: "#F8FAFC", color: "#475569" }}>
                    "{tone === "Enerjik" ? "Hızlı tempolu, dikkat çekici açılış" : "Güven veren, bilgilendirici açılış"} ile başlayan {style.toLowerCase()} formatında {platform} için optimize edilmiş video. "{cta}" CTA ile kapanış."
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="text-xs px-3 py-2 rounded-xl mb-3 flex items-center gap-2" style={{ background: "#F0FDE8", color: "#4D7C0F" }}>
                  <span>✓</span> Tahmini maliyet: <strong>₺ 85–120</strong>
                </div>
                <button
                  onClick={() => setPage("preview")}
                  className="btn-primary w-full py-4 rounded-xl font-black text-white text-sm transition-all"
                  style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)", boxShadow: "0 6px 20px rgba(140,198,63,.35)" }}
                >
                  ⚡ Otonom Varyantları Üret
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE 5: CAMPAIGN PREVIEW ─────────────────────────────────────
const PreviewPage = ({ setPage }) => {
  const [progress, setProgress] = useState({ scenario: 100, visual: 72, render: 34 });
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => ({
        scenario: 100,
        visual: Math.min(100, p.visual + 3),
        render: Math.min(100, p.render + 4),
      }));
    }, 200);
    return () => clearInterval(t);
  }, []);
  const variants = [
    { id: "A", label: "Varyant A – Enerji Odaklı", color: "#00ADEF", hook: "Hızlı kesimler", desc: "Daha yüksek enerjili bir kanca kullanıldı. İlk 3 saniyede hız teması işlendi.", ctr: "+12% beklenen CTR", emoji: "⚡" },
    { id: "B", label: "Varyant B – Güven Odaklı", color: "#8CC63F", hook: "Ürün detay", desc: "Kullanıcı güveni için ürün özellikleri öne çıkarıldı. Daha uzun bekleme süresi.", ctr: "+8% beklenen CTR", emoji: "🏆" },
  ];
  const steps = [
    { label: "Senaryo", value: progress.scenario },
    { label: "Görsel", value: progress.visual },
    { label: "Render", value: progress.render },
  ];
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <Navbar setPage={setPage} page="preview" />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 fade-in">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>Kampanya Önizlemesi</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>Yapay zeka 2 varyant üretti. Final için birini seçin.</p>
        </div>
        {/* Progress tracker */}
        <div className="rounded-2xl border p-6 mb-8" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-black" style={{ color: "#1B365D" }}>Üretim Durumu</div>
            <Badge color="green">{progress.render >= 100 ? "Tamamlandı" : "İşleniyor..."}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold" style={{ color: "#1B365D" }}>{s.label}</span>
                  <span className="font-bold" style={{ color: s.value >= 100 ? "#8CC63F" : "#00ADEF" }}>{Math.min(100,Math.round(s.value))}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#F1F5F9" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: Math.min(100, s.value) + "%", background: s.value >= 100 ? "linear-gradient(90deg,#8CC63F,#6BAA2F)" : "linear-gradient(90deg,#00ADEF,#0284C7)" }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Variant cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {variants.map(v => (
            <div
              key={v.id}
              className="variant-card rounded-2xl border-2 overflow-hidden transition-all cursor-pointer"
              style={{
                background: "#fff",
                borderColor: selected === v.id ? v.color : "#E2E8F0",
                boxShadow: selected === v.id ? `0 8px 32px ${v.color}30` : "0 2px 16px rgba(27,54,93,.06)",
                transform: selected === v.id ? "translateY(-2px)" : "none",
              }}
              onClick={() => setSelected(v.id)}
            >
              {/* Video placeholder */}
              <div className="relative" style={{ background: "linear-gradient(135deg,#1B365D,#0F2247)", paddingBottom: "56.25%" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-6xl mb-3 float">{v.emoji}</div>
                  <div className="text-4xl font-black text-white mb-2">▶</div>
                  <div className="text-xs text-center px-6" style={{ color: "rgba(255,255,255,.5)" }}>Video hazır · 15 saniye · 1080×1920</div>
                </div>
                <div className="absolute top-3 left-3">
                  <span className="text-xs font-black px-3 py-1.5 rounded-full text-white" style={{ background: v.color }}>
                    Varyant {v.id}
                  </span>
                </div>
                {selected === v.id && (
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background: "#8CC63F" }}>✓</div>
                )}
              </div>
              <div className="p-5">
                <div className="font-black text-sm mb-2" style={{ color: "#1B365D" }}>{v.label}</div>
                <div className="text-xs mb-3 leading-relaxed" style={{ color: "#64748B" }}>
                  <span className="font-semibold" style={{ color: "#00ADEF" }}>🤖 AI: </span>{v.desc}
                </div>
                <div className="flex items-center justify-between">
                  <Badge color={v.color === "#8CC63F" ? "green" : "blue"}>{v.ctr}</Badge>
                  <div className="text-xs" style={{ color: "#94A3B8" }}>Kanca: {v.hook}</div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(v.id); }}
                  className="w-full py-3 rounded-xl font-bold text-sm transition-all border-2"
                  style={selected === v.id
                    ? { background: v.color, borderColor: v.color, color: "#fff" }
                    : { background: "#fff", borderColor: "#E2E8F0", color: "#64748B" }
                  }
                >
                  {selected === v.id ? "✓ Seçildi" : "Final Olarak Seç"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {selected && (
          <div className="text-center fade-in">
            <button
              onClick={() => setPage("publish")}
              className="btn-primary inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-white text-base transition-all"
              style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)", boxShadow: "0 8px 28px rgba(140,198,63,.4)" }}
            >
              Yayınlama Ayarlarına Geç →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PAGE 6: PUBLISH ─────────────────────────────────────────────
const PublishPage = ({ setPage }) => {
  const [budget, setBudget] = useState("500");
  const integrations = [
    { name: "Meta Ads", icon: "📘", connected: true, account: "Kastonom Official · ID:1048290" },
    { name: "Google Ads", icon: "🔍", connected: true, account: "kastonom@ads.google · MCC aktif" },
    { name: "TikTok Ads", icon: "🎵", connected: false, account: "Bağlı değil" },
  ];
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <Navbar setPage={setPage} page="publish" />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 fade-in">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>Kampanyayı Yayınla</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>Final videounuzu inceleyin ve kampanya ayarlarını yapılandırın.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left – video preview */}
          <div className="lg:col-span-5 fade-in">
            <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 4px 24px rgba(27,54,93,.08)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#F1F5F9" }}>
                <div className="text-sm font-black" style={{ color: "#1B365D" }}>Final Video Önizlemesi</div>
                <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>Varyant A · 15 saniye · TikTok</div>
              </div>
              <div className="relative flex items-center justify-center" style={{ background: "linear-gradient(145deg,#1B365D,#0F2247)", paddingBottom: "120%" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
                  <div className="text-7xl mb-4 float">👟</div>
                  <div className="text-center">
                    <div className="text-xl font-black text-white mb-1">PRO X RUNNER</div>
                    <div className="text-sm text-blue-300 mb-3">Sınırlarını Zorla</div>
                    <div className="px-5 py-2.5 rounded-full font-bold text-sm text-white" style={{ background: "#8CC63F" }}>Hemen Al →</div>
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.2)" }}>
                    <span className="text-xs text-white">▶</span>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.2)" }}>
                    <div className="h-full rounded-full" style={{ width: "35%", background: "#8CC63F" }}></div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs font-semibold mb-2" style={{ color: "#64748B" }}>Reklam Metni</div>
                <div className="text-sm p-3 rounded-xl leading-relaxed" style={{ background: "#F8FAFC", color: "#1B365D", border: "1px solid #E2E8F0" }}>
                  "PRO X RUNNER ile her adımda fark yarat. Konfor ve performansın mükemmel birleşimi. Şimdi %15 indirimle!" 🔥
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge color="blue">15 sn</Badge>
                  <Badge color="navy">1080×1920</Badge>
                  <Badge color="green">Onaylı</Badge>
                </div>
              </div>
            </div>
          </div>
          {/* Right – settings */}
          <div className="lg:col-span-7 space-y-5">
            {/* Integrations */}
            <div className="rounded-2xl border p-5" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(27,54,93,.05)" }}>
              <div className="text-sm font-black mb-4" style={{ color: "#1B365D" }}>Platform Bağlantıları</div>
              <div className="space-y-3">
                {integrations.map((int, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#F8FAFC" }}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{int.icon}</span>
                      <div>
                        <div className="text-sm font-bold" style={{ color: "#1B365D" }}>{int.name}</div>
                        <div className="text-xs" style={{ color: "#94A3B8" }}>{int.account}</div>
                      </div>
                    </div>
                    {int.connected
                      ? <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: "#8CC63F" }}></div><span className="text-xs font-semibold" style={{ color: "#8CC63F" }}>Bağlı ✓</span></div>
                      : <button className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all" style={{ borderColor: "#00ADEF", color: "#00ADEF" }}>Bağlan</button>
                    }
                  </div>
                ))}
              </div>
            </div>
            {/* Budget */}
            <div className="rounded-2xl border p-5" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(27,54,93,.05)" }}>
              <div className="text-sm font-black mb-4" style={{ color: "#1B365D" }}>Günlük Bütçe</div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm" style={{ color: "#94A3B8" }}>₺</span>
                  <input
                    type="number" value={budget} onChange={e=>setBudget(e.target.value)}
                    className="w-full pl-8 pr-4 py-3.5 rounded-xl border text-sm font-bold transition-all"
                    style={{ borderColor: "#E2E8F0", color: "#1B365D" }}
                  />
                </div>
                <div className="text-xs p-3 rounded-xl" style={{ background: "#F0FDE8", color: "#4D7C0F" }}>
                  ~{Math.round(parseInt(budget||0)/12)} tıklama/gün
                </div>
              </div>
              <div className="flex gap-2">
                {["100","250","500","1000"].map(v => (
                  <button key={v} onClick={()=>setBudget(v)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all"
                    style={budget===v?{background:"#1B365D",borderColor:"#1B365D",color:"#fff"}:{background:"#fff",borderColor:"#E2E8F0",color:"#64748B"}}
                  >₺{v}</button>
                ))}
              </div>
            </div>
            {/* Audience */}
            <div className="rounded-2xl border p-5" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 12px rgba(27,54,93,.05)" }}>
              <div className="text-sm font-black mb-4" style={{ color: "#1B365D" }}>Hedef Kitle Özeti</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Yaş", value: "18–45" },
                  { label: "Cinsiyet", value: "Erkek %70" },
                  { label: "İlgi Alanı", value: "Spor & Outdoor" },
                  { label: "Konum", value: "Türkiye" },
                  { label: "Cihaz", value: "Mobil Öncelik" },
                  { label: "Tahmini Erişim", value: "120K–180K" },
                ].map((a, i) => (
                  <div key={i} className="flex justify-between items-center text-xs px-3 py-2 rounded-xl" style={{ background: "#F8FAFC" }}>
                    <span style={{ color: "#94A3B8" }}>{a.label}</span>
                    <span className="font-bold" style={{ color: "#1B365D" }}>{a.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Publish CTA */}
            <button
              onClick={() => setPage("performance")}
              className="btn-primary pulse-green w-full py-5 rounded-2xl font-black text-xl text-white transition-all"
              style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)", boxShadow: "0 8px 32px rgba(140,198,63,.4)" }}
            >
              🚀 Kampanyayı Yayına Al
            </button>
            <div className="text-center text-xs" style={{ color: "#94A3B8" }}>
              Onaylayarak Meta ve Google Ads politikalarını kabul etmiş olursunuz.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE 7: PERFORMANCE DASHBOARD ───────────────────────────────
const PerformancePage = ({ setPage }) => {
  const days = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
  const ctrData = [1.8, 2.1, 1.9, 2.5, 2.8, 3.1, 2.4];
  const roasData = [2.1, 2.4, 2.3, 2.8, 3.0, 3.5, 3.2];
  const maxVal = 4;
  const h = 160;
  const w = 460;
  const pts = (data) => data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / maxVal) * h}`).join(" ");
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <Navbar setPage={setPage} page="performance" />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8 fade-in">
          <div>
            <h1 className="text-3xl font-black mb-1" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>Performans Dashboard</h1>
            <p className="text-sm" style={{ color: "#64748B" }}>Erkek Koşu Ayakkabısı Pro X · Yayında · 7 gün</p>
          </div>
          <Badge color="green">🟢 Aktif Kampanya</Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left – video + budget */}
          <div className="lg:col-span-4 space-y-5">
            <div className="rounded-2xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 4px 24px rgba(27,54,93,.08)" }}>
              <div className="relative flex items-center justify-center" style={{ background: "linear-gradient(145deg,#1B365D,#0F2247)", paddingBottom: "75%" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-6xl mb-3 float">👟</div>
                  <div className="text-lg font-black text-white mb-1">PRO X RUNNER</div>
                  <div className="px-4 py-2 rounded-full text-xs font-bold text-white" style={{ background: "#8CC63F" }}>Hemen Al →</div>
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.2)" }}>
                    <div className="h-full rounded-full" style={{ width: "45%", background: "#8CC63F" }}></div>
                  </div>
                  <span className="text-xs text-white font-medium">00:07</span>
                </div>
                <div className="absolute top-3 left-3">
                  <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: "rgba(140,198,63,.9)", color: "#fff" }}>● CANLI</span>
                </div>
              </div>
              <div className="p-5">
                <div className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "#94A3B8" }}>Bütçe Durumu</div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: "#64748B" }}>Harcanan</span>
                  <span className="font-bold" style={{ color: "#1B365D" }}>₺1.240 / ₺3.500</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: "#F1F5F9" }}>
                  <div className="h-full rounded-full" style={{ width: "35%", background: "linear-gradient(90deg,#00ADEF,#8CC63F)" }}></div>
                </div>
                <div className="flex justify-between text-xs" style={{ color: "#94A3B8" }}>
                  <span>35% kullanıldı</span>
                  <span>4 gün kaldı</span>
                </div>
              </div>
            </div>
          </div>
          {/* Right */}
          <div className="lg:col-span-8 space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-4">
              <KpiCard label="CTR" value="%2.4" sub="Sektör: %1.4" icon="🎯" trend={14} color="blue" />
              <KpiCard label="ROAS" value="3.2×" sub="Hedef: 2.5×" icon="💰" trend={28} color="green" />
              <KpiCard label="CPA" value="₺45" sub="Hedef: ₺60" icon="📊" trend={-12} color="navy" />
            </div>
            {/* Chart */}
            <div className="rounded-2xl border p-6" style={{ background: "#fff", borderColor: "#E2E8F0", boxShadow: "0 2px 16px rgba(27,54,93,.06)" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-sm font-black" style={{ color: "#1B365D" }}>Son 7 Gün Performansı</div>
                  <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>CTR ve ROAS trendi</div>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: "#1B365D" }}></div><span style={{ color: "#64748B" }}>CTR</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: "#00ADEF" }}></div><span style={{ color: "#64748B" }}>ROAS</span></div>
                </div>
              </div>
              <div className="relative" style={{ height: 180 }}>
                <svg width="100%" height="180" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                  {/* Grid */}
                  {[0.25,.5,.75,1].map(g => (
                    <line key={g} x1="0" y1={h - g*h} x2={w} y2={h - g*h} stroke="#F1F5F9" strokeWidth="1"/>
                  ))}
                  {/* CTR area */}
                  <defs>
                    <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1B365D" stopOpacity="0.15"/>
                      <stop offset="100%" stopColor="#1B365D" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="gr2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00ADEF" stopOpacity="0.12"/>
                      <stop offset="100%" stopColor="#00ADEF" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <polygon points={`0,${h} ${pts(ctrData)} ${w},${h}`} fill="url(#gr1)"/>
                  <polyline points={pts(ctrData)} fill="none" stroke="#1B365D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <polygon points={`0,${h} ${pts(roasData)} ${w},${h}`} fill="url(#gr2)"/>
                  <polyline points={pts(roasData)} fill="none" stroke="#00ADEF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* Dots */}
                  {ctrData.map((v,i)=>(
                    <circle key={i} cx={(i/(ctrData.length-1))*w} cy={h-(v/maxVal)*h} r="4" fill="#1B365D" stroke="#fff" strokeWidth="2"/>
                  ))}
                  {roasData.map((v,i)=>(
                    <circle key={i} cx={(i/(roasData.length-1))*w} cy={h-(v/maxVal)*h} r="4" fill="#00ADEF" stroke="#fff" strokeWidth="2"/>
                  ))}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1" style={{ transform: "translateY(20px)" }}>
                  {days.map(d => <span key={d} className="text-xs" style={{ color: "#94A3B8" }}>{d}</span>)}
                </div>
              </div>
            </div>
            {/* AI Insight */}
            <div className="rounded-2xl border p-5" style={{ background: "linear-gradient(135deg,#EFF9FF,#F8FAFC)", borderColor: "#BAE6FD" }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(0,173,239,.15)" }}>🤖</div>
                <div>
                  <div className="text-sm font-black mb-1" style={{ color: "#1B365D" }}>AI İçgörüsü</div>
                  <div className="text-sm mb-3 leading-relaxed" style={{ color: "#475569" }}>
                    İzleyicilerin <strong style={{ color: "#1B365D" }}>%60'ı ilk 3 saniyede</strong> çıkıyor. Kanca sahnesini daha enerjik bir versiyonla değiştirmek CTR'yi tahminen <strong style={{ color: "#8CC63F" }}>%35 artırabilir</strong>. Yeni bir video varyantı önerilmektedir.
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#FEF3C7", color: "#92400E" }}>⚡ İlk 3 sn kanca sorunu</span>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#F0FDE8", color: "#4D7C0F" }}>📈 ROAS hedefi aşıldı</span>
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#EFF9FF", color: "#0284C7" }}>🎯 CPA optimum seviyede</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Iteration CTA */}
            <button
              onClick={() => setPage("create")}
              className="btn-primary pulse-green w-full py-5 rounded-2xl font-black text-xl text-white transition-all"
              style={{ background: "linear-gradient(135deg,#8CC63F,#6BAA2F)", boxShadow: "0 8px 32px rgba(140,198,63,.4)" }}
            >
              🔄 Otonom İterasyon Başlat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── NAV SIDEBAR (MOBILE HINT) ────────────────────────────────────
const PageNav = ({ page, setPage }) => {
  const pages = [
    { id: "login", icon: "🔐", label: "Login" },
    { id: "home", icon: "🏠", label: "Anasayfa" },
    { id: "products", icon: "📦", label: "Ürünler" },
    { id: "create", icon: "🎬", label: "Oluştur" },
    { id: "preview", icon: "👁️", label: "Önizle" },
    { id: "publish", icon: "🚀", label: "Yayınla" },
    { id: "performance", icon: "📊", label: "Performans" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t flex" style={{ background: "rgba(248,250,252,.97)", backdropFilter: "blur(12px)", borderColor: "#E2E8F0" }}>
      {pages.map(p => (
        <button
          key={p.id}
          onClick={() => setPage(p.id)}
          className="flex-1 flex flex-col items-center justify-center py-2.5 transition-all"
          style={{ color: page === p.id ? "#1B365D" : "#94A3B8" }}
        >
          <span className="text-lg">{p.icon}</span>
          <span className="text-xs font-semibold mt-0.5" style={{ fontSize: "10px" }}>{p.label}</span>
          {page === p.id && <div className="w-4 h-0.5 rounded-full mt-1" style={{ background: "#8CC63F" }}></div>}
        </button>
      ))}
    </div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("login");
  const pages = { login: LoginPage, home: HomePage, products: ProductsPage, create: CreatePage, preview: PreviewPage, publish: PublishPage, performance: PerformancePage };
  const PageComponent = pages[page] || LoginPage;
  return (
    <>
      <FontLoader />
      <div style={{ paddingBottom: "64px" }}>
        <PageComponent setPage={setPage} />
      </div>
      <PageNav page={page} setPage={setPage} />
    </>
  );
}
