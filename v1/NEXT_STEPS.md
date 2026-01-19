# NEXT STEPS - DONUM 2.1
## Immediate Action Items

**Last Updated:** January 18, 2026  
**Current Status:** Phase 2 - Admin System (90% Complete)

---

## ✅ COMPLETED FEATURES

- ✅ Database migrations (000-016 created, most applied)
- ✅ All admin pages created (9 pages total)
- ✅ Department Management (full CRUD + permissions + staff + member assignment)
- ✅ User Management System (full CRUD)
- ✅ Permission System Integration (PermissionGuard on all pages)
- ✅ Staff Assignment to Departments
- ✅ Member Assignment to Departments
- ✅ Prequalification Application System (Migration 017, API, Admin UI, Prospect Integration)

---

## 🎯 CURRENT PRIORITIES (What's Next)

### **1. Apply Migration 016** ✅ COMPLETE
**Status:** Migration 016 has been applied successfully.

### **2. Prequalification Application System** ✅ COMPLETE
**Priority:** HIGH - Core business workflow

- [x] Prequalification form creates application record
- [x] Application database schema (017_create_applications_table.sql)
- [x] Application API layer (lib/api/applications.ts)
- [x] Admin UI to view/manage applications (ApplicationList, ApplicationForm)
- [x] Prospect status page shows application progress
- [x] RLS policies for applicants and staff
- [x] **Final Application Form** (`/prospect/application`) - Created ✅ COMPLETE
  - [x] Personal information section ✅
  - [x] Financial information section ✅
  - [x] Investment profile section ✅
  - [x] Terms acceptance ✅
  - [x] "Last updated by admin" message display ✅
  - [x] Requested amount field ✅ COMPLETE
  - [x] Detailed loan purpose field ✅ COMPLETE
- [x] Document upload ✅ COMPLETE (Migration 022, API, UI components, Storage bucket)

### **3. Final Application Form** ⏱️ 3-5 days ✅ COMPLETE
**Priority:** HIGH - Core business workflow

**Status:** Form complete at `/prospect/application` with all required fields
- [x] Separate formal application form (after prequalification) ✅
- [x] Personal, financial, and investment information ✅
- [x] Terms acceptance ✅
- [x] Integration with existing applications table ✅
- [x] Requested amount field ✅ COMPLETE
- [x] Detailed loan purpose field ✅ COMPLETE

### **4. Loan Management** ⏱️ 1-2 weeks ✅ COMPLETE
**Priority:** HIGH - Core business workflow

- [x] Database migration (021_create_loans_system.sql) ✅
- [x] API layer (lib/api/loans.ts) ✅
- [x] Loan list page (/admin/loans) ✅
- [x] Loan detail page (/admin/loans/[id]) ✅
- [x] Payment recording UI ✅
- [x] Create loan from application ✅
- [x] Icon system standardization (Lucide React) ✅
- [x] Amortization schedule generation ✅ COMPLETE
- [x] Payment schedule generation ✅ COMPLETE (auto-generated when loan created)
- [ ] Financial calculations/interest accrual (future enhancement)

### **5. Prospect-Staff Assignment System** ⏱️ 3-5 days ✅ COMPLETE
**Priority:** HIGH - Required for admin/staff to edit prospect forms

**Requirements:**
- Create `prospect_staff_assignments` table with full audit trail (like `department_members`) ✅
- Fields: `prospect_id`, `staff_id`, `assigned_at`, `assigned_by`, `unassigned_at`, `unassigned_by`, `is_active`, `is_primary`, `assignment_notes` ✅
- Virtual cascade: Prospect assignments cascade to all applications (no data modification) ✅
- Access control: Staff can see application if prospect assigned to their department AND staff assigned to prospect, OR application directly assigned ✅

**Implementation:**
- Migration script: `018_create_prospect_staff_assignments.sql` ✅ APPLIED
- API layer: `lib/api/prospect-staff-assignments.ts` ✅ CREATED
- Admin UI: Component for assigning staff to prospects ✅ CREATED & INTEGRATED
- RLS policies: Enforce access control based on assignments ✅ APPLIED (Migration 019)

### **6. Admin/Staff Application Form Editing** ⏱️ 5-7 days ✅ COMPLETE
**Priority:** HIGH - Core workflow for helping prospects

