# 🚀 DONUM 2.0 DATABASE MIGRATION PLAN
## Complete Schema Overhaul for Department-Based Permissions

**Date:** January 17, 2026
**Version:** v2.0 (Updated with 2026 Best Practices)
**Status:** Ready for Implementation

---

## 📋 EXECUTIVE SUMMARY

This comprehensive rebuild plan addresses critical architectural issues in Donum 2.0 and implements a modern, AI-enhanced platform with department-based permissions for enterprise-grade security and compliance.

**Key Changes:**
- Fix broken permission system (missing `department_page_permissions` table)
- Replace `accounts`/`users` table inconsistency with `donum_accounts`
- Implement department-based access control with comprehensive audit logging
- Add AI-powered features (client matching, chat support) using RAG patterns
- Modernize testing with Vitest + Playwright, deployment with Standalone mode
- Enable SOC 2 compliant security with enhanced monitoring
- Implement 2026 best practices for performance, security, and scalability

**2026 Enhancements:**
- AI Integration: RAG patterns with pgvector for semantic search
- Testing: Vitest + React Testing Library, Playwright E2E
- Deployment: Next.js 15+ Standalone mode with Docker optimization
- Security: Automated vulnerability scanning, resource limits
- Performance: Edge functions, smart caching, streaming responses

---

## 🚀 2026 ENHANCEMENTS INTEGRATED

### **AI & Machine Learning**
- **RAG Implementation**: Retrieval-Augmented Generation using pgvector for semantic search
- **Unified AI SDK**: Vercel AI SDK for multi-provider support (OpenAI, Anthropic, Gemini)
- **Client Matching**: AI-powered financial analysis and donor recommendations
- **Smart Chat**: Context-aware support chat with conversation memory

### **Modern Development Stack**
- **Testing**: Vitest + React Testing Library for fast unit tests, Playwright for E2E
- **Deployment**: Next.js 15+ Standalone mode optimized for Docker containers
- **Security**: Automated vulnerability scanning, resource limits, health checks
- **Performance**: Edge functions, streaming responses, advanced caching strategies

### **Infrastructure Modernization**
- **Docker Best Practices**: Multi-stage builds, minimal images, immutable infrastructure
- **API Architecture**: REST + GraphQL hybrid as recommended by Supabase
- **Monitoring**: Enhanced observability with Core Web Vitals tracking
- **CI/CD**: Automated pipelines with security scanning and performance testing

---

## 🎯 CURRENT ISSUES IDENTIFIED

### **Critical Problems**
1. ❌ **Permission System Broken** - Missing `department_page_permissions` table
2. ❌ **Table Name Inconsistency** - Schema uses `accounts` but code references `users`
3. ❌ **No Department Management** - Missing `departments` table
4. ❌ **Inadequate Audit Trails** - Insufficient compliance logging
5. ❌ **Weak Security Model** - No department-based access control

### **Business Impact**
- Staff cannot access assigned clients (permission queries fail)
- Super admin cannot create departments or manage permissions
- No compliance audit trails for financial data access
- Security vulnerabilities due to broken RLS policies

---

## 🏗️ MIGRATION PHASES

### **Phase 1: Foundation (Day 1 - Critical)**
**Goal:** Fix broken permission system, enable basic functionality

#### **Step 1.1: Create Core Tables**
```sql
-- File: 001_create_core_tables.sql
-- Create missing tables that break the permission system

-- 1. Rename accounts to donum_accounts (fix inconsistency)
ALTER TABLE public.accounts RENAME TO donum_accounts;

-- 2. Create departments table
CREATE TABLE public.departments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366F1',
  icon TEXT DEFAULT 'users',
  is_active BOOLEAN DEFAULT true,
  lead_assignment_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.donum_accounts(id),
  updated_by UUID REFERENCES public.donum_accounts(id)
);

-- 3. Create department_page_permissions table (CRITICAL FIX)
CREATE TABLE public.department_page_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  department_name TEXT NOT NULL,
  page_path TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.donum_accounts(id),
  updated_by UUID REFERENCES public.donum_accounts(id),
  UNIQUE(department_name, page_path)
);

-- 4. Create department_members table
CREATE TABLE public.department_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  department_name TEXT NOT NULL,
  member_id UUID NOT NULL REFERENCES public.donum_accounts(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.donum_accounts(id),
  unassigned_at TIMESTAMPTZ,
  unassigned_by UUID REFERENCES public.donum_accounts(id),
  is_active BOOLEAN DEFAULT true,
  assignment_notes TEXT,
  UNIQUE(department_name, member_id, is_active)
);
```

