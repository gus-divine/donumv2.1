# DONUM 2.1 BUSINESS LOGIC SPECIFICATION
## Extracted from Donum 2.0 Analysis

**Date:** January 17, 2026
**Version:** v1.0
**Status:** Ready for Implementation

---

## EXECUTIVE SUMMARY

This document captures the core business logic and workflows from Donum 2.0 that must be implemented in Donum 2.1. Based on analysis of the existing codebase, Donum is a comprehensive charitable gift financing platform with advanced features for managing donor relationships, loan processing, and regulatory compliance.

---

## CORE BUSINESS ENTITIES

### **1. User Management (6 Roles)**
- **donum_super_admin**: Platform owners/operators (full access)
- **donum_admin**: Internal staff managing operations and client relationships
- **donum_staff**: Financial advisors managing donor relationships
- **donum_member**: High-net-worth clients using financing products
- **donum_partner**: Charities/third-parties receiving donations
- **donum_lead**: Prospects learning about Donum solutions

### **2. Staff-Member Relationships**
- **Assignment Logic**: Staff assigned to members based on territories/specializations
- **Capacity Management**: Staff have maximum member limits
- **Relationship Tracking**: Start/end dates, assignment notes, active status
- **Commission Tracking**: Base rates per staff member

### **3. Financial Products & Calculators**
- **Calculator Engine**: Plugin-based system for financial calculations
- **Product Types**: Various financing instruments for charitable gifts
- **Defund Calculator**: Specific calculator for debt restructuring
- **Dynamic Calculations**: Real-time financial modeling

---

## CORE WORKFLOWS

### **1. Member Onboarding & Qualification**
```
Lead → Qualification → Profile Creation → Staff Assignment → Active Member
```

**Qualification Process:**
- Income/net worth assessment
- Risk tolerance evaluation
- Investment goals documentation
- Tax bracket analysis
- Onboarding completion tracking

### **2. Staff-Member Assignment Workflow**
```
Member Registration → Territory Matching → Staff Capacity Check → Assignment → Relationship Activation
```

**Assignment Rules:**
- Geographic territories
- Staff specializations (tax, estate, retirement, wealth management)
- Capacity limits (max members per staff)
- Commission rates
- Relationship status tracking

### **3. Loan/Application Processing**
```
Application Submission → Staff Review → Document Collection → Approval → Funding → Monitoring
```

**Application Management:**
- Status tracking (pending, approved, funded, closed)
- Assignment to departments/staff
- Workflow steps and approvals
- Document requirements
- Timeline tracking

---

## 📊 DATA ENTITIES & RELATIONSHIPS

### **Core Tables (11 total)**

#### **User Management**
- `donum_accounts` - Main user table (renamed from accounts)
- `admin_profiles` - Admin-specific data
- `donum_staff_profiles` - Staff credentials, territories, capacity
- `donum_member_profiles` - Member financial data, risk profiles

#### **Relationships**
- `staff_members` - Staff-member assignments with status tracking
- `department_members` - Department-based user assignments (NEW in 2.1)

#### **Business Operations**
- `admin_audit_log` - Administrative action tracking
- `user_activity` - User behavior analytics
- `system_metrics` - Platform performance metrics
- `dashboard_metrics_history` - Dashboard KPIs over time
- `financial_metrics_history` - Financial performance tracking
- `admin_settings` - Platform configuration

---

## BUSINESS LOGIC COMPONENTS

### **1. Calculator System**
```typescript
// Plugin-based calculator architecture
interface CalculatorPlugin {
  name: string;
  calculate: (inputs: CalculatorInputs) => CalculatorResult;
  validate: (inputs: CalculatorInputs) => ValidationResult;
}

// Core calculators needed:
- DefundCalculator (existing)
- TaxOptimizationCalculator
- RetirementPlanningCalculator
- EstatePlanningCalculator
- CharitableGivingCalculator
```

