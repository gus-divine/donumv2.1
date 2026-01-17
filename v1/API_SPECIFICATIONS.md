# 🔌 DONUM 2.1 API SPECIFICATIONS
## REST + GraphQL Hybrid Architecture

**Date:** January 17, 2026
**Version:** v1.0
**Status:** Ready for Implementation

---

## 📋 API ARCHITECTURE OVERVIEW

Donum 2.1 implements a hybrid API architecture using **Supabase's REST + GraphQL APIs**:

- **REST API**: Standard CRUD operations, file uploads, authentication
- **GraphQL API**: Complex queries, real-time subscriptions, flexible data fetching
- **Edge Functions**: Custom business logic, external integrations, AI processing

---

## 🎯 ADMIN API ENDPOINTS

### **Dashboard & Analytics**
```
GET  /api/admin/dashboard
POST /api/admin/dashboard/metrics
GET  /api/admin/dashboard/financial
GET  /api/admin/dashboard/health
```

### **User Management**
```
GET    /api/admin/users              # List all users with department filtering
POST   /api/admin/users              # Create new user
GET    /api/admin/users/[id]         # Get user details
PUT    /api/admin/users/[id]         # Update user
DELETE /api/admin/users/[id]         # Deactivate user
```

### **Department Management**
```
GET    /api/admin/departments               # List all departments
POST   /api/admin/departments               # Create department
GET    /api/admin/departments/[id]          # Get department details
PUT    /api/admin/departments/[id]          # Update department
DELETE /api/admin/departments/[id]          # Delete department
GET    /api/admin/departments/[id]/users    # Get department members
POST   /api/admin/departments/[id]/users    # Assign user to department
```

### **Staff Management**
```
GET    /api/admin/staff                 # List all staff
POST   /api/admin/staff                 # Create staff profile
GET    /api/admin/staff/[id]            # Get staff details
PUT    /api/admin/staff/[id]            # Update staff profile
DELETE /api/admin/staff/[id]            # Remove staff
```

### **Application Processing**
```
GET    /api/admin/applications                           # List applications
POST   /api/admin/applications                           # Create application
GET    /api/admin/applications/[id]                      # Get application
PUT    /api/admin/applications/[id]                      # Update application
DELETE /api/admin/applications/[id]                      # Delete application

# Application sub-resources
GET    /api/admin/applications/[id]/assignments          # Get assignments
POST   /api/admin/applications/[id]/assignments          # Create assignment
GET    /api/admin/applications/[id]/loans                # Get loans
POST   /api/admin/applications/[id]/loans                # Create loan
GET    /api/admin/applications/[id]/workflows            # Get workflows
POST   /api/admin/applications/[id]/workflows            # Start workflow
```

### **Loan Management**
```
GET    /api/admin/loans                    # List all loans
POST   /api/admin/loans                    # Create loan
GET    /api/admin/loans/[id]               # Get loan details
PUT    /api/admin/loans/[id]               # Update loan
DELETE /api/admin/loans/[id]               # Delete loan
```

### **Workflow Management**
```
GET    /api/admin/workflows                           # List workflows
POST   /api/admin/workflows                           # Create workflow
GET    /api/admin/workflows/[id]                      # Get workflow
PUT    /api/admin/workflows/[id]                      # Update workflow
DELETE /api/admin/workflows/[id]                      # Delete workflow

# Workflow instances
GET    /api/admin/workflows/instances                  # List instances
POST   /api/admin/workflows/instances                  # Start instance
GET    /api/admin/workflows/instances/[instanceId]     # Get instance
PUT    /api/admin/workflows/instances/[instanceId]     # Update instance

# Workflow steps
GET    /api/admin/workflows/instances/[instanceId]/steps/[stepId]    # Get step
PUT    /api/admin/workflows/instances/[instanceId]/steps/[stepId]    # Complete step
```

### **Calculator Management**
```
POST   /api/admin/calculators/upload      # Upload calculator plugin
GET    /api/admin/calculators             # List calculators
POST   /api/admin/calculators             # Register calculator
```

---

## 👤 MEMBER API ENDPOINTS

### **Profile Management**
```
GET    /api/member/profile              # Get member profile
PUT    /api/member/profile              # Update profile
POST   /api/member/profile              # Create profile
```

### **Qualification**
```
GET    /api/member/qualification         # Get qualification status
POST   /api/member/qualification         # Run qualification check
PUT    /api/member/qualification         # Update qualification data
```

### **Loan Management**
```
GET    /api/member/loans                 # List member's loans
POST   /api/member/loans                 # Apply for loan
GET    /api/member/loans/[id]            # Get loan details
PUT    /api/member/loans/[id]            # Update loan application
```

### **Document Management**
```
GET    /api/member/documents             # List documents
POST   /api/member/documents             # Upload document
GET    /api/member/documents/[id]        # Get document
DELETE /api/member/documents/[id]        # Delete document
```

### **Timeline/Activity**
```
GET    /api/member/timeline              # Get activity timeline
POST   /api/member/timeline              # Add timeline entry
```

### **Integrations**
```
GET    /api/member/integrations                       # List integrations
POST   /api/member/integrations                       # Setup integration
GET    /api/member/integrations/[type]                # Get integration
PUT    /api/member/integrations/[type]                # Update integration
DELETE /api/member/integrations/[type]               # Remove integration

# QuickBooks specific
GET    /api/member/integrations/quickbooks/callback  # OAuth callback
```

---

## 🔄 GRAPHQL SCHEMA OVERVIEW