#### **Step 1.2: Fix Table References**
```sql
-- File: 002_fix_table_references.sql
-- Update all foreign key references from 'users' to 'donum_accounts'

-- Update foreign key constraints
ALTER TABLE public.admin_profiles DROP CONSTRAINT admin_profiles_admin_id_fkey;
ALTER TABLE public.admin_profiles ADD CONSTRAINT admin_profiles_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.donum_staff_profiles DROP CONSTRAINT donum_staff_profiles_staff_id_fkey;
ALTER TABLE public.donum_staff_profiles ADD CONSTRAINT donum_staff_profiles_staff_id_fkey
  FOREIGN KEY (staff_id) REFERENCES public.donum_accounts(id) ON DELETE CASCADE;

-- Continue for all tables...
```

#### **Step 1.3: Enable Security**
```sql
-- File: 003_enable_security.sql
-- Enable RLS on all tables and create basic policies

ALTER TABLE public.donum_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_page_permissions ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (will be enhanced in Phase 2)
CREATE POLICY "Super admin full access" ON public.donum_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.donum_accounts
      WHERE id = auth.uid() AND role = 'donum_super_admin'
    )
  );
```

---

### **Phase 2: Department System (Day 2-3)**
**Goal:** Implement full department-based permission system

#### **Step 2.1: Create Initial Departments**
```sql
-- File: 004_create_initial_departments.sql

-- Create Admin department
INSERT INTO public.departments (name, description, color, icon) VALUES
('Admin', 'Administrative staff with full platform management access', '#EF4444', 'shield-check'),
('Help', 'Support staff who assist prospects and members', '#10B981', 'help-circle');

-- Grant Admin department full permissions
INSERT INTO public.department_page_permissions (department_name, page_path, can_view, can_edit, can_delete) VALUES
('Admin', '/admin/dashboard', true, true, true),
('Admin', '/admin/users', true, true, true),
('Admin', '/admin/staff', true, true, true),
('Admin', '/admin/members', true, true, true),
('Admin', '/admin/applications', true, true, true),
('Admin', '/admin/loans', true, true, true),
('Admin', '/admin/departments', true, true, true),
('Admin', '/admin/finance', true, true, true),
('Admin', '/admin/system', true, true, true);

-- Additional departments and permissions created by super admin as needed
```

#### **Step 2.2: Enhanced RLS Policies**
```sql
-- File: 005_enhanced_rls_policies.sql

-- Department-based access policies
CREATE POLICY "Department staff access" ON public.donum_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.donum_accounts u
      WHERE u.id = auth.uid()
        AND u.role = 'donum_staff'
        AND EXISTS (
          SELECT 1 FROM public.department_page_permissions dpp
          WHERE dpp.department_name = ANY(u.departments)
            AND dpp.page_path = '/admin/members'
            AND dpp.can_view = true
        )
    )
  );
```

---

### **Phase 3: Business Logic (Day 4-5)**
**Goal:** Implement complete business workflows

#### **Step 3.1: Enhanced Applications Table**
```sql
-- File: 006_enhance_applications.sql

-- Add department assignment fields to applications
ALTER TABLE public.applications
ADD COLUMN assigned_departments TEXT[] DEFAULT '{}',
ADD COLUMN assigned_staff UUID[] DEFAULT '{}';

-- Update RLS policies for applications
CREATE POLICY "Staff view assigned applications" ON public.applications
  FOR SELECT USING (
    -- Staff can see applications assigned to their departments
    assigned_departments && (
      SELECT array_agg(department_name)
      FROM public.department_page_permissions
      WHERE can_view = true AND page_path = '/admin/applications'
    )
  );
```

#### **Step 3.2: Staff-Member Relationships**
```sql
-- File: 007_staff_member_relationships.sql

-- Ensure staff_members table exists with proper constraints
ALTER TABLE public.staff_members
ADD CONSTRAINT check_relationship_end_date
  CHECK (relationship_end_date IS NULL OR relationship_end_date >= relationship_start_date);

-- Create indexes for performance
CREATE INDEX idx_staff_members_active ON public.staff_members(staff_id, member_id)
WHERE relationship_status = 'active';

-- RLS policies for staff-member relationships
CREATE POLICY "Staff view their relationships" ON public.staff_members
  FOR SELECT USING (auth.uid() = staff_id OR auth.uid() = member_id);
```

---

### **Phase 4: Security & Compliance (Day 6-7)**
**Goal:** Implement enterprise-grade security

#### **Step 4.1: Enhanced Audit Logging**
```sql
-- File: 008_enhanced_audit.sql

-- Add security events table
CREATE TABLE public.security_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'data_access', 'permission_change', 'department_assignment')),
  user_id UUID REFERENCES public.donum_accounts(id),
  resource_type TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, user_id, resource_type, resource_id, details
  ) VALUES (
    p_event_type, auth.uid(), p_resource_type, p_resource_id, p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### **Step 4.2: Data Encryption**
```sql
-- File: 009_data_encryption.sql

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted fields for sensitive data
ALTER TABLE public.donum_accounts
ADD COLUMN encrypted_ssn TEXT,  -- For future use
ADD COLUMN encrypted_tax_id TEXT;  -- For future use

