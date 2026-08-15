# Xcode Security Settings

Security build settings decisions for ChoreStar-iOS. Audited 2026-08-15
against Apple's `audit-xcode-security-settings` agent skill (exported from
Xcode 27). The codebase is pure Swift, so the C/ObjC compiler-warning and
static-analyzer settings in the skill's catalog do not apply.

## Enabled settings

Already active before the audit (no changes needed):

- `ENABLE_USER_SCRIPT_SANDBOXING = YES`
- `GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR`
- `GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE`
- `GCC_WARN_64_TO_32_BIT_CONVERSION = YES`
- Standard Clang warning suite (Xcode template defaults, all `YES`)

## Disabled settings

None found. No security-relevant setting is explicitly set to `NO` anywhere
in the project.

## Deferred

- `ENABLE_ENHANCED_SECURITY` (+ `com.apple.security.hardened-process`
  entitlements) on the ChoreStar app and ChoreStarWidgetsExtension targets.
  Xcode 26.6 supports the v1 form; the version-string `"2"` form needs the
  Xcode 27 SDK. Deferred because it changes runtime hardening behavior
  (hardened heap, platform restrictions, dyld protections) on a shipping
  App Store app mid-release — enable deliberately after a TestFlight cycle,
  ideally when the project moves to Xcode 27 so v2 can be adopted directly.
  Pointer authentication is safe to consider: the only binary dependency is
  the Supabase Swift SDK, which builds from source via SPM.
