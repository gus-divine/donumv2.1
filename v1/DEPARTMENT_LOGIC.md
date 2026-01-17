# DEPARTMENT LOGIC - DONUM 2.1
## Complete Business Rules and Architecture

**Date:** January 2026  
**Version:** v1.0  
**Status:** Implementation Reference

---

## OVERVIEW

Donum 2.1 uses a **department-based permission system** instead of hardcoded roles. This provides flexible, scalable access control that adapts to organizational changes without code modifications.

---

## CORE CONCEPT

**Departments are organizational units that define access permissions.**
- Staff users belong to one or more departments
- Departments have permissions assigned to specific pages
- Staff inherit permissions from their assigned departments
- Super admins bypass all department restrictions

---

## PERMISSION FLOW

```
Super Admin (donum_super_admin)
├── Creates Departments (Admin, Support, Sales, Operations, etc.)
├── Assigns Page Permissions to Departments
│   └── For each page: can_view, can_edit, can_delete
└── Assigns Staff Users to Departments
    └── Staff inherit all permissions from their departments

Departments
├── Define which pages are accessible
├── Control what actions can be performed (view/edit/delete)
└── Enable department-scoped data access

Staff Users (donum_staff)
├── Inherit permissions from assigned departments
├── Can only access pages where departments have can_view = true
├── Can only edit/delete if departments have can_edit/can_delete = true
└── See only data assigned to their departments
```

---

## DATABASE STRUCTURE

### **departments Table**
```sql
CREATE TABLE public.departments (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,              -- e.g., "Admin", "Support", "Sales"
  description TEXT,                       -- Department purpose
  color TEXT DEFAULT '#6366F1',           -- UI color
  icon TEXT DEFAULT 'users',              -- UI icon
  is_active BOOLEAN DEFAULT true,         -- Can be disabled
  prospect_assignment_enabled BOOLEAN DEFAULT true,  -- Controls whether department can receive new prospect/lead assignments (donum_lead, donum_prospect)
  member_assignment_enabled BOOLEAN DEFAULT true,     -- Controls whether department can receive new member assignments (donum_member)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,                        -- Who created it
  updated_by UUID                          -- Who last updated it
);
```

### **department_page_permissions Table**
```sql
CREATE TABLE public.department_page_permissions (
  id UUID PRIMARY KEY,
  department_name TEXT NOT NULL,           -- References departments.name
  page_path TEXT NOT NULL,                -- e.g., "/admin/members"
  can_view BOOLEAN DEFAULT false,         -- Can access the page
  can_edit BOOLEAN DEFAULT false,         -- Can modify data
  can_delete BOOLEAN DEFAULT false,       -- Can delete records
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE(department_name, page_path)      -- One permission per dept/page
);
```

### **department_members Table**
```sql
CREATE TABLE public.department_members (
  id UUID PRIMARY KEY,
  department_name TEXT NOT NULL,          -- Which department
  member_id UUID NOT NULL,                -- Which user (member/prospect)
  assigned_at TIMESTAMPTZ,                -- When assigned
  assigned_by UUID,                       -- Who assigned
  unassigned_at TIMESTAMPTZ,              -- When unassigned (soft delete)
  unassigned_by UUID,                     -- Who unassigned
  is_active BOOLEAN DEFAULT true,        -- Current assignment status
  assignment_notes TEXT,                  -- Notes about assignment
  UNIQUE(department_name, member_id, is_active)
);
```

### **donum_accounts Table**
```sql
-- Users have a departments array field
departments TEXT[] DEFAULT '{}'  -- Array of department names user belongs to
```

---

## BUSINESS RULES

### **1. Department Creation**
- **Who can create:** Only super admins (`donum_super_admin`)
- **Required fields:** Name (must be unique)
- **Optional fields:** Description, color, icon
- **Default values:** 
  - `is_active = true`
  - `prospect_assignment_enabled = true`
  - `member_assignment_enabled = true`
  - `color = '#6366F1'`
  - `icon = 'users'`

### **2. Permission Assignment**
- **Who can assign:** Only super admins
- **Granularity:** Per department, per page
- **Three permission levels:**
  - `can_view` - Can see the page and read data
  - `can_edit` - Can modify data (requires `can_view`)
  - `can_delete` - Can delete records (requires `can_view`)
- **Logic:** If `can_view = false`, then `can_edit` and `can_delete` are automatically false

### **3. Staff Assignment to Departments**
- **Who can assign:** Super admins
- **Method:** Update `donum_accounts.departments` array field
- **Multiple departments:** Staff can belong to multiple departments
- **Permission inheritance:** Staff gets UNION of all permissions from all their departments
  - If any department allows `can_view`, staff can view
  - If any department allows `can_edit`, staff can edit
  - If any department allows `can_delete`, staff can delete

