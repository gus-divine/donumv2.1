# 🚀 STEP-BY-STEP MIGRATION GUIDE

## Prerequisites
✅ You've created Supabase project: **Donum 2.1 Production**  
✅ You have access to Supabase SQL Editor

---

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

---

## Step 2: Run Migration 000 - Create Enum Types (REQUIRED FIRST!)

**Copy and paste the entire contents of:** `migrations/000_create_enums.sql`

**What it does:**
- Creates `user_role` enum type (donum_prospect, donum_member, donum_staff, etc.)
- Creates `user_status` enum type (pending, active, inactive, etc.)
- Required before migration 001 can run

**Expected result:** ✅ Success message showing enum types created

---

## Step 3: Run Migration 001 - Create Core Tables

**Copy and paste the entire contents of:** `migrations/001_create_core_tables.sql`

**What it does:**
- Creates `donum_accounts` table (main user table)
- Creates `departments` table
- Creates `department_page_permissions` table (CRITICAL - fixes broken permissions!)
- Creates `department_members` table
- Creates `security_events` table
- Enables Row-Level Security (RLS) on all tables
- Creates super admin policies

**Expected result:** ✅ Success message showing all tables created

**⚠️ Note:** If you see errors about `user_role` or `user_status` types not existing, we'll need to create those first. Let me know if this happens!

---

## Step 4: Run Migration 002 - Fix Table References

**Copy and paste the entire contents of:** `migrations/002_fix_table_references.sql`

**What it does:**
- Updates all foreign keys to reference `donum_accounts` consistently
- Creates performance indexes
- Fixes any existing table references

**Expected result:** ✅ Success message showing all references updated

---

## Step 5: Run Migration 004 - Department Infrastructure

**Copy and paste the entire contents of:** `migrations/004_create_initial_departments.sql`

**What it does:**
- Creates department-based RLS policies
- Sets up security event logging functions
- Creates audit triggers
- **Note:** Does NOT create default departments (you'll create those manually)

**Expected result:** ✅ Success message showing infrastructure ready

---

## Step 6: Run Migration 010 - Test Migration

**Copy and paste the entire contents of:** `migrations/010_test_migration.sql`

**What it does:**
- Validates all tables exist
- Checks RLS policies
- Tests foreign key relationships
- **⚠️ Note:** This test expects Admin and Help departments, but migration 004 doesn't create them. The test will fail on department checks, but that's OK - we'll create departments manually next.

**Expected result:** 
- ✅ Core tables check should pass
- ❌ Department check will fail (expected - no departments created yet)
- ✅ RLS policies check should pass
- ✅ Foreign keys check should pass

---

## Step 7: Create Initial Departments (Manual)

After migrations complete, run this SQL to create your first departments:

```sql
-- Create Admin department
INSERT INTO public.departments (name, description, color, icon)
VALUES ('Admin', 'Administrative department with full access', '#6366F1', 'shield');

-- Create Support department (optional)
INSERT INTO public.departments (name, description, color, icon)
VALUES ('Support', 'Customer support department', '#10B981', 'headphones');

-- Create Sales department (optional)
INSERT INTO public.departments (name, description, color, icon)
VALUES ('Sales', 'Sales and business development', '#F59E0B', 'briefcase');
```

---

## Step 8: Assign Permissions to Departments (Manual)

After creating departments, assign permissions:

```sql
-- Admin department gets full access to all pages
INSERT INTO public.department_page_permissions (department_name, page_path, can_view, can_edit, can_delete)
VALUES
  ('Admin', '/admin/members', true, true, true),
  ('Admin', '/admin/applications', true, true, true),
  ('Admin', '/admin/loans', true, true, true),
  ('Admin', '/admin/departments', true, true, true),
  ('Admin', '/admin/finance', true, true, true),
  ('Admin', '/admin/system', true, true, true);

-- Support department gets view/edit access to members
INSERT INTO public.department_page_permissions (department_name, page_path, can_view, can_edit, can_delete)
VALUES
  ('Support', '/admin/members', true, true, false),
  ('Support', '/admin/applications', true, false, false);
```

---

## Step 8: Create Your First Super Admin User

You'll need to:
1. Create a user in Supabase Auth (Authentication → Users → Add User)
2. Then link that user to `donum_accounts` table:

```sql
-- Replace 'YOUR_USER_UUID' with the UUID from auth.users
-- Replace 'your-email@example.com' with your email
INSERT INTO public.donum_accounts (id, email, role, departments, admin_level)
VALUES (
  'YOUR_USER_UUID',  -- Get this from auth.users table
  'your-email@example.com',
  'donum_super_admin',
  ARRAY['Admin']::TEXT[],
  'super'
);
```

---

## ✅ Success Checklist

After completing all steps, verify:

- [ ] All 5 core tables exist (`donum_accounts`, `departments`, `department_page_permissions`, `department_members`, `security_events`)
- [ ] RLS is enabled on all tables
- [ ] At least one department created (Admin)
- [ ] Permissions assigned to Admin department
- [ ] Super admin user created and linked

---

## 🆘 Troubleshooting

### Error: "type user_role does not exist"
**Solution:** Make sure you ran migration 000 FIRST! It creates the enum types required by migration 001.

### Error: "relation auth.users does not exist"
**Solution:** This is normal in a fresh Supabase project. The migration will still work - `donum_accounts` will be created without the foreign key constraint initially.

### Test Migration Fails on Department Check
**Solution:** This is expected! Migration 004 doesn't create departments. Create them manually (Step 6) and the system will work.

---

## 🎯 Next Steps After Migrations

1. ✅ Create your super admin user
2. ✅ Create departments (Admin, Support, Sales, etc.)
3. ✅ Assign permissions to departments
4. ✅ Start building the Next.js frontend
5. ✅ Assign staff to departments
6. ✅ Assign clients to departments

---

**Ready to start? Begin with Step 1!** 🚀
