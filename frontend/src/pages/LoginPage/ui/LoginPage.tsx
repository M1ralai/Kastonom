import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/shared/ui/Logo";
import { Badge } from "@/shared/ui/Badge";
import { login as apiLogin, register as apiRegister, setAuthToken, setAuthUser } from "@/shared/api/kastonomApi";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Lütfen e-posta ve şifre girin.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiLogin(email, password);
      
      // Store token - backend returns access_token, not token
      const token = result.access_token || result.token;
      if (token) {
        setAuthToken(token);
        // Set user info with tenant_id
        setAuthUser({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          tenant_id: result.user.tenant_id
        });
      }
      
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiRegister(email, password, name, companyName);
      
      // Store token - backend returns token for register
      const token = result.token || result.access_token;
      if (token) {
        setAuthToken(token);
        // Set user info with tenant_id from response
        const tenantId = result.tenant?.id || result.user.tenant_id;
        setAuthUser({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          tenant_id: tenantId
        });
      }
      
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  const handleErpLogin = () => {
    // ERP login will be implemented later
    setError("ERP entegrasyonu yakında eklenecek.");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#F8FAFC" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex w-1/2 items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(145deg,#1B365D 0%,#0F2247 50%,#00334D 100%)" }}
      >
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
            <h1 className="text-4xl font-black mb-2" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>
              {isRegisterMode ? "Hesap Oluşturun 👋" : "Tekrar Hoş Geldiniz 👋"}
            </h1>
            <p className="text-sm" style={{ color: "#64748B" }}>
              {isRegisterMode
                ? "Yapay zeka reklam platformunu kullanmaya başlayın."
                : "Hesabınıza giriş yapın ve yapay zeka reklamlarınızı yönetin."}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
              {error}
            </div>
          )}

          {/* Reybex ERP Button - Disabled for now */}
          <button
            onClick={handleErpLogin}
            className="w-full py-4 rounded-2xl font-bold text-base mb-6 flex items-center justify-center gap-3 border-2 transition-all cursor-not-allowed opacity-50"
            style={{ background: "#EFF9FF", borderColor: "#00ADEF", color: "#0284C7" }}
            disabled
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#00ADEF" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </div>
            Reybex (ERP) ile Bağlan
            <Badge color="blue">Yakında</Badge>
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{ background: "#E2E8F0" }}></div>
            <span className="text-xs font-medium" style={{ color: "#94A3B8" }}>veya e-posta ile</span>
            <div className="flex-1 h-px" style={{ background: "#E2E8F0" }}></div>
          </div>

          {/* Login/Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "#1B365D" }}>Ad Soyad</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ahmet Yılmaz"
                    className="w-full px-4 py-3.5 rounded-xl border text-sm transition-all"
                    style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "#1B365D" }}>Şirket Adı (Opsiyonel)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="ABC Ticaret Ltd."
                    className="w-full px-4 py-3.5 rounded-xl border text-sm transition-all"
                    style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#1B365D" }}>E-posta Adresi</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ahmet@sirket.com"
                className="w-full px-4 py-3.5 rounded-xl border text-sm transition-all"
                style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold" style={{ color: "#1B365D" }}>Şifre</label>
                {!isRegisterMode && (
                  <span className="text-xs font-medium cursor-pointer" style={{ color: "#00ADEF" }}>Şifremi Unuttum</span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-xl border text-sm transition-all"
                style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary pulse-green w-full py-4 rounded-2xl font-black text-base text-white transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg,#8CC63F,#6BAA2F)",
                boxShadow: "0 6px 24px rgba(140,198,63,.35)",
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  İşleniyor...
                </>
              ) : (
                isRegisterMode ? "Hesap Oluştur →" : "Giriş Yap →"
              )}
            </button>
          </form>

          <p className="text-center text-sm" style={{ color: "#94A3B8" }}>
            {isRegisterMode ? (
              <>
                Zaten hesabınız var mı?{" "}
                <span
                  className="font-semibold cursor-pointer"
                  style={{ color: "#00ADEF" }}
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError(null);
                  }}
                >
                  Giriş Yapın
                </span>
              </>
            ) : (
              <>
                Hesabınız yok mu?{" "}
                <span
                  className="font-semibold cursor-pointer"
                  style={{ color: "#00ADEF" }}
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError(null);
                  }}
                >
                  Ücretsiz Başlayın
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;