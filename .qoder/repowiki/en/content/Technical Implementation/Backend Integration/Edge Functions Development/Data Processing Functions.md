# Data Processing Functions

<cite>
**Referenced Files in This Document**
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)
- [importService.ts](file://src/services/importService.ts)
- [CsvImportFlow.tsx](file://src/components/desktop/import/CsvImportFlow.tsx)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [DemoLoader.tsx](file://src/components/desktop/import/DemoLoader.tsx)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains the data processing edge functions in FinSight with a focus on:
- CSV parsing for financial assets, including format validation, field mapping, and error handling
- OCR processing for financial documents, image recognition workflows, and extraction patterns
- Demo portfolio seeding functionality and test data generation
- Practical examples of file upload handling, batch processing, and transformation pipelines
- Performance optimization for large datasets, memory management, and timeout handling
- Troubleshooting guides for common parsing errors and OCR failures

The goal is to provide both high-level architecture understanding and code-level details for developers integrating or extending these capabilities.

## Project Structure
FinSight implements data processing via Supabase Edge Functions and client-side flows:
- Edge Functions:
  - parse-asset-csv: Parses uploaded CSV files into normalized asset records
  - recognize-holdings-ocr: Accepts images, runs OCR, and returns structured holdings
  - seed-demo-portfolio: Seeds demo portfolios for quick onboarding
  - Shared utilities: asset normalization and currency helpers
- Client-Side Flows:
  - Import services orchestrate uploads and call edge functions
  - UI flows guide users through CSV import, OCR import, review, and demo seeding

```mermaid
graph TB
subgraph "Client"
A["CsvImportFlow.tsx"]
B["OcrImportFlow.tsx"]
C["DemoLoader.tsx"]
D["ParsedAssetsReview.tsx"]
E["importService.ts"]
end
subgraph "Supabase Edge Functions"
F["parse-asset-csv/index.ts"]
G["recognize-holdings-ocr/index.ts"]
H["seed-demo-portfolio/index.ts"]
I["_shared/asset-normalize.ts"]
J["_shared/currency.ts"]
end
A --> E
B --> E
C --> E
E --> F
E --> G
E --> H
F --> I
F --> J
G --> I
G --> J
H --> I
H --> J
```

**Diagram sources**
- [CsvImportFlow.tsx](file://src/components/desktop/import/CsvImportFlow.tsx)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [DemoLoader.tsx](file://src/components/desktop/import/DemoLoader.tsx)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
- [importService.ts](file://src/services/importService.ts)
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)

**Section sources**
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)
- [importService.ts](file://src/services/importService.ts)
- [CsvImportFlow.tsx](file://src/components/desktop/import/CsvImportFlow.tsx)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [DemoLoader.tsx](file://src/components/desktop/import/DemoLoader.tsx)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)

## Core Components
- CSV Parsing Edge Function:
  - Validates CSV headers and rows
  - Maps fields to canonical asset schema
  - Normalizes values (currency, amounts, dates)
  - Returns structured results with row-level diagnostics
- OCR Edge Function:
  - Accepts image payloads
  - Performs OCR and extracts holdings tables
  - Applies normalization and validation
  - Returns parsed items with confidence and error hints
- Demo Portfolio Seeder:
  - Generates synthetic but realistic portfolio data
  - Uses shared normalization and currency utilities
  - Provides deterministic seeds for testing and demos
- Shared Utilities:
  - Asset normalization: standardizes types, units, and identifiers
  - Currency helpers: validates codes, formats amounts, and handles conversions where applicable

**Section sources**
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)

## Architecture Overview
The data processing pipeline integrates client flows with serverless edge functions:
- Client initiates import via UI flows
- Service layer prepares payloads and calls appropriate edge function
- Edge functions validate, transform, and normalize data using shared modules
- Results are returned to the client for review and persistence

```mermaid
sequenceDiagram
participant UI as "UI Flow"
participant Svc as "importService.ts"
participant CSV as "parse-asset-csv/index.ts"
participant OCR as "recognize-holdings-ocr/index.ts"
participant Seed as "seed-demo-portfolio/index.ts"
participant Norm as "_shared/asset-normalize.ts"
participant Cur as "_shared/currency.ts"
UI->>Svc : "Upload CSV/Image or request demo seed"
alt CSV Import
Svc->>CSV : "POST csv payload"
CSV->>Norm : "Normalize fields"
CSV->>Cur : "Validate/format currency"
CSV-->>Svc : "Parsed assets + diagnostics"
else OCR Import
Svc->>OCR : "POST image payload"
OCR->>Norm : "Normalize extracted fields"
OCR->>Cur : "Validate/format currency"
OCR-->>Svc : "Extracted holdings + confidence"
else Demo Seed
Svc->>Seed : "Request demo dataset"
Seed->>Norm : "Generate normalized assets"
Seed->>Cur : "Apply currency formatting"
Seed-->>Svc : "Demo assets"
end
Svc-->>UI : "Results for review/persistence"
```

**Diagram sources**
- [importService.ts](file://src/services/importService.ts)
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)

## Detailed Component Analysis

### CSV Parsing Implementation
Responsibilities:
- Format validation: header checks, delimiter detection, row length consistency
- Field mapping: map source columns to canonical asset fields
- Error handling: per-row diagnostics, aggregate summary, partial success semantics
- Normalization: currency codes, numeric parsing, date parsing, type coercion

Processing logic overview:
```mermaid
flowchart TD
Start(["Function Entry"]) --> ReadInput["Read CSV Input"]
ReadInput --> ValidateHeaders["Validate Headers"]
ValidateHeaders --> HeaderOk{"Headers Valid?"}
HeaderOk --> |No| ReturnHeaderError["Return Header Errors"]
HeaderOk --> |Yes| IterateRows["Iterate Rows"]
IterateRows --> MapFields["Map Fields to Schema"]
MapFields --> Normalize["Normalize Values<br/>Currency, Amounts, Dates"]
Normalize --> ValidateRow["Validate Row Constraints"]
ValidateRow --> RowOk{"Row Valid?"}
RowOk --> |No| RecordDiagnostics["Record Diagnostics"]
RowOk --> |Yes| CollectAsset["Collect Parsed Asset"]
CollectAsset --> NextRow{"More Rows?"}
RecordDiagnostics --> NextRow
NextRow --> |Yes| IterateRows
NextRow --> |No| Aggregate["Aggregate Summary"]
Aggregate --> ReturnResult["Return Assets + Diagnostics"]
ReturnHeaderError --> End(["Function Exit"])
ReturnResult --> End
```

Key implementation references:
- CSV parsing entry point and flow control
- Shared normalization and currency utilities used during mapping and validation

**Diagram sources**
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)

**Section sources**
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)

### OCR Processing for Financial Documents
Responsibilities:
- Image ingestion and preprocessing
- OCR execution and text extraction
- Table/field recognition for holdings
- Post-processing: normalization, validation, confidence scoring
- Error reporting with actionable hints

Workflow overview:
```mermaid
sequenceDiagram
participant UI as "OcrImportFlow.tsx"
participant Svc as "importService.ts"
participant OCR as "recognize-holdings-ocr/index.ts"
participant Norm as "_shared/asset-normalize.ts"
participant Cur as "_shared/currency.ts"
UI->>Svc : "Select image(s)"
Svc->>OCR : "POST image(s)"
OCR->>OCR : "Preprocess image(s)"
OCR->>OCR : "Run OCR and extract text"
OCR->>OCR : "Recognize holdings tables"
OCR->>Norm : "Normalize extracted fields"
OCR->>Cur : "Validate/format currency"
OCR-->>Svc : "Holdings + confidence + hints"
Svc-->>UI : "Results for review"
```

Practical notes:
- Batch multiple images when supported by the service layer
- Surface confidence scores and hints to guide user corrections
- Use shared normalization to ensure consistent output across sources

**Diagram sources**
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [importService.ts](file://src/services/importService.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)

**Section sources**
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [importService.ts](file://src/services/importService.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)

### Demo Portfolio Seeding and Test Data Generation
Responsibilities:
- Generate realistic synthetic holdings and account metadata
- Apply normalization and currency formatting consistently
- Provide deterministic seeds for reproducible tests and demos

Typical usage:
- Trigger from UI to populate sample data quickly
- Use in automated tests to validate dashboards and reports

```mermaid
sequenceDiagram
participant UI as "DemoLoader.tsx"
participant Svc as "importService.ts"
participant Seed as "seed-demo-portfolio/index.ts"
participant Norm as "_shared/asset-normalize.ts"
participant Cur as "_shared/currency.ts"
UI->>Svc : "Request demo portfolio"
Svc->>Seed : "Call seed endpoint"
Seed->>Norm : "Generate normalized assets"
Seed->>Cur : "Format currencies"
Seed-->>Svc : "Demo dataset"
Svc-->>UI : "Seeded data ready"
```

**Diagram sources**
- [DemoLoader.tsx](file://src/components/desktop/import/DemoLoader.tsx)
- [importService.ts](file://src/services/importService.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)

**Section sources**
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [DemoLoader.tsx](file://src/components/desktop/import/DemoLoader.tsx)
- [importService.ts](file://src/services/importService.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)

### File Upload Handling and Review
Client responsibilities:
- Capture files from user input
- Prepare multipart/form-data or JSON payloads
- Call appropriate edge function via service layer
- Present results for review and correction

Review workflow:
```mermaid
sequenceDiagram
participant UI as "CsvImportFlow.tsx / OcrImportFlow.tsx"
participant Review as "ParsedAssetsReview.tsx"
participant Svc as "importService.ts"
participant Edge as "Edge Function"
UI->>Svc : "Submit file(s)"
Svc->>Edge : "Invoke parse/ocr/seed"
Edge-->>Svc : "Structured results"
Svc-->>UI : "Results"
UI->>Review : "Render review table"
Review->>UI : "User edits and confirm"
UI->>Svc : "Persist confirmed assets"
```

**Diagram sources**
- [CsvImportFlow.tsx](file://src/components/desktop/import/CsvImportFlow.tsx)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
- [importService.ts](file://src/services/importService.ts)

**Section sources**
- [CsvImportFlow.tsx](file://src/components/desktop/import/CsvImportFlow.tsx)
- [OcrImportFlow.tsx](file://src/components/desktop/import/OcrImportFlow.tsx)
- [ParsedAssetsReview.tsx](file://src/components/desktop/import/ParsedAssetsReview.tsx)
- [importService.ts](file://src/services/importService.ts)

## Dependency Analysis
Shared dependencies:
- Asset normalization module used by all data processing functions
- Currency utilities for validation and formatting
- Client service layer orchestrating calls to edge functions

```mermaid
graph LR
CSV["parse-asset-csv/index.ts"] --> Norm["_shared/asset-normalize.ts"]
OCR["recognize-holdings-ocr/index.ts"] --> Norm
Seed["seed-demo-portfolio/index.ts"] --> Norm
CSV --> Cur["_shared/currency.ts"]
OCR --> Cur
Seed --> Cur
Client["importService.ts"] --> CSV
Client --> OCR
Client --> Seed
```

**Diagram sources**
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)
- [importService.ts](file://src/services/importService.ts)

**Section sources**
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)
- [seed-demo-portfolio/index.ts](file://supabase/functions/seed-demo-portfolio/index.ts)
- [_shared/asset-normalize.ts](file://supabase/functions/_shared/asset-normalize.ts)
- [_shared/currency.ts](file://supabase/functions/_shared/currency.ts)
- [importService.ts](file://src/services/importService.ts)

## Performance Considerations
- Streaming and chunking:
  - For large CSVs, process rows incrementally to avoid loading entire files into memory
  - For OCR, consider resizing/compressing images before upload
- Batch processing:
  - Group small batches to reduce overhead while keeping payloads manageable
- Timeouts:
  - Set reasonable timeouts for long-running operations; return partial results with diagnostics when possible
- Memory management:
  - Avoid retaining large intermediate structures; release references after normalization
- Concurrency:
  - Limit concurrent requests to prevent resource exhaustion at the edge
- Caching:
  - Cache FX rates and lookup tables if used within processing functions

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common CSV parsing issues:
- Invalid or missing headers: check header names and expected order
- Malformed rows: verify delimiters, quoting, and column counts
- Numeric parsing errors: inspect amount formats, separators, and negative signs
- Date parsing errors: ensure consistent date formats and timezones
- Currency mismatches: validate ISO codes and localized symbols

Common OCR issues:
- Poor image quality: recommend higher resolution, better lighting, and straightened scans
- Unrecognized tables: suggest reformatting or providing clearer tabular layouts
- Low confidence outputs: prompt users to review and correct fields
- Language/script support: ensure OCR model supports document language

Operational tips:
- Inspect diagnostics returned by parsing functions to pinpoint problematic rows
- Use demo seeding to validate end-to-end flows without real data
- Log and surface actionable hints to users for faster remediation

**Section sources**
- [parse-asset-csv/index.ts](file://supabase/functions/parse-asset-csv/index.ts)
- [recognize-holdings-ocr/index.ts](file://supabase/functions/recognize-holdings-ocr/index.ts)

## Conclusion
FinSight’s data processing functions provide robust, reusable pipelines for CSV parsing, OCR-based holdings extraction, and demo portfolio seeding. By leveraging shared normalization and currency utilities, the system ensures consistent data shapes and reliable transformations. The client flows integrate seamlessly with edge functions to deliver an intuitive import experience, while performance and troubleshooting strategies help maintain reliability at scale.