**Requirements:**
- [x] Admin edit form at `/admin/applications/[id]/edit` (matches prospect form layout) ✅
- [x] Super admin: Can edit any application ✅
- [x] Department staff: Can edit if prospect assigned to their department AND staff assigned to prospect ✅
- [x] Signature/legal fields: Visible but disabled (prospect must check themselves) ✅
- [x] Save behavior: Save as draft, show "Last updated by admin on [date]" to prospect ✅
- [x] Prospect must submit themselves (for signatures/legal) ✅

**Implementation:**
- [x] Reuse prospect form components in admin context ✅
- [x] Add admin-specific features (save buttons, timestamps, internal notes) ✅
- [x] Access control checks based on prospect-staff assignments ✅
- [x] Display "Last updated by admin" message on prospect form ✅
- [x] Prospects page created with navigation to filtered applications ✅
- [x] Applications page shows latest per applicant with expand/collapse ✅

### **7. Donum Plans System** ⏱️ 3-5 days
**Priority:** HIGH - Core business logic for plan management

**Requirements:**
- Create `donum_plans` table (plan templates stored in database, not hardcoded)
  - Fields: code, name, description, requirements (min_income, min_assets, min_age, required_asset_types, requires_charitable_intent), benefits, tax_deduction_percent, calculator_config, is_active
  - Initial plans: Defund, Diversion, Divest
- Create `application_plans` junction table (prospect-specific plan assignments with customizations)
  - Fields: application_id, plan_code, assigned_by, assigned_at, custom_loan_amount, custom_max_amount, custom_terms (JSONB), calculator_results (JSONB), notes
  - Allows admins to assign plans to prospects and customize per prospect
- Move hardcoded plan logic from `qualification-logic.ts` to database
- Update qualification to fetch plans from database
- Admin UI to manage plans (create/edit plan templates)
- Admin UI to assign plans to prospects/applications
- Admin UI to edit plan customizations per prospect (loan amounts, terms, notes)

**Implementation:**
- Migration script: `020_create_donum_plans_system.sql` ✅ CREATED & APPLIED
- API layer: `lib/api/plans.ts` (CRUD for plan templates) ✅ CREATED
- API layer: `lib/api/application-plans.ts` (assign/edit plans per application) ✅ CREATED
- Admin UI: Plan management page ✅ CREATED
- Admin UI: Plan assignment component in application form ✅ CREATED
- Qualification logic: Fetch plans from database ✅ COMPLETE
- Prequalification: Show plans from database ✅ COMPLETE
- RLS policies: Plans viewable by all, editable by admins; Application plans scoped to assigned staff/admins ✅ DEFINED IN MIGRATION

**Key Features:**
- Plan templates never change (master copy)
- Each prospect gets their own customized copy
- Admins can edit loan amounts, terms, max limits per prospect
- Next prospect always starts with default template
- Loan amount calculation based on prospect's financial profile
- Max loan amount editable per prospect

### **8. Staff-Member Direct Relationships** ⏱️ 3-5 days
**Priority:** MEDIUM - Enhanced assignment tracking

- Direct staff-to-member assignment UI
- Assignment history tracking
- Capacity management

---

## IMMEDIATE PRIORITY (Do This First)

### **1. Complete Database Setup** ✅ COMPLETE

**Status:** Database is set up and migrations are ready. Migration 016 should be applied.

**Why:** Everything depends on the database being set up. Without it, you can't test any features.

**Steps:**
1. **Verify Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Check if project "Donum 2.1 Production" exists
   - If not, create a new project
   - Get API keys from Settings → API

2. **Run Database Migrations** (in Supabase SQL Editor) ✅ MOSTLY COMPLETE
   - Open SQL Editor in Supabase dashboard
   - Run migrations in this exact order:
     ```
     000_create_enums.sql      → Creates enum types ✅
     001_create_core_tables.sql → Creates core tables ✅
     002_fix_table_references.sql → Fixes references ✅
     004_create_initial_departments.sql → Department infrastructure ✅
     006_fix_departments_rls_policies.sql → Fix RLS policies ✅
     007_fix_users_read_own_account_policy.sql → Fix user policy ✅
     008_fix_rls_policies_2026_best_practices.sql → Update policies ✅
     010_test_migration.sql    → Validates everything ✅
     011_add_member_assignment_enabled.sql → Add member assignment field ✅
     016_add_super_admin_select.sql → Add super admin SELECT policy ✅ APPLIED
     ```
   - Each migration should show success messages

