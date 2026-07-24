---
kind: external_dependency
name: Qiniu Cloud Object Storage (SDK present)
slug: qiniu-cloud
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

### Identity

### Role in this repo
The Qiniu SDK is present in the dependency tree but no source file currently imports it; it may be used by build scripts or local tooling rather than at runtime. The production upload path goes through Supabase's S3-compatible pre-signed URL function instead.

No active runtime integration observed in source code.