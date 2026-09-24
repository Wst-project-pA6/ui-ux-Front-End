Redesign and optimize the existing WST application's mobile experience from the ground up while preserving all existing functionality, routes, data, design tokens, visual identity, and desktop/tablet layouts.

IMPORTANT:
The current mobile interface looks like a compressed desktop layout. Do NOT simply scale down or shrink the desktop UI.

Create a true mobile-first responsive experience designed specifically for smartphone screens.

The redesign must be polished, modern, minimal, highly usable, visually balanced, and production-ready.

==================================================
1. MOBILE BREAKPOINTS
==================================================

Optimize the application for:

390px — primary mobile target
360px — small mobile
430px — large mobile

The layout must adapt fluidly between these widths.

Do not use fixed desktop-width containers on mobile.

Do not allow accidental horizontal page scrolling.

==================================================
2. CRITICAL CURRENT PROBLEMS TO FIX
==================================================

The current mobile version has these problems:

- Desktop sidebar consumes too much horizontal space.
- Main content becomes too narrow.
- KPI cards are compressed and difficult to scan.
- Text wraps unnecessarily inside cards.
- Date and header content become cramped.
- Tables are difficult to use on small screens.
- Navigation takes too much space.
- Content hierarchy is weak.
- Important actions are not prioritized properly.
- Large desktop spacing does not translate correctly to mobile.
- Some controls appear too close together.
- Information density is too high in certain areas.
- The page feels like a scaled desktop dashboard instead of a native mobile application.

Fix all of these issues.

==================================================
3. MOBILE APPLICATION SHELL
==================================================

Replace the persistent desktop sidebar on mobile.

Do NOT show the full sidebar permanently.

Use one of these patterns:

Primary:
Compact top header + mobile navigation drawer

Or:
Compact top header + bottom navigation for the most important destinations.

Recommended mobile structure:

Top Header:
- Hamburger / menu
- WST logo
- Current page title
- Notifications
- User avatar

Main Content:
- Full available width
- 16px horizontal padding
- Vertical content flow

Navigation:
- Hidden by default
- Opens as a drawer/sheet when the menu button is clicked

The drawer must contain:

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
AI Insights
Settings

Do not show the complete desktop sidebar permanently on mobile.

==================================================
4. MOBILE HEADER
==================================================

Create a compact mobile header.

Use:

Left:
Menu button

Center:
Page title or WST branding

Right:
Notification icon
User avatar

Header height:
56–64px

Keep the header visually clean.

Do not overcrowd it.

==================================================
5. DASHBOARD MOBILE REDESIGN
==================================================

Rebuild the Dashboard specifically for mobile.

Do NOT place four KPI cards in one row.

Use a single-column or intelligently stacked layout.

Recommended order:

1. Welcome / page header
2. Priority alerts
3. Active Jobs KPI
4. Ready for Delivery KPI
5. Low Stock KPI
6. Training Today KPI
7. Job Pipeline
8. Recent Jobs
9. Upcoming Training
10. Technician / Bay utilization

KPI cards must:

- Use full available width
- Have compact but comfortable height
- Keep the number visually dominant
- Keep supporting text readable
- Avoid unnecessary icons or decorative content
- Use Auto Layout

==================================================
6. KPI CARD MOBILE DESIGN
==================================================

Create a reusable responsive KPI Card component.

Desktop:
4-column layout when space allows.

Tablet:
2-column layout.

Mobile:
1-column layout.

Inside each card:

Label
Large value
Short supporting text
Optional trend/status

Keep the hierarchy:

Label
↓
Value
↓
Supporting information

Do not allow long text to destroy card proportions.

==================================================
7. MOBILE JOB PIPELINE
==================================================

Do not use a wide desktop Kanban board on mobile.

Instead, convert the Job Pipeline into:

Option A:
Horizontal status selector + vertical job list

OR

Option B:
Scrollable status chips + stacked job cards

Statuses:

Received
In Progress
Quality Check
Ready
Delivered

Each mobile job card should show:

Job Number
Customer
Vehicle
Status
Priority
Expected Date
Technician

Use progressive disclosure.

Show the most important information first.

==================================================
8. MOBILE TABLES
==================================================