### **2. Qualification Engine**
```typescript
interface QualificationCriteria {
  minIncome: number;
  maxDebtRatio: number;
  riskTolerance: RiskLevel;
  accreditationStatus: boolean;
}

interface QualificationResult {
  eligible: boolean;
  recommendedProducts: Product[];
  riskAssessment: RiskProfile;
  nextSteps: ActionItem[];
}
```

### **3. Assignment Engine**
```typescript
interface AssignmentCriteria {
  territories: string[];
  specializations: string[];
  capacity: number;
  performance: PerformanceMetrics;
}

interface AssignmentRecommendation {
  recommendedStaff: Staff[];
  reasoning: string;
  alternatives: Staff[];
  capacityUtilization: number;
}
```

---

## 🔌 INTEGRATION REQUIREMENTS

### **1. QuickBooks Integration**
- OAuth 2.0 authentication flow
- Financial data synchronization
- Transaction import/export
- Reconciliation workflows

### **2. Document Management**
- File upload/storage (PDFs, legal docs)
- Version control and audit trails
- Secure access based on permissions
- Integration with e-signature services

### **3. Voice Assistant Integration**
```
Real-time Voice Service Architecture:
├── Voice Service Manager
├── Conversation Manager
├── Agent Handoff System
├── Realtime Voice Service
└── Voice Service Types/Handlers
```

---

## ANALYTICS & METRICS

### **System Metrics Tracked**
- User activity (logins, page views, feature usage)
- Performance metrics (response times, error rates)
- Financial metrics (application volume, approval rates, funding amounts)
- Business KPIs (conversion rates, staff utilization, member satisfaction)

### **Dashboard Requirements**
- Role-based dashboards (Admin, Staff, Member)
- Real-time metrics with historical trends
- Custom report generation
- Export capabilities (PDF, CSV, Excel)

---

## 🔐 SECURITY & COMPLIANCE

### **Data Protection**
- PII encryption for sensitive financial data
- SSN/Tax ID encryption functions
- Audit trails for all data access
- Compliance logging (SOC 2, FINRA requirements)

### **Access Control (Enhanced in 2.1)**
- Department-based permissions (NEW)
- Role-based access control (RBAC)
- Row-level security (RLS) policies
- Multi-factor authentication
- Session management and timeouts

---

## USER EXPERIENCE WORKFLOWS

### **Admin Dashboard**
- User management and role assignments
- Department configuration and permissions
- System metrics and performance monitoring
- Audit log review and compliance reporting
- Staff capacity and territory management

### **Staff Workspace**
- Assigned member overview and relationship management
- Application processing and approval workflows
- Document collection and verification
- Communication tools and notes
- Performance metrics and commission tracking

### **Member Portal**
- Financial profile and qualification status
- Assigned staff contact information
- Application submission and tracking
- Document upload and management
- Progress updates and notifications

---

## 🔄 MIGRATION CONSIDERATIONS

### **Data to Preserve**
- User accounts and profiles (all roles)
- Staff-member relationships and assignment history
- Application data and processing history
- Document storage and metadata
- Audit logs and compliance records
- System configuration and settings

### **Business Logic to Enhance**
- Upgrade calculator system to plugin architecture
- Implement department-based permissions
- Add AI-powered client matching and recommendations
- Enhance real-time notifications and collaboration
- Upgrade voice assistant with conversation memory

---

## IMPLEMENTATION PHASES

### **Phase 1: Foundation (Database & Auth)**
- Department-based permission system
- Enhanced user profiles and relationships
- Basic CRUD operations for all entities

### **Phase 2: Business Logic (Core Workflows)**
- Calculator engine and qualification system
- Application processing workflows
- Staff-member assignment logic
- Document management system

### **Phase 3: Advanced Features (AI & Integrations)**
- AI-powered recommendations and chat
- QuickBooks integration
- Voice assistant enhancements
- Advanced analytics and reporting

### **Phase 4: Optimization & Launch**
- Performance optimization
- Comprehensive testing
- Security audit and compliance
- Production deployment

---

**This specification provides the business foundation for Donum 2.1, ensuring all critical workflows and data relationships from Donum 2.0 are preserved and enhanced in the fresh rebuild.**