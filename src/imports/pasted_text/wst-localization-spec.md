Optimize the existing WST application without rebuilding the project from scratch. Preserve all existing functionality, routes, data structures, navigation, and the current visual identity. Do not remove or break any existing feature.

1. Implement a real language system

Create a functional global language state with:

English = LTR
Arabic = RTL

The language switcher must actually change the application state immediately when clicked.

Do not make the language switcher a visual-only control.

2. Arabic localization

When Arabic is selected, translate all visible and interactive text across the application, including:

Navigation
Page titles
Section titles
Buttons
Form labels
Placeholders
Table headers
Filters
Search fields
Status labels
Notifications
Empty states
Loading states
Error messages
Success messages
Confirmation dialogs
Tooltips
Alerts
Validation messages
Dashboard labels
Reports
AI/Data insights
Settings

Do not leave English UI text mixed into the Arabic interface except for identifiers and technical values that must remain LTR.

3. True RTL layout

When Arabic is active, switch the entire application to a true RTL layout.

Correctly mirror:

Sidebar
Top navigation
Breadcrumbs
Tabs
Forms
Cards
Tables
Filters
Dropdowns
Modals
Drawers
Pagination
Icons where directional meaning requires mirroring
Page-level alignment

Do not simply right-align text. The layout itself must behave as RTL.

4. Preserve LTR identifiers

The following values must remain readable in LTR even inside Arabic:

Job numbers
VINs
Vehicle plates
SKUs
Internal IDs
Reference numbers
Phone numbers where appropriate
Dates/numeric values where necessary
Currency amounts

Do not reverse, reorder, or visually corrupt these values.

5. Global consistency

The English and Arabic versions must represent the same application state.

Arabic must NOT become a separate website or duplicated application.

Switching:

English → Arabic

must preserve:

Current page
Current selected tab
Current filters
Current form state
Current record
Current navigation position

Switching:

Arabic → English

must restore the English LTR presentation without losing the current application state.

6. Responsive RTL

Make sure RTL works correctly at all supported breakpoints:

Desktop: 1440px
Tablet: 1024px
Mobile: 390px

Do not break responsive layouts when RTL is enabled.

Verify:

Sidebar behavior
Mobile navigation
Responsive cards
Responsive tables
Forms
Buttons
Header alignment
Content order
7. Component-level localization

Use the existing reusable component system.

Do not duplicate components just to support Arabic.

Update existing components so that they support:

English / Arabic content
LTR / RTL direction
Different text lengths
Responsive width
Long Arabic labels

Pay special attention to:

Buttons
Inputs
Dropdowns
Tables
Cards
Status badges
Sidebar items
Navigation items
8. Improve visual quality

While preserving the existing design language, improve the overall aesthetics and usability:

Improve visual hierarchy
Improve spacing consistency
Improve alignment
Improve typography hierarchy
Improve card proportions
Improve whitespace
Improve table readability
Improve status visibility
Improve button hierarchy
Improve form clarity
Reduce unnecessary visual noise
Keep the design minimal, modern and professional

Do not introduce excessive gradients, glassmorphism, decorative elements, or unnecessary colors.

9. Preserve the WST design system

Keep the existing:

Colors
Typography
Spacing
Components
Component structure
Navigation patterns
Visual identity

Improve implementation quality without changing the overall product identity.

10. Required application pages

Ensure the language system works consistently across:

Login
Dashboard
Customers
Vehicles
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
11. UX states

Verify that both English and Arabic support:

Loading
Empty
Error
Success
Confirmation
Validation
Disabled
Pending
Warning
12. Job workflow preservation

Do not break the existing job workflow:

Received → In Progress → Quality Check → Ready → Delivered

Preserve all workflow actions and status behavior while localizing their labels.

13. Training workflow preservation

Do not break:

Training → Attendance → Practical Task → Assessment → Supervisor Sign-off → Competency → Certificate

Localize the interface while preserving the workflow logic.

14. Final validation

Before finishing, test all of the following:

English → Arabic
Arabic → English
Desktop LTR
Desktop RTL
Tablet LTR
Tablet RTL
Mobile LTR
Mobile RTL

Confirm that:

No English UI labels remain unintentionally in Arabic.
No Arabic layout elements are visually misaligned.
No identifiers are reversed.
No tables overflow unnecessarily.
No buttons lose their content.
No components break because of Arabic text length.
No existing functionality or navigation is lost.
FINAL REQUIREMENT

Do not rebuild the WST application.
Modify the existing implementation only.
Do not create duplicate pages.
Do not create a separate Arabic website.
Implement Arabic as a true localized RTL state of the existing application and improve the visual polish at the same time.