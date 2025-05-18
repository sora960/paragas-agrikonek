# Plain-Site Functional Test Cases

## Project Information
| Project Name | Plain-Site Farm Management System |
| ------------ | -------------------------------- |
| Reference Document | Project Functional Requirement Specification |
| Created by | QA Team |
| Project Lead | John Smith |
| Date of creation | May 15, 2023 |
| Date of review | May 22, 2023 |

## Test Scenarios

### 1. Authentication

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Enter existing username, correct password and correct URL | Access Plain-Site Website (URL) | Redirects to the Dashboard based on user role | Redirected to the Dashboard based on user role | User is logged in | Login successful for all user roles | Pass |
| 2 | Enter valid username and wrong password | Enter credentials and click Login | Show "Invalid credentials" | "Invalid credentials" error displayed | User remains on login page | Error message displays correctly | Pass |
| 3 | Leave fields blank and click Login | Click Login with empty fields | No login attempt made | Form validation stopped submission | Validation message displayed | "Username and password required" messages shown | Pass |
| 4 | Enter nonexisting username, correct password format | Enter credentials and click Login | Show "Invalid credentials" | "Invalid credentials" error displayed | User remains on login page | Same error shown for security reasons | Pass |

### 2. Farmer Dashboard

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Access Farmer Dashboard | Login as Farmer user | Dashboard loads with farmer-specific widgets | Dashboard loaded with all farmer widgets | Farmer can view their plots and budgets | All dashboard elements load correctly | Pass |
| 2 | View Farm Plots | Click on "My Plots" section | List of all plots assigned to the farmer displays | Plots list displayed with details | Farmer can see their plot details | Plot locations show on map correctly | Pass |
| 3 | Submit Budget Request | Navigate to Budget section and fill request form | Form submits successfully | Form submitted and confirmation shown | Request appears in pending status | Email notification also sent to admin | Pass |
| 4 | View Messages | Click on Messages icon | List of all messages displays | Message list loaded with all messages | Farmer can read messages | Unread messages highlighted correctly | Pass |

### 3. Organization Admin Functions

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Manage Organization Members | Access Members section from Organization Dashboard | List of members displays with status | Members list displayed with correct statuses | Admin can view all organization members | Search and filter functions working | Pass |
| 2 | Approve Member Registration | Select pending member and click Approve | Member status changes to Approved | Status updated to Approved | Member receives access to organization | Email notification sent to member | Pass |
| 3 | Manage Announcements | Create new announcement with all fields filled | Announcement saves and publishes to members | Announcement created and published | Members can view the announcement | Formatting options working correctly | Pass |
| 4 | View Organization Reports | Navigate to Reports section | Reports load with correct data | Reports displayed with accurate data | Admin can export reports | PDF and Excel export working | Pass |

### 4. Regional Admin Functions

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Manage Regional Budget | Access Regional Budget Management page | Budget overview displays with allocation details | Budget overview loaded with correct values | Admin can see regional budget status | Charts display correctly | Pass |
| 2 | Review Farmer Budget Requests | Navigate to Budget Requests tab | List of all farmer budget requests displays | Budget requests list loaded | Admin can process budget requests | Filter by status working correctly | Pass |
| 3 | Approve Budget Request | Select request and click Approve | Request status changes to Approved | Status updated to Approved | Farmer is notified of approval | Email notification sent to farmer | Pass |
| 4 | Generate Regional Reports | Navigate to Reports section and select report type | Report generates with correct data | Report generated with correct data | Admin can export report | Date range filter working correctly | Pass |

### 5. Super Admin Functions

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Manage Users | Access User Management page | List of all system users displays | User list displayed with all information | Admin can search and filter users | Bulk actions working correctly | Pass |
| 2 | Create New Organization | Fill organization creation form and submit | Organization is created successfully | Organization created and confirmation shown | Organization appears in organization list | All required fields validated | Pass |
| 3 | Manage Regions | Access Region Management page | List of all regions displays | Region list displayed correctly | Admin can modify region settings | Map view displays correctly | Pass |
| 4 | System Configuration | Access Settings page | System settings display | Settings page loaded with all options | Admin can modify system parameters | Changes save and apply immediately | Pass |

### 6. Password Recovery

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Request Password Reset | Click "Forgot Password" and enter email | Reset email sent notification displays | Success message displayed | Email with reset link is sent | Link expires after 24 hours | Pass |
| 2 | Use Invalid Email for Reset | Enter non-registered email | "Email not found" message displays | Error message shown | No reset email is sent | Generic error for security | Pass |
| 3 | Reset Password | Access reset link and enter new password | Password updated successfully | Password updated with confirmation | User can login with new password | Old password no longer works | Pass |
| 4 | Enter Mismatched Passwords | Enter different passwords in New and Confirm fields | Validation error message displays | Validation error shown | Password not updated | Real-time validation working | Pass |

### 7. Messaging System

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Send Message to User | Compose message with recipient, subject and body | Message sent successfully | Message sent with confirmation | Recipient receives the message | Attachments working correctly | Pass |
| 2 | Send Message to Group | Select group recipients and send message | Message sent to all group members | Message sent to all members | All members receive the message | Delivery report shows all recipients | Pass |
| 3 | Reply to Message | Open message and click Reply | Reply form opens with original message quoted | Reply form opened with quote | Reply is sent to original sender | Threading displays correctly | Pass |
| 4 | Delete Message | Select message and click Delete | Message is removed from inbox | Message removed from view | Message no longer appears in list | Confirmation dialog shown | Pass | 