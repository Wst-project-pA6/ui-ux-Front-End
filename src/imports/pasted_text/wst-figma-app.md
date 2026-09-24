Create a complete, production-ready, editable Figma-native web application for:

"WST — Workshop Management & Student Practical Training"

IMPORTANT:
Build this as a complete editable Figma-native web application.
Prioritize real editable UI structure, reusable components, Auto Layout,
responsive behavior, component variants, design tokens, consistent spacing,
proper constraints, and professional layer organization.

Do NOT create a static visual mockup.
Do NOT create only a landing page.
Do NOT create disconnected screens.
Do NOT stop after creating the first few screens.

Build the complete application and all requested pages using one consistent
design system, navigation system, component library, and interaction pattern.

==================================================
1. PRODUCT OVERVIEW
==================================================

WST is a Workshop Management and Student Practical Training platform.

The application manages:

- Customers
- Vehicles
- Job Cards
- Technicians
- Workshop Bays
- Labor
- Spare Parts
- Inventory
- Vendors
- Purchasing
- Purchase Orders
- Approvals
- Goods Receipts
- Invoices
- Training Courses
- Training Sessions
- Mentors
- Students
- Attendance
- Practical Tasks
- Assessments
- Competencies
- Certificates
- Reports
- AI/Data Advisory Insights

The platform combines workshop operations and student practical training
within one controlled system.

==================================================
2. DESIGN DIRECTION
==================================================

Create a clean, minimal, modern and professional enterprise SaaS interface.

Visual style:

- Professional
- Simple
- Minimal
- Spacious
- Data-driven
- Modern
- Highly readable
- Enterprise-ready
- Suitable for workshop management and university training

Avoid:

- Excessive gradients
- Excessive shadows
- Glassmorphism
- Overly decorative elements
- Excessive colors
- Unnecessary illustrations
- Crowded layouts

Use a restrained professional color system:

Primary:
#2563EB

Dark:
#0F172A

Background:
#F8FAFC

Surface:
#FFFFFF

Border:
#E2E8F0

Primary Text:
#0F172A

Secondary Text:
#64748B

Success:
#16A34A

Warning:
#D97706

Error:
#DC2626

Info:
#0284C7

Use colors mainly for hierarchy, actions, states and feedback.

==================================================
3. TYPOGRAPHY
==================================================

Use Inter as the primary font.

Typography:

Display:
40px / Bold

Page Title:
32px / Bold

Section Title:
24px / Semi Bold

Card Title:
18px / Semi Bold

Body:
14–16px / Regular

Caption:
12–13px / Regular

Button:
14px / Semi Bold

Maintain strong visual hierarchy and readability.

==================================================
4. DESIGN TOKENS
==================================================

Create reusable design tokens/styles for:

Colors
Typography
Spacing
Border radius
Borders
Shadows
Grid
Components

Use an 8px spacing system:

4
8
12
16
24
32
40
48
64

Border radius:

8px
10px
12px
16px
20px

==================================================
5. RESPONSIVE DESIGN
==================================================

The application MUST support:

Desktop:
1440px

Tablet:
1024px

Mobile:
390px

Desktop:
- 12-column grid
- Persistent sidebar
- Flexible content area
- Four KPI cards when appropriate

Tablet:
- 8-column grid
- Collapsible sidebar
- Reflow content
- Two-column KPI cards

Mobile:
- 4-column grid
- Sidebar becomes mobile navigation/menu
- Single-column content
- Cards stack vertically
- Forms become single column
- Tables transform into responsive cards or controlled horizontal scrolling
- Buttons become full width when appropriate

Use real responsive behavior.

Do not simply scale the desktop screen down.

Use:

- Auto Layout
- Fill Container
- Hug Contents
- Min/Max Width
- Responsive Constraints
- Component properties
- Variants

==================================================
6. FIGMA-NATIVE STRUCTURE
==================================================

Create real editable Figma-native objects.

Use:

Frames
Sections
Components
Component Sets
Variants
Instances
Auto Layout
Constraints
Styles
Variables/Tokens where appropriate

