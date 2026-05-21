import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KpiCard } from "@/widgets/KpiCard";
import { listCreativeProjects, createCreativeProject, uploadSourceAsset } from "@/shared/api/kastonomApi";
import { getImageAssetPreviewUrl } from "@/shared/lib/assetPreview";
import type { CreativeProject, CreativeSubject, SourceAsset } from "@/shared/types/api";

interface ProjectBundle {
  creative_project: CreativeProject;
  creative_subject: CreativeSubject | null;
  source_assets: SourceAsset[];
}

const SUBJECT_TYPE_LABELS: Record<string, string> = {
  product: "Ürün",
  service: "Hizmet",
  brand: "Marka",
  offer: "Teklif",
  event: "Etkinlik",
  place: "Mekan",
  other: "Diğer",
  unknown: "Bilinmeyen",
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Taslak", color: "#64748B", bg: "#F1F5F9" },
  generating: { label: "Oluşturuluyor", color: "#D97706", bg: "#FEF3C7" },
  ready: { label: "Hazır", color: "#059669", bg: "#ECFDF5" },
  published: { label: "Yayınlandı", color: "#7C3AED", bg: "#EDE9FE" },
  archived: { label: "Arşivlendi", color: "#94A3B8", bg: "#F8FAFC" },
  failed: { label: "Başarısız", color: "#DC2626", bg: "#FEE2E2" },
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatPrice(price?: number, currency?: string): string {
  if (!price) return "-";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency || "TRY",
    minimumFractionDigits: 0,
  }).format(price);
}