### **4. Client Assignment Control (Separate for Prospects & Members)**
- **Purpose:** Two separate fields control whether a department can receive new client assignments:
  - `prospect_assignment_enabled` - Controls prospect/lead assignments (donum_lead, donum_prospect roles)
  - `member_assignment_enabled` - Controls member assignments (donum_member role)
- **Why separate?** Different departments may handle prospects vs members differently:
  - Sales departments might receive prospects but not handle existing members
  - Support departments might handle existing members but not receive new prospects
  - Full-service departments handle both

#### **Prospect Assignment (`prospect_assignment_enabled`)**
- **When enabled (`true`):** 
  - Department appears in assignment dropdowns when assigning leads/prospects
  - Department is eligible for automatic prospect assignment workflows
  - Staff can manually assign leads/prospects to this department
- **When disabled (`false`):**
  - Department is excluded from prospect assignment workflows
  - Department does not appear in assignment dropdowns for leads/prospects
  - Existing assignments remain unchanged (only prevents new assignments)

#### **Member Assignment (`member_assignment_enabled`)**
- **When enabled (`true`):** 
  - Department appears in assignment dropdowns when assigning members
  - Department is eligible for automatic member assignment workflows
  - Staff can manually assign members to this department
- **When disabled (`false`):**
  - Department is excluded from member assignment workflows
  - Department does not appear in assignment dropdowns for members
  - Existing assignments remain unchanged (only prevents new assignments)

