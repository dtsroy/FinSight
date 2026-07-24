---
kind: error_handling
name: Error Handling Strategy in Financial X-Ray Desktop App
category: error_handling
scope:
    - '**'
source_files:
    - src/services/authService.ts
    - src/services/chatService.ts
    - src/services/importService.ts
    - src/hooks/useAuthGuard.ts
    - src/components/ui/form.tsx
    - src/pages/NotFound.tsx
---

## Error Handling Approach

The Financial X-Ray Desktop App uses a **layered error handling strategy** combining native JavaScript errors, Supabase error propagation, and user-facing toast notifications via `sonner`.

### Core Patterns

**1. Service Layer - Native Errors with Descriptive Messages**
- Services throw `new Error("descriptive message")` for validation failures and unexpected states
- Supabase operations propagate their `.error` objects directly to callers
- Authentication-specific errors are handled through dedicated functions like `humanizeAuthError()`

**2. Component Layer - Try/Catch with Toast Notifications**
- UI components wrap async operations in try/catch blocks
- Errors are displayed using `toast.error()` from sonner library
- Success cases use `toast.success()` for positive feedback
- Form validation errors are shown inline using react-hook-form's built-in error handling

**3. Hook Layer - State-Based Error Management**
- Custom hooks like `useAuthGuard` maintain an `error` field in state
- Errors are caught during initialization and stored as string messages
- Components can render error states based on hook state

### Key Files and Conventions

**Service Layer (`src/services/`)**
- `authService.ts`: Contains `humanizeAuthError()` function that translates Supabase auth errors into Chinese user-friendly messages
- `chatService.ts`: Uses `mapErrorMessage()` for AI service error translation
- All services follow the pattern: `{ data, error } = await supabase...; if (error) throw error;`

**Component Layer (`src/components/desktop/`)**
- Consistent try/catch patterns with `toast.error(err instanceof Error ? err.message : "保存失败")`
- Form validation errors handled through react-hook-form's formState.errors
- Import flows show specific error messages for CSV parsing failures

**Hook Layer (`src/hooks/`)**
- `useAuthGuard.ts`: Centralized authentication error handling with state management
- Returns structured state objects with `ready`, `error`, and identity fields

### Error Types and Categories

1. **Network/Supabase Errors**: Directly propagated from Supabase client
2. **Authentication Errors**: Translated through `humanizeAuthError()` for user-friendly messages
3. **Validation Errors**: Handled by react-hook-form with inline field-level feedback
4. **Business Logic Errors**: Thrown as descriptive Error instances
5. **Stream Processing Errors**: Special handling for SSE connections in chat functionality

### Presentation Layer
- Uses `sonner` toast notifications for non-blocking user feedback
- Form errors display inline below input fields
- Global error states managed through React component state
- No centralized error boundary or global error handler found

### Conventions for Developers
- Always check Supabase operation results for `.error` before proceeding
- Use descriptive error messages in Chinese for end users
- Wrap async operations in try/catch at component boundaries
- Leverage existing error translation functions (`humanizeAuthError`, `mapErrorMessage`)
- Display user-facing errors via toast notifications rather than console logging