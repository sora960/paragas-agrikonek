# Plain-Site Functional Test Cases

## Project Information
| Project Name | Plain-Site Farm Management System |
| ------------ | -------------------------------- |
| Reference Document | Project Functional Requirement Specification |
| Created by | QA Team |
| Project Lead | [Project Manager Name] |
| Date of creation | [Current Date] |
| Date of review | [Review Date] |

## Test Scenarios

### 1. Authentication

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Enter existing username, correct password and correct URL | Access Plain-Site Website (URL) | Redirects to the Dashboard based on user role | | User is logged in | | |
| 2 | Enter valid username and wrong password | Enter credentials and click Login | Show "Invalid credentials" | | User remains on login page | | |
| 3 | Leave fields blank and click Login | Click Login with empty fields | No login attempt made | | Validation message displayed | | |
| 4 | Enter nonexisting username, correct password format | Enter credentials and click Login | Show "Invalid credentials" | | User remains on login page | | |

### 2. Farmer Dashboard

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Access Farmer Dashboard | Login as Farmer user | Dashboard loads with farmer-specific widgets | | Farmer can view their plots and budgets | | |
| 2 | View Farm Plots | Click on "My Plots" section | List of all plots assigned to the farmer displays | | Farmer can see their plot details | | |
| 3 | Submit Budget Request | Navigate to Budget section and fill request form | Form submits successfully | | Request appears in pending status | | |
| 4 | View Messages | Click on Messages icon | List of all messages displays | | Farmer can read messages | | |

### 3. Organization Admin Functions

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Manage Organization Members | Access Members section from Organization Dashboard | List of members displays with status | | Admin can view all organization members | | |
| 2 | Approve Member Registration | Select pending member and click Approve | Member status changes to Approved | | Member receives access to organization | | |
| 3 | Manage Announcements | Create new announcement with all fields filled | Announcement saves and publishes to members | | Members can view the announcement | | |
| 4 | View Organization Reports | Navigate to Reports section | Reports load with correct data | | Admin can export reports | | |

### 4. Regional Admin Functions

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Manage Regional Budget | Access Regional Budget Management page | Budget overview displays with allocation details | | Admin can see regional budget status | | |
| 2 | Review Farmer Budget Requests | Navigate to Budget Requests tab | List of all farmer budget requests displays | | Admin can process budget requests | | |
| 3 | Approve Budget Request | Select request and click Approve | Request status changes to Approved | | Farmer is notified of approval | | |
| 4 | Generate Regional Reports | Navigate to Reports section and select report type | Report generates with correct data | | Admin can export report | | |

### 5. Super Admin Functions

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Manage Users | Access User Management page | List of all system users displays | | Admin can search and filter users | | |
| 2 | Create New Organization | Fill organization creation form and submit | Organization is created successfully | | Organization appears in organization list | | |
| 3 | Manage Regions | Access Region Management page | List of all regions displays | | Admin can modify region settings | | |
| 4 | System Configuration | Access Settings page | System settings display | | Admin can modify system parameters | | |

### 6. Password Recovery

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Request Password Reset | Click "Forgot Password" and enter email | Reset email sent notification displays | | Email with reset link is sent | | |
| 2 | Use Invalid Email for Reset | Enter non-registered email | "Email not found" message displays | | No reset email is sent | | |
| 3 | Reset Password | Access reset link and enter new password | Password updated successfully | | User can login with new password | | |
| 4 | Enter Mismatched Passwords | Enter different passwords in New and Confirm fields | Validation error message displays | | Password not updated | | |

### 7. Messaging System

| # | Test Cases | Test Step | Expected Result | Actual Result | Post Condition | Remark | Status |
|---|------------|-----------|-----------------|---------------|----------------|--------|--------|
| 1 | Send Message to User | Compose message with recipient, subject and body | Message sent successfully | | Recipient receives the message | | |
| 2 | Send Message to Group | Select group recipients and send message | Message sent to all group members | | All members receive the message | | |
| 3 | Reply to Message | Open message and click Reply | Reply form opens with original message quoted | | Reply is sent to original sender | | |
| 4 | Delete Message | Select message and click Delete | Message is removed from inbox | | Message no longer appears in list | | | 