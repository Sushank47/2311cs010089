# Stage 1: Notification System Design

This document details the REST API contract, JSON schema structures, header definitions, and the real-time notification push mechanism for the **Campus Notification Platform**.

---

## 1. Core Platform Actions
To solve the campus notification problem and support dynamic dashboard operations, the platform identifies and supports the following core actions:
1.  **Retrieve Notifications:** Fetch a paginated, filterable list of campus notifications (Placements, Events, Results).
2.  **Unread Count Retrieval:** Get the count of unread notifications to dynamically update the dashboard badge.
3.  **Mark Notification as Read:** Mark a single notification as read using its unique ID.
4.  **Mark All Notifications as Read:** Bulk update all unread notifications to read status.
5.  **Create Notification (Publisher/Admin role):** Broadcast a new notification with an category type and priority level.
6.  **Delete Notification:** Remove old or incorrect notifications from the dashboard list.

---

## 2. REST API Endpoints Specification

### 2.1 Retrieve Notifications
Fetch a paginated list of notifications with filters for notification type and read status.

*   **Endpoint:** `/api/notifications`
*   **Method:** `GET`
*   **Headers:**
    ```http
    Accept: application/json
    ```
*   **Query Parameters:**
    *   `page` (integer, default: `1`): The current page number.
    *   `limit` (integer, default: `10`): Number of notifications per page.
    *   `type` (string, optional: `Placement`, `Event`, `Result`): Filter notifications by category.
    *   `read` (boolean, optional: `true`, `false`): Filter by read or unread status.
*   **Response (HTTP 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "notifications": [
          {
            "_id": "60d5ec49f3234b3e8c253488",
            "title": "Google Placement Drive 2026",
            "message": "Google is hiring Software Engineering Interns. Apply by July 10th.",
            "type": "Placement",
            "priority": "High",
            "isRead": false,
            "createdAt": "2026-07-01T11:45:00.000Z",
            "expiresAt": "2026-07-10T23:59:59.000Z"
          },
          {
            "_id": "60d5ec49f3234b3e8c253489",
            "title": "Annual Hackathon Visionova",
            "message": "Register for the 24-hour campus hackathon before July 5th.",
            "type": "Event",
            "priority": "Medium",
            "isRead": true,
            "createdAt": "2026-06-30T09:00:00.000Z",
            "expiresAt": "2026-07-05T18:00:00.000Z"
          }
        ],
        "pagination": {
          "totalItems": 15,
          "totalPages": 2,
          "currentPage": 1,
          "limit": 10,
          "hasNextPage": true,
          "hasPrevPage": false
        }
      }
    }
    ```

---

### 2.2 Get Unread Notifications Count
Retrieve the count of unread notifications to display on the navigation badge.

*   **Endpoint:** `/api/notifications/unread-count`
*   **Method:** `GET`
*   **Headers:**
    ```http
    Accept: application/json
    ```
*   **Response (HTTP 200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "unreadCount": 5
      }
    }
    ```

---

### 2.3 Mark Notification as Read
Mark a single notification as read.

*   **Endpoint:** `/api/notifications/:id/read`
*   **Method:** `PUT`
*   **Headers:**
    ```http
    Accept: application/json
    ```
*   **Response (HTTP 200 OK):**
    ```json
    {
      "success": true,
      "message": "Notification marked as read.",
      "data": {
        "_id": "60d5ec49f3234b3e8c253488",
        "title": "Google Placement Drive 2026",
        "isRead": true,
        "updatedAt": "2026-07-01T11:46:12.000Z"
      }
    }
    ```
*   **Error Response (HTTP 404 Not Found):**
    ```json
    {
      "success": false,
      "error": "Notification not found."
    }
    ```

---

### 2.4 Mark All Notifications as Read
Mark all notifications as read in bulk.

*   **Endpoint:** `/api/notifications/read-all`
*   **Method:** `PUT`
*   **Headers:**
    ```http
    Accept: application/json
    ```