Never force large desktop tables into narrow screens.

For Customers, Inventory, Purchasing, Reports and similar screens:

Convert tables into responsive cards on mobile.

Example:

Customer Card:

Customer
Phone
Vehicles
Last Service
Status
View Details

Inventory Card:

Part
SKU
Stock
Reserved
Minimum
Status
Action

Purchase Order Card:

PO Number
Vendor
Amount
Approval Status
Date
Action

Avoid unnecessary horizontal scrolling.

Use horizontal scrolling only when the data truly requires tabular presentation.

==================================================
9. MOBILE FORMS
==================================================

All forms must become single-column on mobile.

Inputs:

- Full width
- Comfortable height
- Clear labels
- Proper spacing
- Large touch targets
- Visible error states

Form structure:

Label
Input
Helper/Error

Do not place multiple unrelated inputs side by side on small screens.

For example:

Customer Name
Phone
Email
City

should each occupy its own row.

==================================================
10. MOBILE JOB CARD DETAILS
==================================================

Reorganize Job Card Details into mobile sections.

Order:

Job Header
Customer
Vehicle
Current Status
Customer Approval
Work Checklist
Labor
Parts
Evidence
Timeline
Actions

Use collapsible sections where appropriate.

Keep critical actions easily accessible.

Primary actions:

Start Work
Add Labor
Issue Part
Upload Evidence
Send to Quality Check
Mark Ready
Deliver Vehicle

Do not show all actions with equal visual weight.

Use a clear primary action hierarchy.

==================================================
11. STICKY MOBILE ACTIONS
==================================================

For critical workflows, use an appropriate sticky bottom action area.

Example:

Primary Action
+
Secondary Action

The sticky action area must not cover content.

Add sufficient bottom padding to the page.

==================================================
12. INVENTORY MOBILE
==================================================

Redesign Inventory specifically for mobile.

Top:

Search
Filter
Stock Status

Then show responsive part cards.

Each card:

Part Name
SKU
On Hand
Reserved
Minimum
Status
Reorder Suggestion

Low Stock must be immediately understandable.

Do not make the user open several screens to discover stock status.

==================================================
13. PURCHASING MOBILE
==================================================

Create mobile-friendly Purchase Order cards.

Show:

Vendor
PO Number
Total
Approval State
Required Approvals
Date

High-value orders must clearly show:

Two approvals required

Use a visual but accessible warning treatment.

==================================================
14. TRAINING MOBILE
==================================================

Create a mobile-first training experience.

Training sessions should use cards instead of desktop-heavy tables.

Session Card:

Course
Date
Time
Bay
Mentor
Group
Capacity
Conflict status

Provide clear conflict messages.

Students should easily access:

My Sessions
Attendance
Tasks
Assessments
Competencies
Certificate

==================================================
15. ASSESSMENT MOBILE
==================================================

Make assessments easy to complete on a phone.

Use:

Student header
Task information
Attendance
Result selector
Time on Task
Mentor Note
Evidence Upload
Supervisor Sign-off

Use large touch-friendly controls.

Assessment options:

Pass
Fail
Needs Improvement

Unsigned assessments must clearly show:

Pending Sign-off

==================================================
16. ARABIC MOBILE RTL
==================================================

The mobile redesign must fully support Arabic RTL.

When Arabic is selected:

- Entire mobile layout becomes RTL
- Header layout mirrors
- Navigation drawer mirrors
- Cards mirror where appropriate
- Forms mirror
- Buttons align correctly
- Lists mirror
- Icons with directional meaning mirror
- Content hierarchy remains unchanged

Do not simply right-align English text.

Use real RTL layout behavior.

Keep these values readable in LTR:

Job Numbers
VINs
Vehicle Plates
SKUs
Internal IDs
Phone numbers where appropriate
Numeric amounts

Arabic interface examples:

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
17. MOBILE LANGUAGE SWITCHER
==================================================

The existing English/Arabic language switcher must remain functional.

When Arabic is selected:

English → Arabic
LTR → RTL

When English is selected:

Arabic → English
RTL → LTR

Do not lose current page state.

The language change must not reset the user journey.

==================================================
18. RESPONSIVE COMPONENT SYSTEM
==================================================

