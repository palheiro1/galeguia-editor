# Security Fixes Applied

## Overview
Fixed critical security warnings identified by Supabase database linter.

## Issues Fixed

### 1. RLS Disabled on Pages Table (ERROR)
**Issue**: Row Level Security was not enabled on the `public.pages` table.

**Fix Applied**:
- Enabled RLS on the `pages` table
- Created appropriate RLS policies:
  - Users can view all pages (authenticated access)
  - Course creators can manage their own pages (via lesson -> module -> course relationship)
  - Admins can manage all pages

**Migration**: `enable_rls_on_pages`

### 2. Function Search Path Mutable (WARNING)
**Issue**: Multiple functions had mutable search_path which poses security risks.

**Functions Fixed**:
- `update_grains_updated_at`
- `validate_grain_content`
- `handle_new_user`
- `is_admin`
- `update_courses_updated_at`
- `update_lessons_updated_at`
- `update_modules_updated_at`

**Fix Applied**:
- Added `SET search_path = public` to all functions
- Set functions as `SECURITY DEFINER` where appropriate
- Removed duplicate function definitions

**Migration**: `fix_function_search_paths`

### 3. ModDateTime Extension
**Issue**: Custom `moddatetime` function had search path issues.

**Fix Applied**:
- Removed custom function
- Installed proper `moddatetime` extension
- Extension has proper security settings

**Migration**: `fix_moddatetime_function`

## Remaining Warnings (Auth Configuration)

The following warnings require configuration changes in Supabase Dashboard, not database migrations:

### Auth OTP Long Expiry (WARNING)
- **Issue**: OTP expiry is set to more than 1 hour
- **Action Required**: Go to Supabase Dashboard > Authentication > Settings > Email OTP expiry
- **Recommendation**: Set to less than 1 hour (e.g., 30 minutes)

### Leaked Password Protection Disabled (WARNING)
- **Issue**: HaveIBeenPwned password protection is disabled
- **Action Required**: Go to Supabase Dashboard > Authentication > Settings > Password Protection
- **Recommendation**: Enable "Check against HaveIBeenPwned.org"

## Security Status
✅ **Database RLS**: All tables now have RLS enabled with appropriate policies
✅ **Function Security**: All functions have fixed search paths
✅ **Extension Security**: ModDateTime extension properly installed

⚠️ **Auth Configuration**: Manual dashboard configuration required for OTP expiry and password protection

## Verification
All database security issues have been resolved. The application should now pass Supabase's security linter for database-related checks.
