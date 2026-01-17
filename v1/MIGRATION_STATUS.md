# Migration Status & Updates

**Last Updated:** January 2026  
**Database:** `vewydmhupcmmyotipwop.supabase.co`

## Current Database State

### Applied Migrations
- ✅ `000_create_enums.sql` - Enum types created
- ✅ `001_create_core_tables.sql` - Core tables created
- ✅ `002_fix_table_references.sql` - Table references fixed
- ✅ `004_create_initial_departments.sql` - Initial departments created
- ✅ `005_fix_rls_recursion.sql` - RLS recursion fixed
- ✅ `006_fix_departments_rls_policies.sql` - Departments RLS policies fixed
- ✅ `010_test_migration.sql` - Test migration applied

### Current Policies (donum_accounts)
- `users_read_own_account` - Uses `((auth.uid() IS NOT NULL) AND (id = auth.uid()))`
- `users_insert_own_account` - Uses `((auth.uid() IS NOT NULL) AND (id = auth.uid()))`
- `users_update_own_account` - Uses `((auth.uid() IS NOT NULL) AND (id = auth.uid()))`
- `super_admin_full_access` - Uses `is_super_admin((SELECT auth.uid()))` ✅ Created manually

### Current Schema (departments table)
- `lead_assignment_enabled` - EXISTS (needs rename to `prospect_assignment_enabled`)
- `member_assignment_enabled` - DOES NOT EXIST (needs to be added)

### Helper Functions
- ✅ `is_super_admin(user_id UUID)` - EXISTS
- ✅ `is_staff(user_id UUID)` - EXISTS
- ✅ `get_user_departments(user_id UUID)` - EXISTS

---

## Updated Migrations (Idempotent & Safe)

### Migration 007: `fix_users_read_own_account_policy.sql`
**Status:** ✅ Updated to be idempotent

**Changes:**
- Now checks current policy state before updating
- Only updates if policy doesn't match expected format
- Uses `(SELECT auth.uid())` with NULL guard (current best practice)
- Safe to run multiple times

**What it does:**
- Verifies/updates `users_read_own_account` policy to use `(SELECT auth.uid())` with NULL guard

---

### Migration 008: `fix_rls_policies_2026_best_practices.sql`
**Status:** ✅ Updated to be idempotent

**Changes:**
- All steps now check current state before making changes
- Only creates/updates policies if they don't exist or don't match expected format
- Safe to run multiple times

**What it does:**
1. **Step 1:** Verifies/updates `users_read_own_account` policy
2. **Step 2:** Creates `super_admin_full_access` policy if it doesn't exist
3. **Step 3:** Creates `department_staff_members` policy if it doesn't exist

**Note:** `super_admin_full_access` already exists (created manually), so Step 2 will skip.

---

### Migration 011: `add_member_assignment_enabled.sql`
**Status:** ✅ Already safe (has checks), improved comment handling

**Changes:**
- Added column existence checks before adding comments
- Already had proper idempotent checks

**What it does:**
1. Adds `member_assignment_enabled` column if it doesn't exist
2. Renames `lead_assignment_enabled` to `prospect_assignment_enabled` if needed
3. Sets default values for existing rows
4. Adds column comments (only if columns exist)

---

## Safe to Apply

All three migrations (007, 008, 011) are now **idempotent** and **safe to run**:
- ✅ They check current state before making changes
- ✅ They won't break existing functionality
- ✅ They can be run multiple times safely
- ✅ They match the current database state

---

## Recommended Application Order

1. **Migration 011** - Add `member_assignment_enabled` column (safest, just adds column)
2. **Migration 007** - Verify/update `users_read_own_account` policy
3. **Migration 008** - Verify/update all RLS policies and create `department_staff_members` policy

---

## Notes

- The `super_admin_full_access` policy was created manually during development, so migration 008 will detect it exists and skip creating it again.
- The `department_staff_members` policy doesn't exist yet, so migration 008 will create it.
- All migrations now follow 2026 Supabase best practices with proper NULL guards and `(SELECT auth.uid())` usage.