Do not create separate unrelated mobile components unless necessary.

Reuse the existing component system.

Create responsive component behavior for:

Button
Input
Select
Badge
Card
KPI Card
Job Card
Vehicle Card
Table/Card
Sidebar
Mobile Navigation
Modal
Drawer
Toast
Filter Bar

Use:

Auto Layout
Component Variants
Component Properties
Constraints
Fill Container
Hug Contents
Min/Max Width

==================================================
19. MOBILE SPACING
==================================================

Use a consistent mobile spacing system.

Primary values:

8px
12px
16px
20px
24px
32px

Recommended page padding:

16px

Recommended section spacing:

24px

Recommended card padding:

16–20px

Avoid excessive empty space on small screens.

==================================================
20. TOUCH TARGETS
==================================================

Interactive elements must be comfortable for touch interaction.

Buttons, icons, navigation items and form controls must have sufficiently large hit areas.

Do not make tiny icon-only buttons unless the action is obvious and accessible.

==================================================
21. VISUAL HIERARCHY
==================================================

Improve the visual hierarchy of the mobile interface.

Prioritize:

1. Primary action
2. Current status
3. Critical alerts
4. Main information
5. Secondary information
6. Additional details

Use typography, spacing and controlled color to create hierarchy.

Do not rely on excessive colors or shadows.

==================================================
22. MOBILE VISUAL AESTHETICS
==================================================

Make the mobile UI feel:

- Modern
- Premium
- Clean
- Professional
- Lightweight
- Spacious
- Consistent

Improve:

- Card proportions
- Typography
- Alignment
- Whitespace
- Icon placement
- Button hierarchy
- Status visibility
- Content grouping
- Section hierarchy

Avoid:

- Excessive shadows
- Heavy gradients
- Over-decoration
- Crowded dashboards
- Tiny typography
- Excessive borders

==================================================
23. ACCESSIBILITY
==================================================

Ensure:

- Strong contrast
- Clear focus states
- Readable text
- Clear labels
- Touch-friendly controls
- Status is not communicated by color alone
- Errors are explicit
- Loading states are understandable
- Empty states are useful

==================================================
24. PERFORMANCE-ORIENTED UI
==================================================

Optimize the interface for perceived mobile performance.

Prioritize:

- Lightweight visual hierarchy
- Minimal unnecessary decoration
- Compact repeated components
- Efficient information density
- Clear loading placeholders
- Avoid excessive simultaneous content
- Progressive disclosure for secondary information

Do not sacrifice usability for visual complexity.

==================================================
25. DO NOT CHANGE DESKTOP
==================================================

IMPORTANT:

Do not redesign the desktop experience unnecessarily.

Keep the existing desktop visual identity and functionality.

Improve mobile and tablet responsiveness by adapting the existing system.

The mobile design should feel like the same WST product, not a different product.

==================================================
26. PAGE COVERAGE
==================================================

Apply the mobile redesign consistently across:

Login
Dashboard
Customers
Vehicle Details
Job Cards
Job Card Details
Inventory
Purchasing
Training
Assessments
Competencies & Certificate
Reports
AI Insights
Settings / RBAC

==================================================
27. QUALITY CHECK
==================================================

Before finishing, test every important screen at:

390px
360px
430px

Check:

- No horizontal overflow
- No clipped text
- No overlapping elements
- No broken cards
- No unusable tables
- No oversized navigation
- No broken forms
- No tiny touch targets
- No broken sticky actions
- No RTL alignment issues
- No English text accidentally left untranslated in Arabic
- No reversed Job IDs, VINs or SKUs

==================================================
28. FINAL REQUIREMENT
==================================================

Do not simply resize the existing desktop layout.

Rebuild the responsive behavior intelligently.

The final mobile experience should look like a deliberately designed professional mobile application with:

- Clear navigation
- Strong hierarchy
- Comfortable touch interactions
- Responsive Auto Layout
- Reusable components
- Proper states
- Arabic RTL support
- Clean visual design
- No horizontal scrolling
- Consistent WST branding

Preserve all existing application functionality and data.

Do not create a separate mobile website.

Create a true responsive mobile state of the existing WST application.