# 🧩 DONUM 2.1 COMPONENT ARCHITECTURE
## Next.js 15+ App Router with React 19

**Date:** January 17, 2026
**Version:** v1.0
**Status:** Ready for Implementation

---

## 📋 ARCHITECTURE OVERVIEW

Donum 2.1 follows a **component-driven architecture** with clear separation of concerns, leveraging Next.js 15+ App Router and React 19 features:

- **App Router**: File-based routing with nested layouts
- **Server Components**: Default for performance and SEO
- **Client Components**: Selective interactivity with `'use client'`
- **Component Composition**: Reusable UI patterns and business logic separation

---

## 📁 FOLDER STRUCTURE

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route groups for auth flows
│   ├── (dashboard)/              # Protected dashboard routes
│   ├── admin/                    # Admin-specific pages
│   ├── staff/                    # Staff workspace pages
│   ├── member/                   # Member portal pages
│   ├── api/                      # API routes (REST + GraphQL)
│   ├── globals.css               # Global styles
│   └── layout.tsx               # Root layout
├── components/                   # Reusable components
│   ├── ui/                       # Base UI components
│   ├── admin/                    # Admin-specific components
│   ├── staff/                    # Staff-specific components
│   ├── member/                   # Member-specific components
│   ├── shared/                   # Cross-role components
│   └── layout/                   # Layout components
├── lib/                          # Core utilities
│   ├── auth/                     # Authentication logic
│   ├── permissions/              # Permission checking
│   ├── utils/                    # General utilities
│   ├── hooks/                    # Custom React hooks
│   └── validations/              # Form validations
├── services/                     # External integrations
│   ├── supabase/                 # Supabase client
│   ├── ai/                       # AI services
│   ├── integrations/             # External APIs
│   └── realtime/                 # Real-time features
├── types/                        # TypeScript definitions
│   ├── api/                      # API response types
│   ├── components/               # Component prop types
│   ├── database/                 # Database schema types
│   └── platform/                 # Platform-specific types
└── styles/                       # Styling (CSS modules, Tailwind)
    ├── components/               # Component-specific styles
    ├── pages/                    # Page-specific styles
    └── utilities/                # Utility classes
```

---

## 🧩 COMPONENT CATEGORIES

### **1. UI Components (Base Layer)**
```typescript
// src/components/ui/
├── Button.tsx                    # Primary, secondary, danger variants
├── Input.tsx                     # Text, email, password, search
├── Select.tsx                    # Single/multi-select dropdowns
├── Modal.tsx                     # Dialog, confirmation, form modals
├── Table.tsx                     # Data tables with sorting/pagination
├── Card.tsx                      # Content containers
├── Badge.tsx                     # Status indicators
├── Avatar.tsx                    # User profile images
├── Loading.tsx                   # Spinners, skeletons
├── EmptyState.tsx                # No data states
└── ErrorBoundary.tsx             # Error handling
```

### **2. Layout Components**
```typescript
// src/components/layout/
├── Sidebar.tsx                   # Navigation sidebar
├── Header.tsx                    # Top navigation bar
├── Breadcrumbs.tsx               # Navigation breadcrumbs
├── PageHeader.tsx                # Page titles and actions
├── Tabs.tsx                      # Tabbed navigation
├── Pagination.tsx                # Page navigation
└── Footer.tsx                    # Page footer
```

### **3. Admin Components**
```typescript
// src/components/admin/
├── UserManagement/
│   ├── UserList.tsx
│   ├── UserForm.tsx
│   ├── RoleSelector.tsx
│   └── BulkActions.tsx
├── DepartmentManagement/
│   ├── DepartmentList.tsx
│   ├── DepartmentForm.tsx
│   ├── PermissionMatrix.tsx
│   └── MemberAssignment.tsx
├── Dashboard/
│   ├── MetricsCards.tsx
│   ├── ActivityFeed.tsx
│   ├── Charts.tsx
│   └── Reports.tsx
└── Audit/
    ├── AuditLog.tsx
    ├── SecurityEvents.tsx
    └── ComplianceReports.tsx
```

### **4. Staff Components**
```typescript
// src/components/staff/
├── MemberManagement/
│   ├── MemberList.tsx
│   ├── MemberProfile.tsx
│   ├── AssignmentTools.tsx
│   └── CommunicationLog.tsx
├── ApplicationProcessing/
│   ├── ApplicationList.tsx
│   ├── ApplicationForm.tsx
│   ├── ApprovalWorkflow.tsx
│   └── DocumentCollector.tsx
├── Calculator/
│   ├── CalculatorSelector.tsx
│   ├── InputForm.tsx
│   ├── ResultsDisplay.tsx
│   └── SaveCalculation.tsx
└── Collaboration/
    ├── StaffChat.tsx
    ├── SharedNotes.tsx
    ├── FileSharing.tsx
    └── ActivityFeed.tsx
```

### **5. Member Components**
```typescript
// src/components/member/
├── Profile/
│   ├── ProfileForm.tsx
│   ├── QualificationStatus.tsx
│   └── Preferences.tsx
├── Applications/
│   ├── ApplicationList.tsx
│   ├── NewApplication.tsx
│   ├── ApplicationTracker.tsx
│   └── DocumentUpload.tsx
├── Financial/
│   ├── PortfolioOverview.tsx
│   ├── CalculatorAccess.tsx
│   └── FinancialGoals.tsx
└── Communication/
    ├── StaffContact.tsx
    ├── MessageCenter.tsx
    └── SupportChat.tsx
