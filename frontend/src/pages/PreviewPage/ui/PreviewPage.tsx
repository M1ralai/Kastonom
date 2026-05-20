import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_PRODUCTS, MOCK_GENERATED_VIDEOS } from "@/shared/api/kastonomApi";

export function PreviewPage() {
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = () => {
    if (!selectedVideo) return;
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      alert("Video başarıyla yayınlandı!");
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 fade-in">
          <h1 className="text-3xl font-black" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>
            Video Önizleme
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>
            Oluşturulan varyantları inceleyin ve yayınlamak istediğinizi seçin.
          </p>
        </div>

        {/* Product Info Bar */}
        <div
          className="rounded-2xl border p-4 mb-6 flex items-center justify-between"
          style={{ background: "#fff", borderColor: "#E2E8F0" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: "linear-gradient(135deg,#EFF9FF,#F0FDE8)" }}
            >
              {MOCK_PRODUCTS[0].img}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "#1B365D" }}>
                {MOCK_PRODUCTS[0].name}
              </div>
              <div className="text-xs" style={{ color: "#94A3B8" }}>
                TikTok · Enerjik · 15-30 sn
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#F0FDE8", color: "#4D7C0F" }}>
              ✓ 2 varyant oluşturuldu
            </span>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {MOCK_GENERATED_VIDEOS.map((video, index) => (
            <div
              key={video.id}
              className={`rounded-2xl border-2 transition-all cursor-pointer ${
                selectedVideo === video.id ? "p-1" : ""
              }`}
              style={{
                borderColor: selectedVideo === video.id ? "#8CC63F" : "#E2E8F0",
                background: "#fff",
              }}
              onClick={() => setSelectedVideo(video.id)}
            >
              <div className="relative">
                {/* Video Thumbnail Placeholder */}
                <div
                  className="w-full aspect-[9/16] rounded-t-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#1B365D,#2D4A7A)" }}
                >
                  <div className="text-center text-white">
                    <div className="text-6xl mb-2">🎬</div>
                    <div className="text-sm font-medium">Video {index + 1}</div>
                    <div className="text-xs opacity-70 mt-1">{video.duration_seconds}s</div>
                  </div>
                  {/* Play Button */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                      style={{ background: "rgba(255,255,255,0.9)" }}
                    >
                      ▶
                    </div>
                  </div>
                </div>
                {/* Selection Badge */}
                {selectedVideo === video.id && (
                  <div
                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: "#8CC63F", color: "#fff" }}
                  >
                    ✓ Seçildi
                  </div>
                )}
              </div>
              {/* Video Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold" style={{ color: "#1B365D" }}>
                    Varyant {index + 1}
                  </span>
                  <span className="text-xs px-2 py-1 rounded" style={{ background: "#F1F5F9", color: "#64748B" }}>
                    9:16 · {video.duration_seconds}s
                  </span>
                </div>
                <div className="text-xs" style={{ color: "#94A3B8" }}>
                  TikTok, Instagram Reels için optimize edildi
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/create")}
            className="flex-1 py-4 rounded-xl font-bold text-sm transition-all border-2"
            style={{
              borderColor: "#E2E8F0",
              background: "#fff",
              color: "#1B365D",
            }}
          >
            ↻ Yeni Varyant Oluştur
          </button>
          <button
            onClick={handlePublish}
            disabled={!selectedVideo || isPublishing}
            className="flex-1 py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: selectedVideo
                ? "linear-gradient(135deg,#8CC63F,#6BAA2F)"
                : "#94A3B8",
              color: "#fff",
              cursor: selectedVideo ? "pointer" : "not-allowed",
              boxShadow: selectedVideo ? "0 6px 20px rgba(140,198,63,.35)" : "none",
            }}
          >
            {isPublishing ? (
              <>
                <span className="animate-spin">⟳</span>
                Yayınlanıyor...
              </>
            ) : (
              <>
                📤 Yayınla
              </>
            )}
          </button>
        </div>

        {/* Tips */}
        <div
          className="mt-8 p-4 rounded-xl"
          style={{ background: "#EFF3FA" }}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div>
              <div className="text-sm font-bold mb-1" style={{ color: "#1B365D" }}>
                İpuçları
              </div>
              <ul className="text-xs space-y-1" style={{ color: "#64748B" }}>
                <li>• Videoyu seçmek için üzerine tıklayın</li>
                <li>• Herhangi bir videonun üzerine gelerek önizleme yapabilirsiniz</li>
                <li>• Yayınlama sonrası reklam platformlarına yönlendirileceksiniz</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
