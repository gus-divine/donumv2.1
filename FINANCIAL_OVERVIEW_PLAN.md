# Financial Overview Page - Implementation Plan

## Overview
The Financial Overview page (`/admin/finance`) should provide administrators with a comprehensive view of the organization's financial health, loan portfolio performance, and payment trends.

---

## 1. Key Metrics Dashboard (Top Section)

### Primary KPIs (Large Cards)
- **Total Loans Outstanding**
  - Sum of `current_balance` for all loans with status `'active'`
  - Display: Large number with currency formatting
  - Trend: Compare to previous period (month/quarter)
  
- **Total Principal Disbursed**
  - Sum of `principal_amount` for all loans (all statuses)
  - Display: Large number with currency formatting
  - Trend: Growth over time
  
- **Total Payments Received**
  - Sum of `amount_paid` from `loan_payments` where `status = 'paid'`
  - Display: Large number with currency formatting
  - Trend: Compare to previous period
  
- **Total Interest Collected**
  - Sum of `total_interest_paid` from all loans OR sum of `interest_amount` from paid payments
  - Display: Large number with currency formatting
  - Trend: Compare to previous period

### Secondary Metrics (Smaller Cards)
- **Active Loans Count**
  - Count of loans with status `'active'`
  
- **Overdue Payments**
  - Count of payments with `status = 'overdue'`
  - Total amount overdue
  
- **Average Loan Size**
  - Average `principal_amount` across all loans
  
- **Collection Rate**
  - Percentage: (Total Paid / Total Due) × 100
  
- **Default Rate**
  - Percentage: (Defaulted Loans / Total Loans) × 100

---

## 2. Revenue & Payment Trends (Charts Section)

### Chart 1: Payment Revenue Over Time
- **Type**: Line chart
- **X-axis**: Time (daily/weekly/monthly - user selectable)
- **Y-axis**: Amount ($)
- **Data**: Sum of `amount_paid` grouped by date from `loan_payments` where `status = 'paid'`
- **Periods**: Last 7 days, 30 days, 90 days, 1 year (dropdown selector)

### Chart 2: Loan Portfolio Growth
- **Type**: Area chart
- **X-axis**: Time (monthly)
- **Y-axis**: Amount ($)
- **Data**: 
  - Total principal disbursed over time (cumulative)
  - Total current balance over time
- **Shows**: Portfolio growth and outstanding balance trends

### Chart 3: Payment Status Distribution
- **Type**: Pie/Donut chart
- **Data**: Count of payments by status
  - Paid
  - Scheduled
  - Overdue
  - Missed
  - Pending
- **Shows**: Overall payment health

### Chart 4: Loan Status Distribution
- **Type**: Bar chart
- **Data**: Count of loans by status
  - Active
  - Paid Off
  - Defaulted
  - Pending
  - Cancelled
- **Shows**: Portfolio composition

---

## 3. Recent Activity & Alerts

### Upcoming Payments (Next 7 Days)
- **Table**: List of payments due in next 7 days
- **Columns**: 
  - Loan Number
  - Borrower Name
  - Due Date
  - Amount Due
  - Status
- **Action**: Link to loan detail page
- **Highlight**: Overdue payments in red

### Overdue Payments Alert
- **Card**: Red alert banner if overdue payments exist
- **Shows**: Count and total amount overdue
- **Action**: Link to filtered loans list (overdue filter)

### Recent Payments (Last 10)
- **Table**: Most recent payments received
- **Columns**:
  - Date Paid
  - Loan Number
  - Borrower Name
  - Amount Paid
  - Payment Method
- **Action**: Link to loan detail page

---

## 4. Loan Performance Metrics

### Portfolio Health Score
- **Card**: Visual score (0-100)
- **Factors**:
  - Collection rate
  - Default rate
  - Average days to payment
  - Overdue percentage
- **Color coding**: Green (80+), Yellow (60-79), Red (<60)

### Average Days to Payment
- **Metric**: Average days between due date and paid date
- **Shows**: Payment timeliness

### Payment Frequency Breakdown
- **Chart**: Bar chart
- **Data**: Count of loans by `payment_frequency`
  - Monthly
  - Quarterly
  - Annually

---

## 5. Department Financial Breakdown (If Applicable)

### By Department
- **Table/Cards**: Financial metrics per department
- **Columns**:
  - Department Name
  - Active Loans Count
  - Total Outstanding
  - Total Collected
  - Collection Rate
- **Action**: Filter loans by department

---

## 6. Date Range & Filters

### Date Range Selector
- **Options**: 
  - Today
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - Last year
  - Custom range (date picker)
- **Applies to**: All charts and metrics

### Additional Filters
- **Loan Status**: Filter by loan status
- **Department**: Filter by department
- **Plan**: Filter by plan code
- **Staff**: Filter by assigned staff