-- Function to encrypt/decrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key TEXT DEFAULT 'donum-encryption-key-2026')
RETURNS TEXT AS $$
BEGIN
  RETURN encode(encrypt(data::bytea, key::bytea, 'aes'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key TEXT DEFAULT 'donum-encryption-key-2026')
RETURNS TEXT AS $$
BEGIN
  RETURN convert_from(decrypt(decode(encrypted_data, 'hex'), key::bytea, 'aes'), 'utf8');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

### **Phase 5: Testing & Validation (Day 8)**
**Goal:** Ensure everything works correctly

#### **Step 5.1: Test Scripts**
```sql
-- File: 010_test_migration.sql

-- Test department creation
DO $$
DECLARE
  admin_count INTEGER;
  help_count INTEGER;
BEGIN
  -- Check departments were created
  SELECT COUNT(*) INTO admin_count FROM public.departments WHERE name = 'Admin';
  SELECT COUNT(*) INTO help_count FROM public.departments WHERE name = 'Help';

  IF admin_count = 1 AND help_count = 1 THEN
    RAISE NOTICE '✅ Departments created successfully';
  ELSE
    RAISE EXCEPTION '❌ Department creation failed';
  END IF;
END $$;

-- Test permission assignments
DO $$
DECLARE
  admin_perms INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_perms
  FROM public.department_page_permissions
  WHERE department_name = 'Admin' AND can_view = true;

  IF admin_perms >= 8 THEN
    RAISE NOTICE '✅ Admin permissions assigned successfully';
  ELSE
    RAISE EXCEPTION '❌ Admin permission assignment failed';
  END IF;
END $$;
```

---

## 📊 SUCCESS CRITERIA

### **Functional Tests**
- ✅ Super admin can create departments
- ✅ Staff can be assigned to departments
- ✅ Department permissions control page access
- ✅ Staff can only see assigned members/prospects
- ✅ Audit logs capture all security events

### **Security Tests**
- ✅ RLS policies prevent unauthorized access
- ✅ Department boundaries contain data breaches
- ✅ Audit trails are comprehensive
- ✅ Encryption works for sensitive data

### **Performance Tests**
- ✅ Query performance acceptable (<500ms)
- ✅ Permission checks don't slow down UI
- ✅ Audit logging doesn't impact operations

---

## 🔄 ROLLBACK PLAN

### **Immediate Rollback (If Critical Issues)**
```sql
-- File: rollback.sql
-- Drop new tables and revert changes

DROP TABLE IF EXISTS public.security_events;
DROP TABLE IF EXISTS public.department_members;
DROP TABLE IF EXISTS public.department_page_permissions;
DROP TABLE IF EXISTS public.departments;

-- Revert table rename
ALTER TABLE public.donum_accounts RENAME TO accounts;

-- Note: Foreign key fixes would need manual reversion
```

### **Phased Rollback**
- Phase 5 → Phase 4 → Phase 3 → Phase 2 → Phase 1
- Each phase has its own rollback script
- Data integrity preserved during rollback

---

## 📋 IMPLEMENTATION CHECKLIST

### **Pre-Migration**
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Prepare rollback scripts
- [ ] Notify team of maintenance window

### **During Migration**
- [ ] Run Phase 1 (Foundation)
- [ ] Verify staff can access system
- [ ] Run Phase 2 (Departments)
- [ ] Test department creation
- [ ] Run Phase 3 (Business Logic)
- [ ] Test member assignment workflows
- [ ] Run Phase 4 (Security)
- [ ] Verify audit logging
- [ ] Run Phase 5 (Testing)
- [ ] Full system validation

### **Post-Migration**
- [ ] Monitor system performance
- [ ] Train staff on new department system
- [ ] Update documentation
- [ ] Schedule security audit

---

## 🎯 BUSINESS IMPACT

### **Immediate Benefits**
- ✅ Staff can access assigned clients
- ✅ Super admin can manage permissions
- ✅ Department-based security implemented
- ✅ Audit compliance achieved

### **Long-term Benefits**
- ✅ Scalable permission system
- ✅ Regulatory compliance
- ✅ Enterprise-grade security
- ✅ Flexible organizational structure

---

## 📞 SUPPORT & CONTACTS

**Migration Lead:** [Your Name]
**Technical Support:** [Dev Team]
**Business Owner:** [Product Owner]
**Rollback Authority:** [Super Admin]

**Emergency Contacts:**
- Database Issues: [DBA Team]
- Security Issues: [Security Team]
- Business Impact: [Executive Team]

---

**Migration Status:** 🟡 **READY FOR IMPLEMENTATION**

**Estimated Duration:** 8 days
**Risk Level:** 🔴 **HIGH** (Major schema changes)
**Rollback Time:** < 30 minutes (immediate), < 4 hours (full)

---

*This migration plan transforms Donum from a broken permission system to an enterprise-grade, department-based security architecture. All changes are designed for minimal business disruption with comprehensive rollback capabilities.*