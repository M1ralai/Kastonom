# Kastonom System Flow Diagram

> **Not:** Bu diagram Mermaid formatında yazılmıştır. GitHub, VS Code (Mermaid extension), Miro, Excalidraw veya mermaid.live adresinde görselleştirilebilir.

---

## 1. Üç Katmanlı Mimari

```mermaid
flowchart TB
    subgraph Frontend["🖥️ FRONTEND LAYER"]
        FE_Dashboard[Dashboard<br/>Ürün Listesi]
        FE_Insight["Ürün Detayı<br/>Hype Score, Trend"]
        FE_Brief["Creative Brief<br/>Önizleme"]
        FE_Job["Video Job<br/>Durumu"]
        FE_Preview["Final Ad<br/>Önizleme"]
    end

    subgraph Backend["⚙️ BACKEND LAYER"]
        BE_API["API Gateway<br/>/products, /campaigns, /video-jobs"]
        BE_Tenant["Tenant Guard<br/>Auth & Scope"]
        BE_Orchestrator["Campaign<br/>Orchestrator"]
        BE_Job["Video Job<br/>Service"]
        BE_Adapter["Provider<br/>Adapter"]
        BE_Store[("Data Store<br/>Memory/JSON")]
    end

    subgraph MCP["🧠 MCP / AI LAYER"]
        MCP_Score["Scoring Engine<br/>Rule-based"]
        MCP_Rec["Recommendation<br/>Engine"]
        MCP_Audience["Audience<br/>Summary"]
        MCP_Brief["Creative Brief<br/>Generator"]
        MCP_Compile["Prompt<br/>Compiler"]
        MCP_Exec["Network<br/>Execution"]
        
        subgraph LLM["🤖 LLM Clients"]
            LLM_Trend["Trend Analysis"]
            LLM_Reason["Recommendation Reason"]
            LLM_Brief["Brief Content"]
            LLM_Prompt["Prompt Optimization"]
        end
    end

    subgraph External["🌐 EXTERNAL SERVICES"]
        EXT_LLM["Codex/OpenAI<br/>LLM Provider"]
        EXT_ERP["Mock ERP<br/>Product Data"]
        EXT_Video["Video Providers<br/>Pollo/Kling/Runway/Mock"]
    end

    Frontend -->|"API Calls"| Backend
    Backend -->|"Scoring/Decisions"| MCP
    Backend -->|"Prompt Compilation"| MCP
    MCP -->|"LLM Calls"| EXT_LLM
    MCP -->|"Video Job Submit"| EXT_Video
    Backend -->|"Read/Write"| BE_Store
    EXT_ERP -->|"Product Data"| Backend
```

---

## 2. Ana Veri Akışı

```mermaid
sequenceDiagram
    participant User as "👤 User"
    participant FE as "🖥️ Frontend"
    participant BE as "⚙️ Backend"
    participant MCP as "🧠 MCP Layer"
    participant LLM as "🤖 LLM"
    participant Provider as "🎬 Video Provider"

    User->>FE: Ürün seç / Campaign başlat
    FE->>BE: POST /campaigns/generate
    
    BE->>MCP: Ürün + Metrik verileri
    MCP->>MCP: Rule-based scoring<br/>(sales_velocity, stock_movement)
    MCP->>LLM: Trend analizi isteği
    LLM-->>MCP: Trend potential + Reason
    
    MCP->>LLM: Creative brief oluştur
    LLM-->>MCP: Brief (angle, hook, CTA)
    
    MCP->>MCP: Prompt compile<br/>(provider-specific)
    MCP->>Provider: Video prompt gönder
    
    alt Live Provider
        Provider-->>MCP: Video job ID
    else Mock Provider
        Provider-->>MCP: Mock result
    end
    
    MCP-->>BE: Provider result / Job ID
    BE-->>FE: Campaign + Job ID
    FE->>BE: GET /video-jobs/{id}
    BE-->>FE: Job status (polling)
    FE-->>User: Final ad preview
```

---

## 3. MVP Demo Akışı (3 dakika)

```mermaid
flowchart LR
    subgraph Step1["0:00-0:30"]
        A1["Kastonom Nedir?"]
        A2["Üç katman göster"]
    end

    subgraph Step2["0:30-1:10"]
        B1["Dashboard aç"]
        B2["Ürün listesi göster"]
        B3["Hype score göster"]
        B4["Önerilen ürünü vurgula"]
    end

    subgraph Step3["1:10-1:50"]
        C1["Ürün detayına git"]
        C2["Audience summary göster"]
        C3["Creative angle göster"]
        C4["Brief önizlemesi"]
    end

    subgraph Step4["1:50-2:30"]
        D1["Campaign başlat"]
        D2["Video job durumu göster"]
        D3["Fallback açıkla (opsiyonel)"]
    end

    subgraph Step5["2:30-3:00"]
        E1["Final ad göster"]
        E2["Değer özeti"]
    end

    Step1 --> Step2 --> Step3 --> Step4 --> Step5
```

---

## 4. Ürün Skorlama Akışı

