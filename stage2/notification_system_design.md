# Stage 2: Requirements Analysis & Specification

This document details the functional requirements, non-functional requirements, user stories, and requirements traceability matrix for the **Campus Notification Platform**.

---

## 1. Functional Requirements (FRs)

The following functional requirements define the capabilities that the Campus Notification Platform must provide:

| Requirement ID | Module | Description | Priority |
|---|---|---|---|
| **FR-01** | Feed Operations | The system shall allow users to retrieve a list of notifications sorted in descending order of their creation date. | Must Have |
| **FR-02** | Pagination | The notification query API shall support pagination parameters (`page`, `limit`) to prevent data overload. | Must Have |
| **FR-03** | Filtering | The system shall allow users to filter notifications by category type (`Placement`, `Event`, `Result`) and read status (`true`/`false`). | Must Have |
| **FR-04** | Status Management | The system shall allow a student to mark a single notification as read by passing its unique ID. | Must Have |
| **FR-05** | Bulk Operations | The system shall support marking all unread notifications as read in a single batch operation. | Should Have |
| **FR-06** | Real-Time Push | The system shall broadcast any new notification to all active clients in real-time using WebSockets (Socket.io) upon creation. | Must Have |
| **FR-07** | Badging | The frontend application shall display an unread notification count badge that updates dynamically in real-time. | Must Have |
| **FR-08** | Notification Creation | The system shall expose a secure POST endpoint for administrators to create and publish new notifications. | Must Have |
| **FR-09** | Priority Triage | The system shall support notification priorities (`Low`, `Medium`, `High`, `Critical`). Notifications of `Critical` or `High` priority must be rendered in a dedicated "Priority Notifications" section. | Must Have |
| **FR-10** | Deletion | The system shall allow administrators to delete incorrect, outdated, or expired notifications. | Should Have |

---

## 2. Non-Functional Requirements (NFRs)

The following non-functional requirements define the quality attributes, constraints, and system parameters:

| Requirement ID | Category | Description | Priority |
|---|---|---|---|
| **NFR-01** | Performance | Notification query and count APIs must respond in less than 200 milliseconds under typical load conditions. | Must Have |
| **NFR-02** | Latency | Real-time push notifications must propagate to all connected active clients in less than 500 milliseconds from database transaction commit. | Must Have |
| **NFR-03** | Usability | The frontend UI must be responsive, accommodating mobile, tablet, and desktop viewports, styled with Material UI (MUI). | Must Have |
| **NFR-04** | Observability | The application backend MUST utilize the custom Axios-based `Log` middleware exclusively for tracing errors and operations. Inbuilt console logging is strictly prohibited. | Must Have |
| **NFR-05** | Security | The application must bypass user registration/login screens for this evaluation, but backend endpoints must validate request payloads for correct type and priority parameters. | Must Have |
| **NFR-06** | Data Consistency | Marking notifications as read must execute atomically in MongoDB, ensuring the count matches the client-side state. | Must Have |

---

## 3. User Stories & Acceptance Criteria

### USN-1: Retrieve and View Announcements
- **User Story:** As a **Student**, I want to view a list of campus announcements on my dashboard so that I stay informed about placement drives, results, and events.
- **Story Points:** 3
- **Sprint Assignment:** Sprint 1
- **Acceptance Criteria:**
  - Retrieve notifications in descending order of creation date.
  - Notifications show the Title, Category tag (`Placement`/`Event`/`Result`), Description, Priority level, and Timestamp.
  - UI displays an empty state illustration when there are no active notifications.

### USN-2: Pagination & Load Management
- **User Story:** As a **Student**, I want the notification feed to load incrementally using page controls so that my device doesn't lag when querying large amounts of data.
- **Story Points:** 2
- **Sprint Assignment:** Sprint 1
- **Acceptance Criteria:**
  - Retrieve results in pages of 10 items by default.
  - Show next, previous, page number indicators, and a count of total items.

### USN-3: Filtering by Type
- **User Story:** As a **Student**, I want to filter the notification list by category so that I can quickly find placement details without scrolling past exams or event posts.
- **Story Points:** 3
- **Sprint Assignment:** Sprint 1
- **Acceptance Criteria:**
  - Filter selection tabs or chips (`All`, `Placements`, `Events`, `Results`).
  - Active filtering triggers API query with the chosen category.

### USN-4: Live Unread Count
- **User Story:** As a **Student**, I want to see an unread badge indicator next to the notification icon so that I know immediately when new details are uploaded.
- **Story Points:** 2
- **Sprint Assignment:** Sprint 2
- **Acceptance Criteria:**
  - A red badge containing the numeric count of unread items is displayed.
  - The badge decreases by 1 when a notification is marked read, and goes to 0 when "Mark All Read" is clicked.
  - Real-time updates automatically increment the badge without refresh.

### USN-5: Priority Categorization
- **User Story:** As a **Student**, I want critical or high-priority notifications to be highlighted or displayed in a prominent "Priority Announcements" container so that I don't miss urgent alerts.
- **Story Points:** 3
- **Sprint Assignment:** Sprint 2
- **Acceptance Criteria:**
  - Critical/High items render in an urgent layout styled with appropriate accent colors (e.g., Red/Orange card borders).
  - Pinned high-priority announcements appear at the top of the dashboard feed.

### USN-6: Administrator Announcement Creation
- **User Story:** As an **Administrator**, I want to submit a new announcement specifying its Title, Message, Category, and Priority level so that students receive updates immediately.
- **Story Points:** 5
- **Sprint Assignment:** Sprint 2
- **Acceptance Criteria:**
  - Form validations enforce minimum length for title/message and valid enum values.
  - Submitting successfully saves the notification to MongoDB and broadcasts it to WebSockets.

---

## 4. Requirements Traceability Matrix (RTM)

This matrix maps functional requirements to user stories, API endpoints, and subsequent UAT validation cases:

| Req ID | User Story ID | API Endpoint | UI Component | UAT Test Case |
|---|---|---|---|---|
| **FR-01** | USN-1 | `GET /api/notifications` | `Dashboard.jsx`, `NotificationList.jsx` | UAT-001 |
| **FR-02** | USN-2 | `GET /api/notifications?page=1&limit=10` | `TablePagination` / Pagination controls | UAT-002 |
| **FR-03** | USN-3 | `GET /api/notifications?type=Placement` | `CategoryChips` / Select filters | UAT-003 |
| **FR-04** | USN-4 | `PUT /api/notifications/:id/read` | `CheckCircleIcon` / "Mark as Read" button | UAT-004 |
| **FR-05** | USN-4 | `PUT /api/notifications/read-all` | "Mark All as Read" button | UAT-005 |
| **FR-06** | USN-4, USN-6 | WebSocket `new-notification` broadcast | React Context `SocketContext` | UAT-006 |
| **FR-07** | USN-4 | `GET /api/notifications/unread-count` | `Badge` (MUI) | UAT-007 |
| **FR-08** | USN-6 | `POST /api/notifications` | `NotificationFormModal.jsx` | UAT-008 |
| **FR-09** | USN-5 | `GET /api/notifications` (priority filter logic) | `PriorityDashboardSection.jsx` | UAT-009 |
| **FR-10** | USN-6 | `DELETE /api/notifications/:id` | `DeleteIcon` / Archive button | UAT-010 |
