import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getVideoJob,
  selectGeneratedVideo,
  getCreativeProject,
} from "@/shared/api/kastonomApi";
import { resolveAssetPreviewUrl } from "@/shared/lib/assetPreview";
import type { GeneratedVideo, CreativeSubject, VideoJob } from "@/shared/types/api";

export function PreviewPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [videoJob, setVideoJob] = useState<VideoJob | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [subject, setSubject] = useState<CreativeSubject | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // Load video job data on mount
  useEffect(() => {
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    async function loadVideoData(showLoading = true) {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      // Get stored IDs
      const storedJobId = sessionStorage.getItem("lastVideoJobId");
      const storedProjectId = sessionStorage.getItem("lastProjectId");

      if (!storedJobId || !storedProjectId) {
        setError("Video job bilgisi bulunamadı. Lütfen önce bir reklam projesi oluşturun.");
        setIsLoading(false);
        return;
      }

      setJobId(storedJobId);
      setProjectId(storedProjectId);

      try {
        // Load video job data
        const jobResult = await getVideoJob(storedJobId);
        if (cancelled) return;

        setVideoJob(jobResult.video_job);
        setVideos(jobResult.generated_videos);
        setFallbackReason(jobResult.fallback_reason);

        const isActiveJob = ["queued", "submitted", "processing"].includes(jobResult.video_job.status);
        if (isActiveJob) {
          pollTimeout = setTimeout(() => {
            void loadVideoData(false);
          }, 3000);
        }

        // Load project details for display
        const projectResult = await getCreativeProject(storedProjectId);
        if (cancelled) return;

        setProjectName(projectResult.creative_project.name);
        setSubject(projectResult.creative_subject);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load video data:", err);
          setError("Video verileri yüklenemedi: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
        }
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    }

    void loadVideoData();

    return () => {
      cancelled = true;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, []);

  const handlePublish = async () => {
    if (!selectedVideo || !projectId) return;
    setIsPublishing(true);

    try {
      await selectGeneratedVideo(selectedVideo, projectId);
      alert("Video başarıyla seçildi!");
      navigate("/");
    } catch (err) {
      alert("Video seçilemedi: " + (err instanceof Error ? err.message : "Bilinmeyen hata"));
    } finally {
      setIsPublishing(false);
    }
  };

  const jobStatusLabel = videoJob?.status ?? "unknown";
  const jobProviderLabel = videoJob?.provider ?? "unknown";
  const activeJob = videoJob && ["queued", "submitted", "processing"].includes(videoJob.status);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: "#1B365D" }} />
          <p className="text-sm" style={{ color: "#64748B" }}>Video verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="text-center p-8 rounded-2xl" style={{ background: "#fff", border: "1px solid #FEE2E2" }}>
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/products")}
            className="px-4 py-2 rounded-xl font-bold text-sm text-white"
            style={{ background: "#1B365D" }}
          >
            Projelere Git
          </button>
        </div>
      </div>
    );
  }

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
              {subject?.subject_type === "product" ? "📦" : "📁"}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "#1B365D" }}>
                {projectName || subject?.name || "Proje"}
              </div>
              <div className="text-xs" style={{ color: "#94A3B8" }}>
                {subject?.name ? `${subject.name} · ` : ""}{jobProviderLabel} · {jobStatusLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#F0FDE8", color: "#4D7C0F" }}>
              {activeJob ? "İşleniyor" : `${videos.length} varyant oluşturuldu`}
            </span>
            {fallbackReason && (
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#FEF3C7", color: "#92400E" }}>
                {fallbackReason}
              </span>
            )}
            {videoJob?.is_mock && (
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#EFF3FA", color: "#1B365D" }}>
                mock
              </span>
            )}
          </div>
        </div>

        {/* Empty state */}
        {videos.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "#fff", border: "1px dashed #E2E8F0" }}>
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#1B365D" }}>
              {activeJob ? "Video oluşturuluyor" : "Henüz video yok"}
            </h2>
            <p className="text-sm mb-6" style={{ color: "#64748B" }}>
              {activeJob
                ? `Job ${jobId} için provider durumu düzenli kontrol ediliyor.`
                : "Video üretimi için önce bir proje oluşturun"}
            </p>
            <button
              onClick={() => navigate("/create")}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all"
              style={{ background: "linear-gradient(135deg, #1B365D, #2D4A7A)" }}
            >
              Reklam Oluştur
            </button>
          </div>
        ) : (
          /* Video Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {videos.map((video, index) => (
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
                  <video
                    src={resolveAssetPreviewUrl(video.url) ?? video.url}
                    className="w-full aspect-[9/16] rounded-t-2xl object-cover"
                    style={{ background: "linear-gradient(135deg,#1B365D,#2D4A7A)" }}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                  />
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
                      {video.aspect_ratio} · {video.duration_seconds}s
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "#94A3B8" }}>
                    TikTok, Instagram Reels için optimize edildi
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
