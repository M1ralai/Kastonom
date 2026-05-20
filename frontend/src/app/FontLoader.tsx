// Global font loader and CSS variables
export const FontLoader = () => (
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