Every reusable UI element should be a Component.

Every repeated state should use Variants instead of duplicated designs.

Do not leave random unnamed layers such as:

Frame 123
Group 45
Rectangle 19

Use meaningful layer names.

==================================================
7. COMPONENT LIBRARY
==================================================

Create a dedicated page:

"00 — Design System"

Build these reusable components:

BUTTONS

Button / Primary
Button / Secondary
Button / Tertiary
Button / Destructive
Button / Disabled
Button / Loading

Variants:

Default
Hover
Pressed
Focus
Disabled
Loading

INPUTS

Input / Text
Input / Search
Input / Password
Input / Number
Input / Date
Input / Select
Input / Textarea

States:

Default
Focus
Filled
Error
Disabled

STATUS BADGES

Received
In Progress
Quality Check
Ready
Delivered
Pending
Approved
Rejected
Low Stock
Pass
Fail
Needs Improvement

CARDS

Card / KPI
Card / Job
Card / Vehicle
Card / Training
Card / Student
Card / Alert
Card / Data

NAVIGATION

Navigation / Sidebar
Navigation / Topbar
Navigation / Breadcrumb
Navigation / Tabs
Navigation / Mobile

TABLES

Table / Header
Table / Row
Table / Selected
Table / Empty
Table / Loading

OTHER COMPONENTS

Modal
Drawer
Dropdown
Tooltip
Toast
Pagination
Filter Bar
Date Picker
File Upload
Avatar
User Menu
Confirmation Dialog
Empty State
Error State
Loading State

All major components must use Auto Layout.

==================================================
8. APPLICATION SHELL
==================================================

Create a reusable application shell consisting of:

Sidebar
Top Navigation
Page Header
Content Area

Sidebar navigation:

Dashboard
Customers
Vehicles
Job Cards
Inventory
Purchasing
Training
Assessments
Competencies
Reports
Settings

Bottom of sidebar:

User Profile
Role
Language Switcher
Logout

The shell must be reusable across all authenticated pages.

==================================================
9. PAGE 01 — LOGIN
==================================================

Create a professional authentication screen.

Desktop:
Two-column layout.

Left:
WST branding
Product description
Short supporting text

Right:
Login card

Include:

Logo
Email
Password
Remember Me
Forgot Password
Sign In
Language Selector

Languages:

English
العربية

Mobile:
Single-column centered layout.

==================================================
10. PAGE 02 — DASHBOARD
==================================================

Create a professional workshop operational dashboard.

Header:

Dashboard
Date
Notifications
User Profile

KPI Cards:

Active Jobs
Ready for Delivery
Low Stock Items
Training Sessions Today

Job Pipeline:

Received
In Progress
Quality Check
Ready
Delivered

Show counts and visual progress.

Alerts & Actions:

Low Stock Alerts
Pending Approvals
Training Conflicts
Jobs Requiring Attention

Additional sections:

Technician Utilization
Bay Utilization
Recent Jobs
Upcoming Training Sessions

==================================================
11. PAGE 03 — CUSTOMERS
==================================================

Create:

Customer List
Search
Filters
Add Customer

Table:

Customer
Phone
Vehicles
Last Service
Status
Actions

Customer Details:

Contact Information
Vehicles
Service History
Reminders

==================================================
12. PAGE 04 — VEHICLE DETAILS
==================================================

Show:

Plate
VIN
Make
Model
Year
Mileage
Customer
Status

Sections:

Service History
Completed Jobs
Next Service
Service Reminders

==================================================
13. PAGE 05 — JOB CARDS
==================================================

Create job management.

Views:

Kanban
Table

Pipeline:

Received
In Progress
Quality Check
Ready
Delivered

Filters:

Priority
Technician
Bay
Date
Status

Each Job Card shows:

Job Number
Customer
Vehicle
Technician
Priority
Status
Expected Date

==================================================
14. PAGE 06 — JOB CARD DETAILS
==================================================

Create a detailed Job Card screen.

Sections:

Customer
Vehicle
Complaint
Mileage
Service Type
Priority
Expected Date
Bay
Technician