---

## 7. Export & Reporting

### Export Options
- **Export to PDF**: Generate financial report PDF
- **Export to Excel**: Download data as spreadsheet
- **Email Report**: Send report via email

### Report Types
- **Summary Report**: Key metrics overview
- **Detailed Report**: Full financial breakdown
- **Payment Report**: Payment history and trends
- **Loan Report**: Loan portfolio analysis

---

## 8. Quick Actions

### Action Buttons
- **View All Loans**: Navigate to `/admin/loans`
- **View Overdue**: Navigate to `/admin/loans?status=overdue`
- **Record Payment**: Quick payment entry (modal)
- **Generate Report**: Open report generator

---

## Technical Implementation Notes

### Data Queries Needed

1. **Total Loans Outstanding**
   ```sql
   SELECT SUM(current_balance) 
   FROM loans 
   WHERE status = 'active'
   ```

2. **Total Payments Received**
   ```sql
   SELECT SUM(amount_paid) 
   FROM loan_payments 
   WHERE status = 'paid'
   ```

3. **Payment Revenue Over Time**
   ```sql
   SELECT DATE(paid_date) as date, SUM(amount_paid) as total
   FROM loan_payments
   WHERE status = 'paid' AND paid_date >= ?
   GROUP BY DATE(paid_date)
   ORDER BY date
   ```

4. **Upcoming Payments**
   ```sql
   SELECT lp.*, l.loan_number, da.first_name, da.last_name
   FROM loan_payments lp
   JOIN loans l ON lp.loan_id = l.id
   JOIN donum_accounts da ON l.applicant_id = da.id
   WHERE lp.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
   AND lp.status IN ('scheduled', 'pending', 'overdue')
   ORDER BY lp.due_date
   ```

### Components Needed

1. **FinancialMetricsCard** - Reusable metric card component
2. **RevenueChart** - Line chart for payment trends
3. **PortfolioChart** - Area chart for portfolio growth
4. **StatusDistributionChart** - Pie/donut chart for status breakdown
5. **UpcomingPaymentsTable** - Table component for upcoming payments
6. **RecentPaymentsTable** - Table component for recent payments
7. **DateRangeSelector** - Date range picker component
8. **ExportButton** - Export functionality component

### Libraries Needed
- **Charting**: Consider `recharts` or `chart.js` for React
- **Date handling**: `date-fns` or `dayjs`
- **Export**: `jspdf` for PDF, `xlsx` for Excel

---

## Priority Implementation Order

### Phase 1: Core Metrics (MVP)
1. ✅ Total Loans Outstanding
2. ✅ Total Payments Received
3. ✅ Total Principal Disbursed
4. ✅ Active Loans Count
5. ✅ Overdue Payments Alert

### Phase 2: Charts & Trends
1. ✅ Payment Revenue Over Time (line chart)
2. ✅ Payment Status Distribution (pie chart)
3. ✅ Loan Status Distribution (bar chart)

### Phase 3: Tables & Lists
1. ✅ Upcoming Payments Table
2. ✅ Recent Payments Table

### Phase 4: Advanced Features
1. ⏳ Portfolio Growth Chart
2. ⏳ Department Breakdown
3. ⏳ Export Functionality
4. ⏳ Custom Date Ranges
5. ⏳ Advanced Filtering

---

## UI/UX Considerations

### Layout
- **Top Section**: 4 large KPI cards in a grid (2x2 or 4 columns)
- **Middle Section**: Charts in a grid (2x2)
- **Bottom Section**: Tables side-by-side or stacked
- **Sidebar**: Filters and date range selector

### Styling
- Match existing admin page styling
- Use consistent color scheme (var(--core-blue), var(--core-gold))
- Responsive design (mobile-friendly)
- Loading states for all data fetching
- Error handling with user-friendly messages

### Performance
- Cache financial calculations where possible
- Lazy load charts (only render when visible)
- Paginate large tables
- Debounce date range changes

---

## Success Metrics

### User Goals
- ✅ Quickly see financial health at a glance
- ✅ Identify overdue payments and issues
- ✅ Track payment trends over time
- ✅ Export reports for stakeholders

### Technical Goals
- ✅ Page loads in < 2 seconds
- ✅ Charts render smoothly
- ✅ Data updates in real-time (or near real-time)
- ✅ Mobile-responsive design

---

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live financial data
2. **Forecasting**: Predictive analytics for future revenue
3. **Comparisons**: Compare periods (this month vs last month)
4. **Drill-down**: Click charts to see detailed breakdowns
5. **Custom Dashboards**: User-configurable dashboard layouts
6. **Alerts**: Email/SMS notifications for overdue payments
7. **Integration**: Connect with accounting software (QuickBooks, etc.)