```

---

## 🔄 COMPONENT PATTERNS

### **1. Server Components (Default)**
```typescript
// Server component for data fetching and SEO
export default async function UserList() {
  const users = await getUsers(); // Server-side data fetching

  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### **2. Client Components (Selective)**
```typescript
'use client';

import { useState } from 'react';

export function UserForm({ onSubmit }: UserFormProps) {
  const [formData, setFormData] = useState(initialData);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Interactive form elements */}
    </form>
  );
}
```

### **3. Custom Hooks**
```typescript
// src/lib/hooks/usePermissions.ts
export function usePermissions() {
  const { user } = useAuth();

  const canViewPage = (pagePath: string) => {
    return user?.departments?.some(dept =>
      departmentPermissions[dept]?.[pagePath]?.canView
    );
  };

  const canEditResource = (resourceType: string, resourceId: string) => {
    // Permission checking logic
  };

  return { canViewPage, canEditResource };
}
```

### **4. Context Providers**
```typescript
// src/lib/auth/AuthContext.tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 🎨 STYLING ARCHITECTURE

### **1. Design System**
```css
/* src/styles/variables.css */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  --border-radius-sm: 0.25rem;
  --border-radius-md: 0.375rem;
  --border-radius-lg: 0.5rem;
}
```

### **2. Component Styles**
```typescript
// src/components/ui/Button.tsx
import styles from './Button.module.css';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick
}: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### **3. Tailwind Integration**
```typescript
// Utility-first approach with custom components
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {children}
    </div>
  );
}
```

---

## 🔄 DATA FLOW PATTERNS

### **1. Server State Management**
```typescript
// Server component with data fetching
export default async function Dashboard() {
  const [metrics, applications] = await Promise.all([
    getDashboardMetrics(),
    getRecentApplications()
  ]);

  return (
    <div>
      <MetricsCards metrics={metrics} />
      <ApplicationList applications={applications} />
    </div>
  );
}
```

### **2. Client State Management**
```typescript
'use client';

export function ApplicationForm() {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = async () => {
    try {
      await submitApplication(formData);
      router.push('/applications');
    } catch (error) {
      setErrors(error.validationErrors);
    }
  };

  return <Form data={formData} errors={errors} onSubmit={handleSubmit} />;
}
```

### **3. Real-time Updates**
```typescript
'use client';

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('activities')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_activity'
      }, (payload) => {
        setActivities(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, []);

  return <ActivityList activities={activities} />;
}
```

---

## 🧪 TESTING STRATEGY

### **1. Component Testing (Vitest + React Testing Library)**
```typescript
// src/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### **2. Integration Testing (Playwright)**
```typescript
// e2e/application-workflow.spec.ts
test('complete application submission', async ({ page }) => {
  await page.goto('/applications/new');

  await page.fill('[data-testid="member-select"]', 'John Doe');
  await page.fill('[data-testid="amount-input"]', '50000');
  await page.click('[data-testid="submit-button"]');

  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

---

## 🚀 PERFORMANCE OPTIMIZATIONS

### **1. Code Splitting**
```typescript
// Dynamic imports for heavy components
const HeavyCalculator = dynamic(() => import('./HeavyCalculator'), {
  loading: () => <LoadingSpinner />
});
```

### **2. Image Optimization**
```typescript
import Image from 'next/image';

export function OptimizedAvatar({ src, alt }: AvatarProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={40}
      height={40}
      className="rounded-full"
      priority
    />
  );
}
```

### **3. Caching Strategies**
```typescript
// ISR for dynamic content
export const revalidate = 3600; // Revalidate every hour

// Static generation with revalidation
export async function generateStaticParams() {
  const departments = await getDepartments();
  return departments.map(dept => ({ id: dept.id }));
}
```

---

## 📋 IMPLEMENTATION PHASES

### **Phase 1: Foundation Components**
- [ ] Create base UI component library
- [ ] Set up layout components and navigation
- [ ] Implement authentication components
- [ ] Create error boundaries and loading states

### **Phase 2: Role-Specific Components**
- [ ] Build admin dashboard components
- [ ] Create staff workspace components
- [ ] Develop member portal components
- [ ] Implement cross-role shared components

### **Phase 3: Advanced Features**
- [ ] Add real-time components
- [ ] Implement AI-powered components
- [ ] Create integration components
- [ ] Build advanced form components

### **Phase 4: Optimization & Testing**
- [ ] Performance optimization
- [ ] Comprehensive component testing
- [ ] Accessibility improvements
- [ ] Cross-browser compatibility

---

## 🎯 COMPONENT PRINCIPLES

### **1. Reusability**
- Components should be generic and configurable
- Avoid role-specific logic in shared components
- Use composition over inheritance

### **2. Performance**
- Prefer server components when possible
- Lazy load heavy components
- Optimize re-renders with proper memoization

### **3. Accessibility**
- Semantic HTML elements
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility

### **4. Maintainability**
- Clear component APIs with TypeScript
- Comprehensive documentation
- Consistent naming conventions
- Separation of concerns

---

**This component architecture provides a scalable, maintainable foundation for Donum 2.1, leveraging modern React patterns and Next.js 15+ capabilities for optimal performance and developer experience.**