Work Checklist

Photos / Evidence

Customer Approval

Labor Entries

Parts Issued

Timeline

Status History

Actions:

Start Work
Add Labor
Issue Part
Upload Evidence
Send to Quality Check
Mark Ready
Deliver Vehicle

IMPORTANT BUSINESS RULES:

Billable work cannot start before customer approval.

Invoice values must be derived from logged labor and issued parts.

Do not use manually typed invoice totals as the primary source.

==================================================
15. PAGE 07 — INVENTORY
==================================================

Create Inventory Management.

Include:

Parts Catalog
Search
Category Filter
Store Filter
Stock Status

Table:

SKU
Part
Category
Vehicle Compatibility
Store
On Hand
Reserved
Minimum
Maximum
Average Cost
Status

Statuses:

Healthy
Low Stock
Out of Stock

Include:

Reorder Suggestion

Clearly communicate that reorder suggestions are advisory and do not
automatically place purchase orders.

==================================================
16. PAGE 08 — PURCHASING
==================================================

Create:

Vendors
Purchase Requests
Purchase Orders
Approvals
Goods Receipts

Purchase Order:

Vendor
Items
Quantity
Unit Cost
Total
Approval Status
Approvers

High-value orders must visually indicate that two approvals are required.

Goods Receipt:

Expected Quantity
Accepted Quantity
Rejected Quantity
Receipt Status

==================================================
17. PAGE 09 — TRAINING
==================================================

Create:

Courses
Training Sessions
Bays
Mentors
Groups
Students
Capacity

Training Calendar.

Show:

Bay Conflicts
Mentor Conflicts
Capacity Conflicts

Conflict messages must clearly explain why a session cannot be published.

==================================================
18. PAGE 10 — ASSESSMENT
==================================================

Create student assessment.

Show:

Student
Course
Session
Practical Task

Attendance:

Present
Absent
Late

Assessment:

Pass
Fail
Needs Improvement

Additional fields:

Time on Task
Mentor Note
Evidence Upload
Supervisor Sign-off

Unsigned assessments must show:

Pending Sign-off

Unsigned assessments must NOT count toward certification.

==================================================
19. PAGE 11 — COMPETENCIES & CERTIFICATE
==================================================

Create competency tracking.

Show:

Required Competencies
Completed Competencies
Pending Competencies
Completion Percentage

Certificate states:

Not Eligible
Pending
Eligible
Issued
Revoked

Show certificate verification information.

==================================================
20. PAGE 12 — REPORTS
==================================================

Create professional analytics.

Workshop:

Jobs by Stage
Turnaround Time
Rework
Labor Hours
Bay Utilization
Technician Utilization

Inventory:

Stock Accuracy
Stockouts
Inventory Turnover
Purchase Lead Time

Training:

Attendance
Assessment Completion
Pass Rate
Needs Improvement
Competency Coverage
Certificates Issued

Use clean readable charts.

==================================================
21. PAGE 13 — AI / DATA INSIGHTS
==================================================

Create an advisory AI/Data Insights page.

Sections:

Parts Demand
Training Completion Risk

Every insight must display:

Prediction
Reason
Baseline
Confidence / Status
Data Availability
Human Override

Example:

Low Stock Risk

Reason:
Weekly consumption exceeds available stock.

Recommendation:
Review reorder quantity.

AI must remain advisory.

Do not make autonomous purchasing, grading or operational decisions.

==================================================
22. PAGE 14 — ARABIC RTL
==================================================

Create Arabic RTL versions of the critical MVP screens.

Use true RTL.

Mirror:

Sidebar
Navigation
Cards
Forms
Tables
Buttons
Alignment

However, keep these identifiers readable in LTR:

Job Number
VIN
Plate
SKU
Amounts

Arabic navigation:

لوحة التحكم
العملاء
المركبات
أوامر العمل
المخزون
المشتريات
التدريب
التقييمات
الكفاءات
التقارير
الإعدادات

==================================================
23. PAGE 15 — SETTINGS & RBAC
==================================================