### **Core Types**
```graphql
type DonumAccount {
  id: ID!
  email: String!
  role: UserRole!
  status: UserStatus!
  firstName: String
  lastName: String
  departments: [String!]
  createdAt: DateTime!
  updatedAt: DateTime!
  profile: UserProfile
}

type Department {
  id: ID!
  name: String!
  description: String
  color: String!
  icon: String!
  members: [DepartmentMember!]!
  permissions: [DepartmentPermission!]!
}

type Application {
  id: ID!
  memberId: ID!
  status: ApplicationStatus!
  assignedDepartments: [String!]
  assignedStaff: [ID!]
  createdAt: DateTime!
  updatedAt: DateTime!
  member: DonumAccount!
  loans: [Loan!]!
  workflows: [WorkflowInstance!]!
}
```

### **Key Queries**
```graphql
# Complex user queries with relationships
query GetStaffDashboard($staffId: ID!) {
  staff(id: $staffId) {
    profile {
      firstName
      lastName
      territories
      specializations
      memberCapacity
    }
    assignedMembers {
      id
      firstName
      lastName
      applications {
        id
        status
        createdAt
      }
    }
    departmentPermissions {
      pagePath
      canView
      canEdit
      canDelete
    }
  }
}

# Real-time subscriptions
subscription OnApplicationUpdate($userId: ID!) {
  applicationUpdated(userId: $userId) {
    id
    status
    updatedAt
    assignedStaff {
      id
      firstName
      lastName
    }
  }
}
```

---

## ⚡ EDGE FUNCTIONS (SUPABASE)

### **AI & Machine Learning**
```typescript
// AI-powered client matching
supabase.functions.invoke('match-clients', {
  body: { criteria: {...} }
})

// Chat with conversation memory
supabase.functions.invoke('ai-chat', {
  body: { message: "...", conversationId: "..." }
})
```

### **Business Logic**
```typescript
// Complex calculations
supabase.functions.invoke('calculate-financials', {
  body: { inputs: {...} }
})

// Document processing
supabase.functions.invoke('process-document', {
  body: { file: fileBlob, type: 'tax_return' }
})
```

### **Integrations**
```typescript
// QuickBooks sync
supabase.functions.invoke('quickbooks-sync', {
  body: { action: 'sync_transactions', companyId: '...' }
})

// Voice processing
supabase.functions.invoke('voice-assistant', {
  body: { audio: audioBlob, context: {...} }
})
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### **JWT-Based Auth**
- Supabase Auth for session management
- Custom claims for roles and departments
- Automatic token refresh
- MFA support

### **Row-Level Security (RLS)**
```sql
-- Department-based access control
CREATE POLICY "department_access" ON applications
  FOR SELECT USING (
    assigned_departments && (
      SELECT array_agg(department_name)
      FROM department_members
      WHERE member_id = auth.uid()
    )
  );
```

### **Permission Checking**
```typescript
// Client-side permission checks
const canViewPage = (pagePath: string) => {
  return userDepartments.some(dept =>
    departmentPermissions[dept]?.[pagePath]?.canView
  );
};
```

---

## 📊 REAL-TIME FEATURES

### **Supabase Realtime Subscriptions**
```typescript
// Real-time notifications
const channel = supabase
  .channel('application-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'applications',
    filter: `assigned_staff=eq.${userId}`
  }, (payload) => {
    showNotification(payload.new);
  })
  .subscribe();
```

### **Live Collaboration**
```typescript
// Staff collaboration on applications
const presenceChannel = supabase.channel('application-${appId}');
presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    updateCollaborators(state);
  })
  .subscribe();
```

---

## 🚀 API PERFORMANCE OPTIMIZATIONS

### **Caching Strategies**
- **Edge Caching**: Static content and API responses
- **Query Result Caching**: Expensive calculations
- **Personalization Caching**: User-specific data

### **Optimization Techniques**
- **Batch Operations**: Multiple operations in single request
- **Pagination**: Cursor-based pagination for large datasets
- **Selective Field Loading**: GraphQL field selection
- **Compression**: Response compression for large payloads

---

## 🧪 TESTING STRATEGY

### **Unit Tests (Vitest + React Testing Library)**
```typescript
// API function testing
describe('Application API', () => {
  it('should create application with proper permissions', async () => {
    const result = await createApplication(mockData);
    expect(result.status).toBe('pending');
  });
});
```

### **Integration Tests (Playwright)**
```typescript
// Full workflow testing
test('complete application workflow', async ({ page }) => {
  await page.goto('/applications/new');
  await page.fill('[data-testid="member-select"]', 'John Doe');
  await page.click('[data-testid="submit-application"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Core API Setup**
- [ ] Set up Supabase project with hybrid APIs
- [ ] Implement authentication endpoints
- [ ] Create basic CRUD operations
- [ ] Set up RLS policies

### **Phase 2: Business Logic APIs**
- [ ] Implement department-based permissions
- [ ] Build application processing workflows
- [ ] Add calculator integrations
- [ ] Create document management APIs

### **Phase 3: Advanced Features**
- [ ] Add GraphQL resolvers
- [ ] Implement real-time subscriptions
- [ ] Create edge functions for AI
- [ ] Set up external integrations

### **Phase 4: Optimization & Security**
- [ ] Add comprehensive testing
- [ ] Implement caching strategies
- [ ] Security audit and penetration testing
- [ ] Performance optimization

---

**This API specification provides the technical foundation for Donum 2.1's hybrid REST + GraphQL architecture, ensuring scalability, real-time capabilities, and seamless integration with modern frontend frameworks.**