3. **Create Super Admin User**
   - Go to Authentication → Users → Add User
   - Create user with email: `admin@donum.com`
   - Set password (save it securely!)
   - Copy the user's UUID from the users table

4. **Link User to Database**
   - Run this SQL (replace `YOUR_USER_UUID` with actual UUID):
     ```sql
     INSERT INTO public.donum_accounts (id, email, role, departments, admin_level)
     VALUES (
       'YOUR_USER_UUID',
       'admin@donum.com',
       'donum_super_admin',
       ARRAY['Admin']::TEXT[],
       'super'
     );
     ```

5. **Create Initial Departments**
   - Run this SQL:
     ```sql
     INSERT INTO public.departments (name, description, color, icon)
     VALUES 
       ('Admin', 'Administrative department with full access', '#6366F1', 'shield'),
       ('Support', 'Customer support department', '#10B981', 'headphones'),
       ('Sales', 'Sales and business development', '#F59E0B', 'briefcase');
     ```

6. **Assign Permissions to Admin Department**
   - Run this SQL:
     ```sql
     INSERT INTO public.department_page_permissions (department_name, page_path, can_view, can_edit, can_delete)
     VALUES
       ('Admin', '/admin/dashboard', true, true, true),
       ('Admin', '/admin/members', true, true, true),
       ('Admin', '/admin/applications', true, true, true),
       ('Admin', '/admin/loans', true, true, true),
       ('Admin', '/admin/departments', true, true, true),
       ('Admin', '/admin/finance', true, true, true),
       ('Admin', '/admin/system', true, true, true),
       ('Admin', '/admin/users', true, true, true),
       ('Admin', '/admin/staff', true, true, true);
     ```

**Success Criteria:**
- All migrations run without errors
- Can query `donum_accounts` table and see your user
- Can query `departments` table and see Admin, Support, Sales
- Can log in with `admin@donum.com`

**Files Needed:**
- `v1/migrations/000_create_enums.sql`
- `v1/migrations/001_create_core_tables.sql`
- `v1/migrations/002_fix_table_references.sql`
- `v1/migrations/004_create_initial_departments.sql`
- `v1/migrations/010_test_migration.sql`

---

### **2. Create Missing Admin Pages** ✅ COMPLETE

**Status:** All admin pages have been created (some are placeholders ready for feature implementation).

**Why:** The sidebar links to these pages, but they don't exist yet. This causes 404 errors.

**Steps:**
Create these files with basic placeholder content:

1. **`web/app/admin/users/page.tsx`**
   ```tsx
   export default function UsersPage() {
     return (
       <main className="min-h-screen p-8">
         <h1 className="text-2xl font-bold">User Management</h1>
         <p className="mt-2 text-gray-600">Coming soon...</p>
       </main>
     );
   }
   ```

2. **`web/app/admin/staff/page.tsx`** (same pattern)
3. **`web/app/admin/members/page.tsx`** (same pattern)
4. **`web/app/admin/applications/page.tsx`** (same pattern)
5. **`web/app/admin/loans/page.tsx`** (same pattern)
6. **`web/app/admin/departments/page.tsx`** **Priority**
7. **`web/app/admin/finance/page.tsx`** (same pattern)
8. **`web/app/admin/system/page.tsx`** (same pattern)

**Success Criteria:**
- All sidebar links work (no 404 errors)
- Each page shows basic content
- Navigation works smoothly

---

### **3. Implement Department Management Page** ✅ COMPLETE

**Status:** Fully implemented with CRUD operations, permission assignment, staff assignment, and member assignment.

**Why:** This is the core feature of Donum 2.1. Start here after pages are created.

**Steps:**
1. **Create Department List Component**
   - Fetch departments from Supabase
   - Display in a table/list
   - Show department name, description, color, icon

2. **Create Department Form**
   - Form for creating new departments
   - Form for editing existing departments
   - Fields: name, description, color, icon

3. **Implement CRUD Operations**
   - Create department
   - Read/List departments
   - Update department
   - Delete department (soft delete)

4. **Add Permission Assignment**
   - UI to assign page permissions to departments
   - Checkboxes for can_view, can_edit, can_delete
   - Save to `department_page_permissions` table

**Success Criteria:**
- Can create a new department
- Can edit existing departments
- Can assign permissions to departments
- Changes persist in database
- Super admin can manage all departments