Create Settings and Role-Based Access Control.

Roles:

Workshop Manager
Service Advisor
Technician
Quality Checker
Storekeeper
Procurement
Training Supervisor
Mentor
Student
Finance Viewer
Auditor

Create a Permission Matrix.

Permissions:

View
Create
Edit
Approve
Delete
Sign-off
Export

Make role boundaries visually clear.

==================================================
24. UX STATES
==================================================

Every important screen must include appropriate:

Loading State
Empty State
Error State
Success State
Confirmation State

Forms must include:

Required Fields
Validation
Error Messages
Success Feedback

Destructive actions require confirmation.

Never rely only on color to communicate status.

==================================================
25. ACCESSIBILITY
==================================================

Ensure:

Readable contrast
Visible focus states
Clear labels
Accessible forms
Comfortable touch targets
Keyboard-friendly interaction
Status represented by text and visual indicator
Clear error messages

==================================================
26. AUTO LAYOUT
==================================================

Apply Auto Layout to:

Navigation
Headers
Cards
Forms
Buttons
Tables
Lists
Modals
Drawers
Page sections

Rules:

Cards:
24px padding

Forms:
16px vertical gap

Buttons:
16–20px horizontal padding
12px vertical padding

Sections:
24–32px spacing

Use:

Fill Container
Hug Contents
Fixed dimensions only where necessary

==================================================
27. COMPONENT NAMING
==================================================

Use professional naming conventions:

Button / Primary
Button / Secondary
Button / Destructive

Input / Text
Input / Search
Input / Password

Card / KPI
Card / Job
Card / Vehicle
Card / Training

Badge / Status / Received
Badge / Status / In Progress

Table / Header
Table / Row

Navigation / Sidebar
Navigation / Topbar

Modal / Confirmation

==================================================
28. FILE ORGANIZATION
==================================================

Create these Pages:

00 — Design System
01 — Login
02 — Dashboard
03 — Customers
04 — Vehicle Details
05 — Job Cards
06 — Job Card Details
07 — Inventory
08 — Purchasing
09 — Training
10 — Assessment
11 — Competencies & Certificate
12 — Reports
13 — AI Insights
14 — Arabic RTL
15 — Settings & RBAC
16 — Prototype Flows

Organize each page with named Sections and Frames.

==================================================
29. PROTOTYPE FLOWS
==================================================

Create clickable prototype flows.

WORKSHOP FLOW:

Login
→ Dashboard
→ Customers
→ Vehicle
→ Create Job
→ Customer Approval
→ Technician
→ Labor / Parts
→ Quality Check
→ Invoice
→ Ready
→ Delivered

INVENTORY FLOW:

Dashboard
→ Inventory
→ Low Stock
→ Reorder Suggestion
→ Purchasing
→ Purchase Order
→ Approval
→ Goods Receipt
→ Stock Updated

TRAINING FLOW:

Dashboard
→ Training
→ Session
→ Students
→ Attendance
→ Assessment
→ Supervisor Sign-off
→ Competency
→ Certificate

Use realistic navigation, buttons, tabs, modals and back navigation.

==================================================
30. FINAL QUALITY CHECK
==================================================

Before finishing, review the entire application.

Check:

- Consistent spacing
- Consistent typography
- Consistent colors
- Reusable Components
- Component Variants
- Auto Layout
- Responsive Constraints
- Desktop layout
- Tablet layout
- Mobile layout
- RTL layout
- Accessibility
- Loading states
- Empty states
- Error states
- Success states
- Prototype connections
- Layer naming
- Design system consistency

Do not create duplicate components unnecessarily.

Do not create disconnected screens.

Do not stop after creating only the Login and Dashboard.

Continue until the complete application is created.

IMPORTANT FINAL REQUIREMENT:

The result must be a polished, editable, Figma-native SaaS product design that can be handed to frontend developers.

It must feel like one coherent product, not a collection of unrelated AI-generated screens.

Prioritize usability, consistency, responsive behavior, reusable components, Auto Layout and professional developer handoff.