#### **Use Cases:**
- **Sales Department:** `prospect_assignment_enabled = true`, `member_assignment_enabled = false` (handles prospects, passes members to support)
- **Support Department:** `prospect_assignment_enabled = false`, `member_assignment_enabled = true` (handles existing members, doesn't receive new prospects)
- **Full-Service Department:** Both `true` (handles entire client lifecycle)
- **Internal Departments (IT, HR):** Both `false` (no client relationships)

### **5. Member Assignment to Departments**
- **Who can assign:** Staff with `can_edit` permission on `/admin/members` page
- **Purpose:** Controls which staff can see which members/clients
- **Data isolation:** Staff only see members assigned to their departments
- **Assignment tracking:** Full audit trail in `department_members` table
- **Assignment filters:** 
  - When assigning **prospects/leads**: Only departments with `prospect_assignment_enabled = true` appear
  - When assigning **members**: Only departments with `member_assignment_enabled = true` appear
- **Workflow:** 
  - Leads/prospects are assigned to departments (requires `prospect_assignment_enabled = true`)
  - Qualification process → prospect becomes member
  - Members can be reassigned between departments (requires `member_assignment_enabled = true` for target department)
  - Both leads and members use the same `department_members` table for tracking

### **6. Access Control Logic**

#### **Page Access Check:**
```typescript
// Pseudo-code for permission checking
function canAccessPage(userRole, userDepartments, pagePath) {
  // Super admins and admins see everything
  if (userRole === 'donum_super_admin' || userRole === 'donum_admin') {
    return true;
  }
  
  // External users (members, leads, partners) have no admin access
  if (['donum_member', 'donum_lead', 'donum_prospect', 'donum_partner'].includes(userRole)) {
    return false;
  }
  
  // Staff users check department permissions
  if (userRole === 'donum_staff') {
    // Check if any of user's departments have can_view for this page
    return checkDepartmentPermissions(userDepartments, pagePath, 'can_view');
  }
  
  return false;
}
```

#### **Data Access (RLS Policies):**
- **Super admins:** Can see all data
- **Staff:** Can only see members/clients assigned to their departments via `department_members` table
- **Members:** Can only see their own data

---

## EXAMPLE SCENARIOS

### **Scenario 1: Support Department**
```
Department: "Support"
Permissions:
  - /admin/members: can_view=true, can_edit=true, can_delete=false
  - /admin/applications: can_view=true, can_edit=false, can_delete=false

Staff User: "John" assigned to ["Support"]
Result:
  - John can view and edit members
  - John can view (but not edit) applications
  - John can only see members assigned to Support department
```

### **Scenario 2: Sales Department**
```
Department: "Sales"
Permissions:
  - /admin/members: can_view=true, can_edit=true, can_delete=false
  - /admin/applications: can_view=true, can_edit=true, can_delete=false
  - /admin/loans: can_view=true, can_edit=false, can_delete=false

Staff User: "Sarah" assigned to ["Sales"]
Result:
  - Sarah can view and edit members
  - Sarah can view and edit applications
  - Sarah can view (but not edit) loans
  - Sarah can only see members assigned to Sales department
```

### **Scenario 3: Multi-Department Staff**
```
Staff User: "Mike" assigned to ["Sales", "Support"]

Sales permissions:
  - /admin/members: can_view=true, can_edit=true
  - /admin/applications: can_view=true, can_edit=true

Support permissions:
  - /admin/members: can_view=true, can_edit=true
  - /admin/applications: can_view=true, can_edit=false

Result:
  - Mike can view and edit members (from both departments)
  - Mike can view and edit applications (Sales allows edit, Support doesn't, but UNION = true)
  - Mike can see members assigned to EITHER Sales OR Support departments
```

### **Scenario 4: Separate Prospect vs Member Assignment Control**
```
Department: "Sales"
Settings:
  - is_active = true
  - prospect_assignment_enabled = true   (Receives new prospects)
  - member_assignment_enabled = false    (Doesn't handle existing members)

Department: "Support"
Settings:
  - is_active = true
  - prospect_assignment_enabled = false   (Doesn't receive new prospects)
  - member_assignment_enabled = true      (Handles existing members)

Department: "IT"
Settings:
  - is_active = true
  - prospect_assignment_enabled = false   (Internal, no clients)
  - member_assignment_enabled = false     (Internal, no clients)

When assigning a NEW PROSPECT/LEAD:
  - "Sales" appears in dropdown ✅
  - "Support" does NOT appear ❌
  - "IT" does NOT appear ❌

When assigning a MEMBER:
  - "Support" appears in dropdown ✅
  - "Sales" does NOT appear ❌
  - "IT" does NOT appear ❌

Example workflow:
  1. New lead registers → Can only be assigned to "Sales" (prospect_assignment_enabled = true)
  2. Lead gets qualified → Becomes member → Still assigned to "Sales"
  3. Admin wants to transfer member to support → Can reassign to "Support" (member_assignment_enabled = true)
  4. Admin tries to reassign member back to "Sales" → Cannot (Sales has member_assignment_enabled = false)
```

---

## ADMIN PAGES

The following admin pages exist and can have permissions assigned:

1. `/admin/dashboard` - Overview dashboard
2. `/admin/users` - User management
3. `/admin/staff` - Staff management
4. `/admin/members` - Member/client management
5. `/admin/applications` - Application processing
6. `/admin/loans` - Loan management
7. `/admin/departments` - Department management (super admin only)
8. `/admin/finance` - Financial overview
9. `/admin/system` - System health monitoring

---

## RLS POLICY LOGIC

### **donum_accounts Table Policies:**
1. **users_read_own_account** - Users can always read their own account
2. **super_admin_read_all** - Super admins can read all accounts
3. **staff_read_department_members** - Staff can read members assigned to their departments

### **departments Table Policies:**
1. **authenticated_read_departments** - All authenticated users can read departments
2. **super_admin_departments_all** - Super admins can do everything

### **department_page_permissions Table Policies:**
1. **authenticated_read_permissions** - All authenticated users can read permissions
2. **super_admin_permissions_all** - Super admins can do everything

---

## IMPLEMENTATION NOTES

### **Key Principles:**
1. **No hardcoded roles** - Everything is department-based
2. **Flexible permissions** - Can be changed without code changes
3. **Audit trail** - All changes tracked in `security_events` table
4. **Data isolation** - Staff only see data assigned to their departments
5. **Super admin override** - Super admins bypass all restrictions

### **Permission Checking:**
- Frontend: Use `getUserAccessiblePages()` function
- Backend: RLS policies enforce at database level
- UI: Filter navigation items based on accessible pages

### **Department Management:**
- Super admin creates departments via `/admin/departments` page
- Assign permissions per page per department
- Assign staff to departments via user management
- Assign members to departments via member management

---

## MIGRATION FROM DONUM 2.0

**Old System (Donum 2.0):**
- Hardcoded roles in code
- Fixed permission structure
- Difficult to change permissions

**New System (Donum 2.1):**
- Flexible department-based permissions
- No code changes needed to adjust permissions
- Super admin can configure everything via UI

---

## REFERENCES

- **Database Schema:** `v1/migrations/001_create_core_tables.sql`
- **RLS Policies:** `v1/migrations/004_create_initial_departments.sql`
- **API Functions:** `web/lib/api/departments.ts`
- **Permission Helpers:** `web/lib/permissions.ts`
- **Component Implementation:** `web/components/admin/departments/`

---

*This document consolidates all department logic and business rules for Donum 2.1.*