*   **Response (HTTP 200 OK):**
    ```json
    {
      "success": true,
      "message": "All notifications marked as read.",
      "data": {
        "modifiedCount": 5
      }
    }
    ```

---

### 2.5 Create Notification
Broadcast a new notification to the campus database.

*   **Endpoint:** `/api/notifications`
*   **Method:** `POST`
*   **Headers:**
    ```http
    Content-Type: application/json
    Accept: application/json
    ```
*   **Request Body JSON Schema:**
    ```json
    {
      "title": "B.Tech VI Sem Results Out",
      "message": "Results for B.Tech VI Sem Regular Examinations have been published.",
      "type": "Result",
      "priority": "High",
      "expiresAt": "2026-08-01T00:00:00.000Z"
    }
    ```
*   **Response (HTTP 201 Created):**
    ```json
    {
      "success": true,
      "message": "Notification created successfully.",
      "data": {
        "_id": "60d5ec49f3234b3e8c253490",
        "title": "B.Tech VI Sem Results Out",
        "message": "Results for B.Tech VI Sem Regular Examinations have been published.",
        "type": "Result",
        "priority": "High",
        "isRead": false,
        "createdAt": "2026-07-01T11:48:00.000Z",
        "expiresAt": "2026-08-01T00:00:00.000Z"
      }
    }
    ```
*   **Error Response (HTTP 400 Bad Request):**
    ```json
    {
      "success": false,
      "error": "Validation failed: 'title' is required, 'type' must be one of Placement, Event, Result."
    }
    ```

---

### 2.6 Delete Notification
Remove a notification from the platform.

*   **Endpoint:** `/api/notifications/:id`
*   **Method:** `DELETE`
*   **Headers:**
    ```http
    Accept: application/json
    ```
*   **Response (HTTP 200 OK):**
    ```json
    {
      "success": true,
      "message": "Notification deleted successfully."
    }
    ```

---

## 3. Real-Time Notification Mechanism

To ensure students receive updates in **real-time** without polling the REST API, the system implements a publish-subscribe model powered by **WebSockets (Socket.io)**.

### 3.1 Architectural Workflow Diagram
```
┌─────────────────┐       1. POST /api/notifications       ┌────────────────┐
│ Admin / Publisher├───────────────────────────────────────>│  Express API   │
└─────────────────┘                                        └────────┬───────┘
                                                                    │ 2. Save DB
                                                                    ▼
                                                            ┌───────────────┐
                                                            │  MongoDB / DB │
                                                            └───────┬───────┘
                                                                    │ 3. Trigger Socket
                                                                    ▼
┌─────────────────┐       5. Display Premium Alert         ┌────────────────┐
│ Student App (UI)│<───────────────────────────────────────┤ Socket.io Server│
└─────────────────┘      Broadcast "new_notification"      └────────────────┘
```

### 3.2 Real-time Communication Steps

1.  **Connection Setup:**
    *   Upon app loading, the client establishes a persistent connection to the Socket.io server.
    *   No authentication token is required in this pre-authorized evaluation workspace.
2.  **Broadcast Event on Publish:**
    *   When an administrator creates a new notification via `POST /api/notifications`, the controller saves it to MongoDB.
    *   On a successful DB write, the server emits a WebSocket message called `new_notification` to all connected clients.
3.  **WebSocket Event Structure:**
    ```json
    {
      "event": "new_notification",
      "data": {
        "_id": "60d5ec49f3234b3e8c253490",
        "title": "B.Tech VI Sem Results Out",
        "message": "Results for B.Tech VI Sem Regular Examinations have been published.",
        "type": "Result",
        "priority": "High",
        "isRead": false,
        "createdAt": "2026-07-01T11:48:00.000Z"
      }
    }
    ```
4.  **Client-Side React Consumption:**
    *   The frontend listens for the `new_notification` event via a custom React Hook (`useSocket`).
    *   Upon receiving the payload, it:
        1.  Prepends the new notification to the active state array.
        2.  Increments the unread badge count by `1` in real-time.
        3.  Triggers a slide-in MUI Snackbar Alert displaying the notification details.