```mermaid
flowchart TD
    Start["📦 Ürün Verileri"] --> Rules["📊 Rule-Based Scoring"]
    
    Rules --> SalesVel["Satış Hızı<br/>sales_velocity"]
    Rules --> StockMov["Stok Hareketi<br/>stock_movement"]
    Rules --> NewBoost["Yeni Ürün<br/>new_product_boost"]
    
    SalesVel --> Weight["Ağırlıklandır<br/>weights"]
    StockMov --> Weight
    NewBoost --> Weight
    
    Weight --> Hype["🔥 Hype Score<br/>(deterministic)"]
    
    Hype --> LLM_Enhance["🤖 LLM Enhancement"]
    
    LLM_Enhance --> Trend["📈 Trend Potential"]
    LLM_Enhance --> Reason["💡 Recommendation Reason"]
    
    Trend --> Rec["✅ Ürün Önerisi"]
    Reason --> Rec
    Reason --> Audience["👥 Audience Summary"]
    
    Rec --> Brief["📝 Creative Brief"]
    Audience --> Brief
    
    Brief --> Output["📤 Structured Output"]
    
    subgraph Fallback["🔄 Fallback Durumları"]
        F1["LLM yoksa → Rule-based"]
        F2["Provider yoksa → Mock"]
        F3["Veri eksik → explicit null"]
    end
    
    LLM_Enhance -.-> Fallback
```

---

## 5. Prompt Derleme Akışı

```mermaid
flowchart LR
    Input["📋 Creative Brief"] --> Compile["🔧 Prompt Compiler"]
    
    subgraph Adapters["📡 Provider Adapters"]
        P1["Pollo Adapter"]
        P2["Kling Adapter"]
        P3["Runway Adapter"]
        P4["Mock Adapter"]
    end
    
    Compile --> P1
    Compile --> P2
    Compile --> P3
    Compile --> P4
    
    P1 --> Out1["Pollo-specific prompt"]
    P2 --> Out2["Kling-specific prompt"]
    P3 --> Out3["Runway-specific prompt"]
    P4 --> Out4["Mock prompt payload"]
    
    Out1 --> Provider["🎬 Provider API"]
    Out2 --> Provider
    Out3 --> Provider
    Out4 --> Provider
```

---

## 6. Klasör Yapısı Akışı

```mermaid
graph TD
    root["📁 Kastonom Root"]
    
    root --> docs["📄 docs/"]
    docs --> proj["project-brief.md"]
    docs --> arch["architecture.md"]
    docs --> codex["codex-task-queue.md"]
    docs --> demo["demo-script.md"]
    
    docs --> contracts["📋 contracts/"]
    contracts --> api["api.contract.yaml"]
    contracts --> data["data-model.contract.yaml"]
    contracts --> ai["ai-behavior.contract.yaml"]
    contracts --> mvp["mvp.contract.yaml"]
    
    docs --> layers["📐 layers/"]
    layers --> fe["frontend.contract.md"]
    layers --> be["backend.contract.md"]
    layers --> mcpL["mcp-layer.contract.md"]
    
    docs --> prompts["📝 prompts/"]
    prompts --> compiler["prompt-compiler.contract.md"]
    prompts --> brief["creative-brief.template.yaml"]
    
    docs --> tasks["📋 tasks/"]
    tasks --> be_tasks["backend/"]
    tasks --> mcp_tasks["mcp/"]
    
    root --> AGENTS["AGENTS.md"]
    root --> backend["⚙️ backend/"]
```

---

## 7. LLM Kullanım Matrisi

```mermaid
flowchart LR
    subgraph Operations["Operasyonlar"]
        O1["Satış Hızı Hesapla"]
        O2["Stok Hareketi Hesapla"]
        O3["Yeni Ürün Boost"]
        O4["Trend Analizi"]
        O5["Öneri Gerekçesi"]
        O6["Audience Fit"]
        O7["Creative Hook/CTA"]
        O8["Prompt Optimizasyonu"]
    end

    subgraph Methods["Yöntem"]
        M1["📐 Rule-based<br/>(Deterministic)"]
        M2["🤖 LLM-enhanced<br/>(Creative)"]
    end

    O1 -->|"Threshold-based"| M1
    O2 -->|"Heuristic"| M1
    O3 -->|"Conditional Logic"| M1
    O4 -->|"Contextual"| M2
    O5 -->|"NLG"| M2
    O6 -->|"Segment matching"| M2
    O7 -->|"Creative Gen"| M2
    O8 -->|"Platform nuances"| M2
```

---

## 8. Güvenlik Sınırları

```mermaid
flowchart TB
    subgraph Frontend["🛡️ Frontend Kuralları"]
        FE1["❌ Prompt üretmez"]
        FE2["❌ AI video API çağırmaz"]
        FE3["❌ Öneri mantığı karar vermez"]
    end

    subgraph Backend["🛡️ Backend Kuralları"]
        BE1["✅ Tenant boundary kontrol eder"]
        BE2["✅ Eksik config → fail closed"]
        BE3["❌ Tenant scope atlamaz"]
        BE4["❌ Gerçek provider'a configsiz çağrı yapmaz"]
    end

    subgraph MCP["🛡️ MCP Layer Kuralları"]
        MCP1["❌ Eksik veri icat etmez"]
        MCP2["❌ Fiyat/indirim/garanti uydurmaz"]
        MCP3["✅ missing → unknown/null"]
        MCP4["✅ llm_used flag zorunlu"]
    end

    subgraph Safety["🔒 Güvenlik"]
        S1["Secrets → Environment vars"]
        S2["Logs → redacted"]
        S3["Fallback → mock data labeled"]
    end
```

---

## Görselleştirme Araçları

### GitHub / GitLab
Dosyayı raw olarak görüntüleyin - Mermaid otomatik render eder.

### VS Code
[Mermaid extension](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) yükleyin.

### Online
[mermaid.live](https://mermaid.live) → Paste this file content

### Whiteboard
[Miro](https://miro.com), [Excalidraw](https://excalidraw.com) → Import/Export ile Mermaid kullanın.