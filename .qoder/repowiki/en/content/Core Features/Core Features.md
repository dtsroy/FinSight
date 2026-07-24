# Core Features

<cite>
**Referenced Files in This Document**
- [App.tsx](file://src/App.tsx)
- [main.tsx](file://src/main.tsx)
- [AppLayout.tsx](file://src/layouts/desktop/AppLayout.tsx)
- [DashboardPage.tsx](file://src/pages/desktop/DashboardPage.tsx)
- [AssetsPage.tsx](file://src/pages/desktop/AssetsPage.tsx)
- [ImportPage.tsx](file://src/pages/desktop/ImportPage.tsx)
- [ChatPage.tsx](file://src/pages/desktop/ChatPage.tsx)
- [StressTestPage.tsx](file://src/pages/desktop/StressTestPage.tsx)
- [XRayPage.tsx](file://src/pages/desktop/XRayPage.tsx)
- [SharedReportPage.tsx](file://src/pages/desktop/SharedReportPage.tsx)
- [CsvImportFlow.tsx](file://src/components/desktop/import/CsvImportFlow.tsx)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [ManualAssetForm.tsx](file://src/components/desktop/import/ManualAssetForm.tsx)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
- [useImportFlow.ts](file://src/hooks/useImportFlow.ts)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)
- [useRealtimeAssets.ts](file://src/hooks/useRealtimeAssets.ts)
- [useFxRates.ts](file://src/hooks/useFxRates.ts)
- [useChat.ts](file://src/hooks/useChat.ts)
- [useStress.ts](file://src/hooks/useStress.ts)
- [useXray.ts](file://src/hooks/useXray.ts)
- [assetService.ts](file://src/services/assetService.ts)
- [importService.ts](file://src/services/importService.ts)
- [chatService.ts](file://src/services/chatService.ts)
- [stressService.ts](file://src/services/stressService.ts)
- [xrayService.ts](file://src/services/xrayService.ts)
- [fxService.ts](file://src/services/fxService.ts)
- [reportService.ts](file://src/services/reportService.ts)
- [authService.ts](file://src/services/authService.ts)
- [profileService.ts](file://src/services/profileService.ts)
- [client.ts](file://src/integrations/supabase/client.ts)
- [types.ts](file://src/integrations/supabase/types.ts)
- [ai-doctor-chat/index.ts](file://supabase/functions/ai-doctor-chat/index.ts)
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [run-stress-test/index.ts](file://supabase/functions/run-stress-test/index.ts)
- [compute-xray-report/index.ts](file://supabase/functions/compute-xray-report/index.ts)
- [create-shared-report/index.ts](file://supabase/functions/create-shared-report/index.ts)
- [read-shared-report/index.ts](file://supabase/functions/read-shared-report/index.ts)
- [get-fx-rates/index.ts](file://supabase/functions/get-fx-rates/index.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [s3-pre-sign-url/index.ts](file://supabase/functions/s3-pre-sign-url/index.ts)
- [asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [auth.ts](file://supabase/functions/_shared/auth.ts)
- [currency.ts](file://supabase/functions/_shared/currency.ts)
</cite>

## Table of Contents
1. Introduction
2. Project Structure
3. Core Components
4. Architecture Overview
5. Detailed Component Analysis
6. Dependency Analysis
7. Performance Considerations
8. Troubleshooting Guide
9. Conclusion

## Introduction
FinSight is a financial portfolio platform that helps users track, analyze, and collaborate on investment portfolios. The core feature modules include:
- Portfolio Management: Centralized view and editing of assets, accounts, and holdings with real-time updates and multi-currency support.
- Import System: Flexible ingestion from CSV files, OCR scans, and manual entry, with validation and review before committing to the ledger.
- Analytics Dashboard: High-level metrics, performance summaries, and visualizations for quick insights.
- AI Integration: Conversational assistant for portfolio guidance and explanations.
- Advanced Analysis: Stress testing and X-Ray deep-dive analytics for risk and composition analysis.
- Collaboration: Shared reports and secure read-only access for advisors or co-investors.

This document explains how these modules integrate end-to-end, provides user workflows, and highlights technical implementation details for developers.

## Project Structure
The application follows a layered architecture:
- UI layer (React pages and components)
- Hooks layer (stateful logic and data orchestration)
- Services layer (API calls and business operations)
- Supabase Functions (serverless endpoints for parsing, OCR, analytics, and collaboration)
- Database and storage via Supabase (migrations, S3 pre-signed URLs)

```mermaid
graph TB
subgraph "Frontend"
A["App.tsx"]
B["AppLayout.tsx"]
C["DashboardPage.tsx"]
D["AssetsPage.tsx"]
E["ImportPage.tsx"]
F["ChatPage.tsx"]
G["StressTestPage.tsx"]
H["XRayPage.tsx"]
I["SharedReportPage.tsx"]
end
subgraph "Hooks"
J["useAssetLedger.ts"]
K["useImportFlow.ts"]
L["useRealtimeAssets.ts"]
M["useFxRates.ts"]
N["useChat.ts"]
O["useStress.ts"]
P["useXray.ts"]
end
subgraph "Services"
Q["assetService.ts"]
R["importService.ts"]
S["chatService.ts"]
T["stressService.ts"]
U["xrayService.ts"]
V["fxService.ts"]
W["reportService.ts"]
X["authService.ts"]
Y["profileService.ts"]
end
subgraph "Supabase Functions"
Z1["ai-doctor-chat/index.ts"]
Z2["parse-asset-csv/index.ts"]
Z3["recognize-holdings-ocr/index.ts"]
Z4["run-stress-test/index.ts"]
Z5["compute-xray-report/index.ts"]
Z6["create-shared-report/index.ts"]
Z7["read-shared-report/index.ts"]
Z8["get-fx-rates/index.ts"]
Z9["seed-demo-portfolio/index.ts"]
Z10["s3-pre-sign-url/index.ts"]
end
A --> B
B --> C
B --> D
B --> E
B --> F
B --> G
B --> H
B --> I
C --> J
D --> J
D --> L
D --> M
E --> K
F --> N
G --> O
H --> P
J --> Q
K --> R
N --> S
O --> T
P --> U
M --> V
I --> W
Q --> Z1
R --> Z2
R --> Z3
R --> Z10
O --> Z4
P --> Z5
W --> Z6
W --> Z7
V --> Z8
X --> Z9
```

**Diagram sources**
- [App.tsx](file://src/App.tsx)
- [AppLayout.tsx](file://src/layouts/desktop/AppLayout.tsx)
- [DashboardPage.tsx](file://src/pages/desktop/DashboardPage.tsx)
- [AssetsPage.tsx](file://src/pages/desktop/AssetsPage.tsx)
- [ImportPage.tsx](file://src/pages/desktop/ImportPage.tsx)
- [ChatPage.tsx](file://src/pages/desktop/ChatPage.tsx)
- [StressTestPage.tsx](file://src/pages/desktop/StressTestPage.tsx)
- [XRayPage.tsx](file://src/pages/desktop/XRayPage.tsx)
- [SharedReportPage.tsx](file://src/pages/desktop/SharedReportPage.tsx)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)
- [useImportFlow.ts](file://src/hooks/useImportFlow.ts)
- [useRealtimeAssets.ts](file://src/hooks/useRealtimeAssets.ts)
- [useFxRates.ts](file://src/hooks/useFxRates.ts)
- [useChat.ts](file://src/hooks/useChat.ts)
- [useStress.ts](file://src/hooks/useStress.ts)
- [useXray.ts](file://src/hooks/useXray.ts)
- [assetService.ts](file://src/services/assetService.ts)
- [importService.ts](file://src/services/importService.ts)
- [chatService.ts](file://src/services/chatService.ts)
- [stressService.ts](file://src/services/stressService.ts)
- [xrayService.ts](file://src/services/xrayService.ts)
- [fxService.ts](file://src/services/fxService.ts)
- [reportService.ts](file://src/services/reportService.ts)
- [ai-doctor-chat/index.ts](file://supabase/functions/ai-doctor-chat/index.ts)
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [run-stress-test/index.ts](file://supabase/functions/run-stress-test/index.ts)
- [compute-xray-report/index.ts](file://supabase/functions/compute-xray-report/index.ts)
- [create-shared-report/index.ts](file://supabase/functions/create-shared-report/index.ts)
- [read-shared-report/index.ts](file://supabase/functions/read-shared-report/index.ts)
- [get-fx-rates/index.ts](file://supabase/functions/get-fx-rates/index.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [s3-pre-sign-url/index.ts](file://supabase/functions/s3-pre-sign-url/index.ts)

**Section sources**
- [App.tsx](file://src/App.tsx)
- [main.tsx](file://src/main.tsx)
- [AppLayout.tsx](file://src/layouts/desktop/AppLayout.tsx)

## Core Components
- Portfolio Management
  - Assets page displays holdings, balances, and metadata; supports filtering and batch edits.
  - Real-time asset updates and FX normalization ensure consistent reporting across currencies.
  - Ledger hook centralizes state for assets and related operations.
- Import System
  - Multi-modal import flows: CSV upload, OCR scan, and manual entry.
  - Review step validates parsed assets before committing to the ledger.
  - Services coordinate with serverless functions for parsing and OCR.
- Analytics Dashboard
  - Aggregates key metrics and presents summary views for portfolio health.
- AI Integration
  - Chat interface powered by an AI doctor chat function for conversational insights.
- Advanced Analysis
  - Stress testing simulates scenarios against current holdings.
  - X-Ray computes deep-dive analytics and risk breakdowns.
- Collaboration
  - Create and read shared reports for secure sharing with stakeholders.

**Section sources**
- [AssetsPage.tsx](file://src/pages/desktop/AssetsPage.tsx)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)
- [useRealtimeAssets.ts](file://src/hooks/useRealtimeAssets.ts)
- [useFxRates.ts](file://src/hooks/useFxRates.ts)
- [ImportPage.tsx](file://src/pages/desktop/ImportPage.tsx)
- [CsvImportFlow.tsx](file://src/components/desktop/import/CsvImportFlow.tsx)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [ManualAssetForm.tsx](file://src/components/desktop/import/ManualAssetForm.tsx)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
- [useImportFlow.ts](file://src/hooks/useImportFlow.ts)
- [DashboardPage.tsx](file://src/pages/desktop/DashboardPage.tsx)
- [ChatPage.tsx](file://src/pages/desktop/ChatPage.tsx)
- [useChat.ts](file://src/hooks/useChat.ts)
- [StressTestPage.tsx](file://src/pages/desktop/StressTestPage.tsx)
- [useStress.ts](file://src/hooks/useStress.ts)
- [XRayPage.tsx](file://src/pages/desktop/XRayPage.tsx)
- [useXray.ts](file://src/hooks/useXray.ts)
- [SharedReportPage.tsx](file://src/pages/desktop/SharedReportPage.tsx)
- [reportService.ts](file://src/services/reportService.ts)

## Architecture Overview
FinSight integrates React UI with Supabase Functions for heavy processing and persistence. The flow typically goes:
- UI triggers a service call
- Service invokes a Supabase Function
- Function performs parsing, OCR, analytics, or report generation
- Results are returned to the UI and persisted as needed

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "ImportPage.tsx"
participant Hook as "useImportFlow.ts"
participant Svc as "importService.ts"
participant Fn as "parse-asset-csv/index.ts"
participant Review as "ParsedAssetsReview.tsx"
participant Ledger as "useAssetLedger.ts"
User->>UI : Upload CSV / Choose Import
UI->>Hook : Start import flow
Hook->>Svc : Request parse
Svc->>Fn : Call serverless parser
Fn-->>Svc : Parsed assets payload
Svc-->>Hook : Return normalized assets
Hook-->>UI : Show review screen
UI->>Review : Validate and confirm
Review->>Ledger : Commit assets to ledger
Ledger-->>UI : Update portfolio state
```

**Diagram sources**
- [ImportPage.tsx](file://src/pages/desktop/ImportPage.tsx)
- [useImportFlow.ts](file://src/hooks/useImportFlow.ts)
- [importService.ts](file://src/services/importService.ts)
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)

## Detailed Component Analysis

### Portfolio Management
Portfolio management centers around the Assets page and the asset ledger hook. It provides:
- Asset listing and filtering
- Batch editing capabilities
- Real-time updates and currency normalization

```mermaid
classDiagram
class AssetsPage {
+render()
+handleFilterChange()
+handleBatchEdit()
}
class UseAssetLedger {
+assets
+addAssets()
+updateAssets()
+removeAssets()
}
class UseRealtimeAssets {
+subscribe()
+unsubscribe()
}
class UseFxRates {
+rates
+convert(amount, from, to)
}
AssetsPage --> UseAssetLedger : "reads/writes"
AssetsPage --> UseRealtimeAssets : "subscribes"
AssetsPage --> UseFxRates : "normalizes"
```

**Diagram sources**
- [AssetsPage.tsx](file://src/pages/desktop/AssetsPage.tsx)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)
- [useRealtimeAssets.ts](file://src/hooks/useRealtimeAssets.ts)
- [useFxRates.ts](file://src/hooks/useFxRates.ts)

**Section sources**
- [AssetsPage.tsx](file://src/pages/desktop/AssetsPage.tsx)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)
- [useRealtimeAssets.ts](file://src/hooks/useRealtimeAssets.ts)
- [useFxRates.ts](file://src/hooks/useFxRates.ts)
- [assetService.ts](file://src/services/assetService.ts)

### Import System
The import system supports three primary flows:
- CSV import: Upload and parse structured data
- OCR import: Extract holdings from images
- Manual entry: Add assets directly

```mermaid
flowchart TD
Start(["Start Import"]) --> Choice{"Select Import Type"}
Choice --> |CSV| Csv["CsvImportFlow.tsx"]
Choice --> |OCR| Ocr["OcrImportFlow.tsx"]
Choice --> |Manual| Manual["ManualAssetForm.tsx"]
Csv --> Parse["importService.ts -> parse-asset-csv/index.ts"]
Ocr --> Recognize["importService.ts -> recognize-holdings-ocr/index.ts"]
Manual --> Build["Build asset objects locally"]
Parse --> Review["ParsedAssetsReview.tsx"]
Recognize --> Review
Build --> Review
Review --> Confirm{"Confirm?"}
Confirm --> |Yes| Commit["useAssetLedger.ts commit"]
Confirm --> |No| Edit["Edit items"]
Edit --> Review
Commit --> End(["Import Complete"])
```

**Diagram sources**
- [ImportPage.tsx](file://src/pages/desktop/ImportPage.tsx)
- [CsvImportFlow.tsx](file://src/components/desktop/import/CsvImportFlow.tsx)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [ManualAssetForm.tsx](file://src/components/desktop/import/ManualAssetForm.tsx)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
- [useImportFlow.ts](file://src/hooks/useImportFlow.ts)
- [importService.ts](file://src/services/importService.ts)
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)

**Section sources**
- [ImportPage.tsx](file://src/pages/desktop/ImportPage.tsx)
- [CsvImportFlow.tsx](file://src/components/desktop/import/CsvImportFlow.tsx)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [ManualAssetForm.tsx](file://src/components/desktop/import/ManualAssetForm.tsx)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
- [useImportFlow.ts](file://src/hooks/useImportFlow.ts)
- [importService.ts](file://src/services/importService.ts)
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)

### Analytics Dashboard
The dashboard aggregates portfolio metrics and provides high-level insights. It consumes normalized asset data and FX rates to present consistent figures.

```mermaid
sequenceDiagram
participant User as "User"
participant Dash as "DashboardPage.tsx"
participant Ledger as "useAssetLedger.ts"
participant FX as "useFxRates.ts"
User->>Dash : Open Dashboard
Dash->>Ledger : Fetch aggregated assets
Dash->>FX : Load latest rates
FX-->>Dash : Rates map
Dash-->>User : Render metrics and charts
```

**Diagram sources**
- [DashboardPage.tsx](file://src/pages/desktop/DashboardPage.tsx)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)
- [useFxRates.ts](file://src/hooks/useFxRates.ts)

**Section sources**
- [DashboardPage.tsx](file://src/pages/desktop/DashboardPage.tsx)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)
- [useFxRates.ts](file://src/hooks/useFxRates.ts)

### AI Integration
The AI chat feature allows users to ask questions about their portfolio and receive contextual answers.

```mermaid
sequenceDiagram
participant User as "User"
participant ChatUI as "ChatPage.tsx"
participant Hook as "useChat.ts"
participant Svc as "chatService.ts"
participant Fn as "ai-doctor-chat/index.ts"
User->>ChatUI : Send message
ChatUI->>Hook : Append message and request response
Hook->>Svc : Call AI chat endpoint
Svc->>Fn : Invoke AI doctor chat
Fn-->>Svc : AI response
Svc-->>Hook : Streamed or final answer
Hook-->>ChatUI : Update chat history
ChatUI-->>User : Display response
```

**Diagram sources**
- [ChatPage.tsx](file://src/pages/desktop/ChatPage.tsx)
- [useChat.ts](file://src/hooks/useChat.ts)
- [chatService.ts](file://src/services/chatService.ts)
- [ai-doctor-chat/index.ts](file://supabase/functions/ai-doctor-chat/index.ts)

**Section sources**
- [ChatPage.tsx](file://src/pages/desktop/ChatPage.tsx)
- [useChat.ts](file://src/hooks/useChat.ts)
- [chatService.ts](file://src/services/chatService.ts)
- [ai-doctor-chat/index.ts](file://supabase/functions/ai-doctor-chat/index.ts)

### Advanced Analysis
Two advanced features provide deeper insights:
- Stress Testing: Simulate market shocks and evaluate portfolio impact.
- X-Ray: Compute detailed analytics and risk breakdowns.

```mermaid
sequenceDiagram
participant User as "User"
participant StressUI as "StressTestPage.tsx"
participant StressHook as "useStress.ts"
participant StressSvc as "stressService.ts"
participant StressFn as "run-stress-test/index.ts"
User->>StressUI : Configure scenario
StressUI->>StressHook : Trigger stress test
StressHook->>StressSvc : Run stress test
StressSvc->>StressFn : Execute serverless stress test
StressFn-->>StressSvc : Scenario results
StressSvc-->>StressHook : Results payload
StressHook-->>StressUI : Render outcomes
participant XRayUI as "XRayPage.tsx"
participant XRayHook as "useXray.ts"
participant XRaySvc as "xrayService.ts"
participant XRayFn as "compute-xray-report/index.ts"
User->>XRayUI : Open X-Ray
XRayUI->>XRayHook : Compute report
XRayHook->>XRaySvc : Generate X-Ray
XRaySvc->>XRayFn : Compute analytics
XRayFn-->>XRaySvc : Report data
XRaySvc-->>XRayHook : Report payload
XRayHook-->>XRayUI : Render analytics
```

**Diagram sources**
- [StressTestPage.tsx](file://src/pages/desktop/StressTestPage.tsx)
- [useStress.ts](file://src/hooks/useStress.ts)
- [stressService.ts](file://src/services/stressService.ts)
- [run-stress-test/index.ts](file://supabase/functions/run-stress-test/index.ts)
- [XRayPage.tsx](file://src/pages/desktop/XRayPage.tsx)
- [useXray.ts](file://src/hooks/useXray.ts)
- [xrayService.ts](file://src/services/xrayService.ts)
- [compute-xray-report/index.ts](file://supabase/functions/compute-xray-report/index.ts)

**Section sources**
- [StressTestPage.tsx](file://src/pages/desktop/StressTestPage.tsx)
- [useStress.ts](file://src/hooks/useStress.ts)
- [stressService.ts](file://src/services/stressService.ts)
- [run-stress-test/index.ts](file://supabase/functions/run-stress-test/index.ts)
- [XRayPage.tsx](file://src/pages/desktop/XRayPage.tsx)
- [useXray.ts](file://src/hooks/useXray.ts)
- [xrayService.ts](file://src/services/xrayService.ts)
- [compute-xray-report/index.ts](file://supabase/functions/compute-xray-report/index.ts)

### Collaboration
Collaboration enables creating and reading shared reports for secure distribution.

```mermaid
sequenceDiagram
participant User as "User"
participant ShareUI as "SharedReportPage.tsx"
participant ReportSvc as "reportService.ts"
participant CreateFn as "create-shared-report/index.ts"
participant ReadFn as "read-shared-report/index.ts"
User->>ShareUI : Create share link
ShareUI->>ReportSvc : Create shared report
ReportSvc->>CreateFn : Persist report metadata
CreateFn-->>ReportSvc : Report ID
ReportSvc-->>ShareUI : Share URL
User->>ShareUI : Open shared report
ShareUI->>ReportSvc : Read shared report
ReportSvc->>ReadFn : Retrieve report data
ReadFn-->>ReportSvc : Report content
ReportSvc-->>ShareUI : Render report
```

**Diagram sources**
- [SharedReportPage.tsx](file://src/pages/desktop/SharedReportPage.tsx)
- [reportService.ts](file://src/services/reportService.ts)
- [create-shared-report/index.ts](file://supabase/functions/create-shared-report/index.ts)
- [read-shared-report/index.ts](file://supabase/functions/read-shared-report/index.ts)

**Section sources**
- [SharedReportPage.tsx](file://src/pages/desktop/SharedReportPage.tsx)
- [reportService.ts](file://src/services/reportService.ts)
- [create-shared-report/index.ts](file://supabase/functions/create-shared-report/index.ts)
- [read-shared-report/index.ts](file://supabase/functions/read-shared-report/index.ts)

## Dependency Analysis
Key integration points:
- UI hooks depend on services for API calls
- Services invoke Supabase Functions for parsing, OCR, analytics, and collaboration
- FX rates and asset normalization utilities ensure consistency across modules

```mermaid
graph LR
UI["Pages & Components"] --> Hooks["Hooks Layer"]
Hooks --> Services["Services Layer"]
Services --> Functions["Supabase Functions"]
Functions --> Shared["_shared utilities"]
Services --> Client["Supabase client.ts"]
```

**Diagram sources**
- [AppLayout.tsx](file://src/layouts/desktop/AppLayout.tsx)
- [useAssetLedger.ts](file://src/hooks/useAssetLedger.ts)
- [useImportFlow.ts](file://src/hooks/useImportFlow.ts)
- [assetService.ts](file://src/services/assetService.ts)
- [importService.ts](file://src/services/importService.ts)
- [client.ts](file://src/integrations/supabase/client.ts)
- [asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [currency.ts](file://supabase/functions/_shared/currency.ts)

**Section sources**
- [client.ts](file://src/integrations/supabase/client.ts)
- [types.ts](file://src/integrations/supabase/types.ts)
- [asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [currency.ts](file://supabase/functions/_shared/currency.ts)

## Performance Considerations
- Prefer server-side parsing and OCR to reduce client load and improve accuracy.
- Cache FX rates where appropriate to minimize repeated network calls.
- Use real-time subscriptions judiciously to avoid excessive re-renders.
- Defer heavy computations (stress tests, X-Ray) to serverless functions and stream results when possible.
- Implement pagination and virtualization for large asset lists.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and strategies:
- Import failures: Validate CSV structure and handle malformed rows; use the review step to correct entries before committing.
- OCR misreads: Re-scan with clearer images; verify extracted fields in the review step.
- FX discrepancies: Ensure latest rates are fetched and normalize amounts consistently.
- AI chat errors: Check function availability and input context; retry with simplified prompts.
- Stress test timeouts: Reduce scenario complexity or increase timeout thresholds on the serverless function.
- Shared report access: Verify permissions and report IDs; ensure the read function is reachable.

**Section sources**
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
- [useImportFlow.ts](file://src/hooks/useImportFlow.ts)
- [useFxRates.ts](file://src/hooks/useFxRates.ts)
- [useChat.ts](file://src/hooks/useChat.ts)
- [useStress.ts](file://src/hooks/useStress.ts)
- [useXray.ts](file://src/hooks/useXray.ts)
- [reportService.ts](file://src/services/reportService.ts)

## Conclusion
FinSight’s modular design cleanly separates UI, state orchestration, and serverless processing. Users can quickly set up portfolios through flexible imports, gain insights via the dashboard and AI chat, and perform deep analyses with stress testing and X-Ray. Collaboration features enable secure sharing of reports. For developers, the clear separation between hooks, services, and Supabase Functions simplifies maintenance and scaling while providing robust integration points for future enhancements.

[No sources needed since this section summarizes without analyzing specific files]