**📁 Files to Create:**
- `web/app/admin/departments/page.tsx`
- `web/components/admin/departments/DepartmentList.tsx`
- `web/components/admin/departments/DepartmentForm.tsx`
- `web/components/admin/departments/PermissionAssignment.tsx`
- `web/lib/api/departments.ts`

---

## THIS WEEK'S GOALS

### **Day 1: Apply Migration 016**
- [x] Apply migration 016 (super admin SELECT policy)
- [ ] Test super admin can read all users

### **Day 2-3: Application Processing - Planning** ✅ COMPLETE
- [x] Design application schema
- [x] Plan application workflow states
- [x] Design application form UI
- [x] Plan document upload integration

### **Day 4-5: Application Processing - Implementation** ✅ COMPLETE
- [x] Create application database tables/migrations (017)
- [x] Create application form component (ApplicationForm)
- [x] Implement application status tracking
- [x] Test application creation workflow (tested end-to-end)

---

## 🔍 VERIFICATION CHECKLIST

### **Phase 1 & 2 Completed ✅**
- [x] Can log in with super admin account
- [x] Admin dashboard loads without errors
- [x] All sidebar links work (no 404s)
- [x] Can see departments in database
- [x] Can create/edit/delete departments via UI
- [x] Can assign permissions to departments
- [x] Can assign staff to departments
- [x] Can assign members to departments
- [x] Theme toggle works (dark/light mode)
- [x] User Management fully functional

### **Next Phase Verification**
- [x] Migration 016 applied successfully ✅
- [x] Super admin can read all users ✅
- [x] Application form created and functional ✅
- [x] Application workflow implemented ✅
- [x] Migration 017 applied successfully ✅
- [x] Super admin can view all applications ✅
- [ ] Loan management system functional

---

## RESOURCES

- **Migration Guide:** `v1/MIGRATION_STEPS.md`
- **Project Status:** `v1/PROJECT_STATUS.md`
- **Technical Blueprint:** `v1/DONUM_2.1_TECHNICAL_BLUEPRINT.md`
- **Component Architecture:** `v1/COMPONENT_ARCHITECTURE.md`

---

## IF YOU GET STUCK

### **Database Migration Errors**
- Check that migration 000 ran first (creates enum types)
- Verify Supabase project is active
- Check SQL Editor for error messages
- Review `v1/MIGRATION_STEPS.md` troubleshooting section

### **Authentication Issues**
- Verify Supabase API keys in `.env.local`
- Check that user exists in `auth.users` table
- Verify user is linked in `donum_accounts` table
- Check browser console for errors

### **Page Not Found (404)**
- Verify file exists at correct path
- Check file exports default component
- Restart Next.js dev server
- Clear browser cache

---

## 🎯 SUCCESS = READY FOR PHASE 3

**Phase 2 Status:** ✅ MOSTLY COMPLETE (95%)

**What's Left:**
- ~~Apply migration 016~~ ✅ COMPLETE
- ~~Prequalification Application System~~ ✅ COMPLETE
- ~~Prospect-Staff Assignment System~~ ✅ COMPLETE
- ~~Admin/Staff Application Form Editing~~ ✅ COMPLETE
- ~~Prospects Page~~ ✅ COMPLETE
- ~~Applications Page (latest per applicant with expand/collapse)~~ ✅ COMPLETE
- ~~Final Application Form~~ ✅ COMPLETE
- ~~Donum Plans System~~ ✅ COMPLETE
- ~~Loan Management System~~ ✅ COMPLETE
- Staff-Member Direct Relationships (Enhancement)
- Prospect Dashboard with Steps Overview
- Document Upload System
- Financial Calculations/Amortization (Enhancement)

---

**Current Status:** Phase 2 is ~99% COMPLETE! 

**Recently Completed:**
- ✅ Loan Management System (complete)
- ✅ Document Upload System (complete - Migration 022, Storage bucket, API, UI)
- ✅ Auto-convert Prospects to Members (Migration 025 - trigger on funding)
- ✅ Members Page Filtering (fixed to show only members)
- ✅ RLS Fixes (basic functionality restored)

**Next Priorities:** 
1. Staff-Member Direct Relationships (enhancement)
2. Prospect Dashboard (UX enhancement)
3. Financial Calculations/Interest Accrual (enhancement)
4. Remaining Admin Pages (Staff, Finance, System)