function ProjectThumbnail({
  assets,
  alt,
  size,
}: {
  assets: SourceAsset[];
  alt: string;
  size: "grid" | "list";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const previewUrl = getImageAssetPreviewUrl(assets);
  const className = size === "grid" ? "w-14 h-14" : "w-12 h-12";

  useEffect(() => {
    setImageFailed(false);
  }, [previewUrl]);

  return (
    <div
      className={`${className} rounded-xl flex items-center justify-center overflow-hidden text-center`}
      style={{ background: "#F1F5F9" }}
    >
      {previewUrl && !imageFailed ? (
        <img
          src={previewUrl}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="text-[10px] font-semibold leading-tight px-1" style={{ color: "#94A3B8" }}>
          Görsel yok
        </span>
      )}
    </div>
  );
}

export function ProductsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState<string>("product");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Reset form
  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormCategory("product");
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsDragging(false);
    setIsUploading(false);
    setCreateError(null);
  }

  // Handle file drop
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  function handleFileSelect(file: File) {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setCreateError("Sadece JPG, PNG, WEBP veya GIF dosyaları kabul edilir.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setCreateError("Dosya boyutu 5MB'ı geçemez.");
      return;
    }

    setSelectedFile(file);
    setCreateError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function uploadFile() {
    if (!selectedFile) {
      setCreateError("Lütfen bir görsel seçin.");
      return null;
    }

    setIsUploading(true);
    setCreateError(null);

    try {
      const result = await uploadSourceAsset(selectedFile);
      return result;
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Görsel yüklenemedi.");
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  // Open modal
  function handleOpenModal() {
    resetForm();
    setShowAddModal(true);
  }

  // Create project
  async function handleCreateProject() {
    if (!formName.trim()) {
      setCreateError("Ürün adı gereklidir.");
      return;
    }

    if (!selectedFile) {
      setCreateError("Lütfen bir görsel seçin.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      // First upload the file
      const uploadResult = await uploadFile();
      if (!uploadResult) {
        setIsCreating(false);
        return;
      }

      const result = await createCreativeProject({
        name: formName,
        creative_subject: {
          subject_type: formCategory as "product" | "service" | "brand" | "offer" | "event" | "place" | "other" | "unknown",
          name: formName,
          description: formDescription || undefined,
          price: formPrice ? parseFloat(formPrice) : undefined,
          currency: formPrice ? "TRY" : undefined,
          allowed_claims: [],
          forbidden_claims: ["discount", "free shipping", "limited stock"],
          unknown_fields: formPrice ? [] : ["price"],
          source: "user_input"
        },
        source_assets: [{
          asset_type: "image",
          source: "upload",
          url: uploadResult.upload_url,
          metadata: { asset_id: uploadResult.source_asset.id }
        }]
      });

      // Close modal and refresh
      setShowAddModal(false);
      await loadProjects();

      // Navigate to create page with new project
      navigate(`/create?project=${result.creative_project.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Proje oluşturulamadı.");
      console.error("Failed to create project:", err);
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listCreativeProjects();
      setProjects(data);
      setIsDemoMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Projeler yüklenemedi. Lütfen backend'in çalıştığından emin olun.");
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleProjectClick(projectId: string) {
    setSelectedProject(projectId === selectedProject ? null : projectId);
    navigate(`/create?project=${projectId}`);
  }

  function getStatusStyle(status: string) {
    return STATUS_LABELS[status] || STATUS_LABELS.draft;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: "#1B365D" }} />
          <p className="text-sm" style={{ color: "#64748B" }}>Projeler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <div className="text-center p-8 rounded-2xl" style={{ background: "#fff", border: "1px solid #FEE2E2" }}>
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadProjects}
            className="px-4 py-2 rounded-xl font-bold text-sm text-white"
            style={{ background: "#1B365D" }}
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black" style={{ color: "#1B365D", letterSpacing: "-0.03em" }}>
                  Reklam Projelerim
                </h1>
                {isDemoMode && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#FEF3C7", color: "#D97706" }}>
                    Demo
                  </span>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: "#64748B" }}>
                Reklam oluşturmak için bir proje seçin veya yeni proje başlatın
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode("grid")}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: viewMode === "grid" ? "#EFF3FA" : "transparent",
                  color: viewMode === "grid" ? "#1B365D" : "#94A3B8"
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: viewMode === "list" ? "#EFF3FA" : "transparent",
                  color: viewMode === "list" ? "#1B365D" : "#94A3B8"
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="4" width="18" height="4" rx="1" />
                  <rect x="3" y="10" width="18" height="4" rx="1" />
                  <rect x="3" y="16" width="18" height="4" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Toplam Proje"
              value={projects.length.toString()}
              icon="📁"
            />
            <KpiCard
              label="Hazır"
              value={projects.filter(p => p.creative_project.status === "ready").length.toString()}
              icon="✅"
              color="green"
            />
            <KpiCard
              label="Oluşturuluyor"
              value={projects.filter(p => p.creative_project.status === "generating").length.toString()}
              icon="⏳"
              color="navy"
            />
            <KpiCard
              label="Yayınlandı"
              value={projects.filter(p => p.creative_project.status === "published").length.toString()}
              icon="🚀"
              color="blue"
            />
          </div>

          {/* Create New Button */}
          <button
            onClick={handleOpenModal}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #8CC63F, #6BAA2F)",
            }}
          >
            + Yeni Proje Oluştur
          </button>
        </div>

        {/* Empty State */}
        {projects.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "#fff", border: "1px dashed #E2E8F0" }}>
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#1B365D" }}>
              Henüz proje yok
            </h2>
            <p className="text-sm mb-6" style={{ color: "#64748B" }}>
              Reklam oluşturmaya başlamak için yeni bir proje başlatın
            </p>
            <button
              onClick={() => navigate("/create")}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #1B365D, #2D4A7A)",
              }}
            >
              İlk Projemi Oluştur
            </button>
          </div>
        ) : (
          /* Projects Grid/List */
          <div className={viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
          }>
            {projects.map((bundle, index) => {
              const { creative_project: project, creative_subject: subject, source_assets: assets } = bundle;
              const statusStyle = getStatusStyle(project.status);
              const isSelected = selectedProject === project.id;

              return (
                <div
                  key={project.id}
                  className="rounded-2xl border p-5 transition-all hover:shadow-lg cursor-pointer fade-in"
                  style={{
                    background: "#fff",
                    borderColor: isSelected ? "#8CC63F" : "#E2E8F0",
                    boxShadow: "0 2px 16px rgba(27,54,93,.06)",
                    animationDelay: `${index * 100}ms`
                  }}
                  onClick={() => handleProjectClick(project.id)}
                >
                  {viewMode === "grid" ? (
                    <>
                      {/* Grid View */}
                      <div className="flex items-start justify-between mb-4">
                        <ProjectThumbnail assets={assets} alt={`${subject?.name || project.name} görseli`} size="grid" />
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: statusStyle.bg, color: statusStyle.color }}
                        >
                          {statusStyle.label}
                        </span>
                      </div>

                      <div className="font-black text-base mb-1" style={{ color: "#1B365D" }}>
                        {project.name}
                      </div>

                      {subject && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F1F5F9", color: "#64748B" }}>
                            {SUBJECT_TYPE_LABELS[subject.subject_type] || subject.subject_type}
                          </span>
                          <span className="text-xs" style={{ color: "#94A3B8" }}>
                            {subject.name}
                          </span>
                        </div>
                      )}

                      <div className="space-y-2 mb-4">
                        {subject?.price && (
                          <div className="flex justify-between text-xs">
                            <span style={{ color: "#64748B" }}>Fiyat</span>
                            <span className="font-bold" style={{ color: "#1B365D" }}>
                              {formatPrice(subject.price, subject.currency)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span style={{ color: "#64748B" }}>Kaynak Görsel</span>
                          <span className="font-bold" style={{ color: "#1B365D" }}>
                            {assets.length} adet
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: "#64748B" }}>Oluşturulma</span>
                          <span className="font-bold" style={{ color: "#1B365D" }}>
                            {formatDate(project.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Status-based action */}
                      {project.status === "ready" ? (
                        <button
                          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
                          style={{
                            background: "linear-gradient(135deg, #8CC63F, #6BAA2F)",
                          }}
                        >
                          Görseli Seç ve Yayınla
                        </button>
                      ) : project.status === "draft" ? (
                        <button
                          className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                          style={{
                            background: "linear-gradient(135deg, #1B365D, #2D4A7A)",
                            color: "#fff",
                          }}
                        >
                          Reklam Oluştur
                        </button>
                      ) : project.status === "generating" ? (
                        <div className="w-full py-3 rounded-xl text-sm text-center" style={{ background: "#FEF3C7", color: "#D97706" }}>
                          ⏳ Video oluşturuluyor...
                        </div>
                      ) : project.status === "published" ? (
                        <div className="w-full py-3 rounded-xl text-sm text-center" style={{ background: "#ECFDF5", color: "#059669" }}>
                          ✅ Yayınlandı
                        </div>
                      ) : (
                        <button
                          className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                          style={{
                            background: "linear-gradient(135deg, #1B365D, #2D4A7A)",
                            color: "#fff",
                          }}
                        >
                          Detayları Gör
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* List View */}
                      <div className="flex items-center gap-4">
                        <ProjectThumbnail assets={assets} alt={`${subject?.name || project.name} görseli`} size="list" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-sm" style={{ color: "#1B365D" }}>
                              {project.name}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: statusStyle.bg, color: statusStyle.color }}
                            >
                              {statusStyle.label}
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: "#94A3B8" }}>
                            {subject?.name || "Konu belirtilmedi"} · {formatDate(project.created_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-lg font-black mb-1"
                            style={{ color: "#1B365D" }}
                          >
                            {assets.length}
                          </div>
                          <div className="text-xs" style={{ color: "#94A3B8" }}>Görsel</div>
                        </div>
                        <button
                          className="px-4 py-2 rounded-xl font-bold text-sm text-white transition-all"
                          style={{
                            background: project.status === "ready"
                              ? "linear-gradient(135deg,#8CC63F,#6BAA2F)"
                              : "linear-gradient(135deg,#1B365D,#2D4A7A)",
                          }}
                        >
                          {project.status === "ready" ? "Yayınla" : "Devam Et"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Demo Mode Notice */}
        {isDemoMode && projects.length > 0 && (
          <div className="mt-8 p-4 rounded-xl flex items-center gap-3" style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
            <span className="text-2xl">📌</span>
            <div>
              <div className="font-bold text-sm" style={{ color: "#92400E" }}>
                Demo modu aktif
              </div>
              <div className="text-xs" style={{ color: "#B45309" }}>
                Bu veriler backend bağlantısı olmadan gösteriliyor. Gerçek veriler için backend'i başlatın.
              </div>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowAddModal(false)}
            />

            {/* Modal Content */}
            <div
              className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
              style={{ background: "#fff" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black" style={{ color: "#1B365D" }}>
                  Yeni Ürün Ekle
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: "#94A3B8" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Error */}
              {createError && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                  {createError}
                </div>
              )}

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1B365D" }}>
                    Ürün Adı *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Örn: Bluetooth Kulaklık Wave 200"
                    className="w-full px-4 py-3 rounded-xl border text-sm"
                    style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1B365D" }}>
                    Açıklama
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ürün hakkında kısa bir açıklama..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border text-sm resize-none"
                    style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1B365D" }}>
                      Fiyat (TL)
                    </label>
                    <input
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="899"
                      className="w-full px-4 py-3 rounded-xl border text-sm"
                      style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1B365D" }}>
                      Kategori
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-sm"
                      style={{ background: "#fff", borderColor: "#E2E8F0", color: "#1B365D" }}
                    >
                      <option value="product">Ürün</option>
                      <option value="service">Hizmet</option>
                      <option value="brand">Marka</option>
                      <option value="offer">Teklif</option>
                      <option value="event">Etkinlik</option>
                      <option value="place">Mekan</option>
                      <option value="other">Diğer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1B365D" }}>
                    Görsel *
                  </label>
                  <div
                    className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                    style={{
                      borderColor: isDragging ? "#8CC63F" : selectedFile ? "#8CC63F" : "#E2E8F0",
                      background: isDragging ? "#F0FDE8" : "#F8FAFC"
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-input")?.click()}
                  >
                    {previewUrl ? (
                      <div className="relative">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-32 mx-auto rounded-lg"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                          className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                          style={{ transform: "translate(50%, -50%)" }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : isUploading ? (
                      <div>
                        <div className="animate-spin text-3xl mb-2">⟳</div>
                        <p className="text-sm" style={{ color: "#64748B" }}>Yükleniyor...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-2">📷</div>
                        <p className="text-sm font-semibold" style={{ color: "#1B365D" }}>
                          Görseli sürükle & bırak
                        </p>
                        <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                          veya dosya seç (JPG, PNG, WEBP, GIF - max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: "#F1F5F9", color: "#64748B" }}
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={isCreating}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
                  style={{
                    background: isCreating ? "#94A3B8" : "linear-gradient(135deg, #8CC63F, #6BAA2F)",
                    cursor: isCreating ? "not-allowed" : "pointer",
                  }}
                >
                  {isCreating ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Oluşturuluyor...
                    </>
                  ) : (
                    "Oluştur ve Reklam Yap"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
