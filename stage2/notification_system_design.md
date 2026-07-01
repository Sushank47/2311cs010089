# Stage 1: Notification System Design

This document outlines the system architecture, REST API design, communication contracts, schema structures, and real-time notification mechanism for the **Campus Notification Platform**.

---

## 1. Core Platform Actions
The platform is designed to resolve the campus notification latency problem for students and admins. It supports the following core actions:
1. **Retrieve Notifications:** Fetch a paginated, filterable list of notifications (Placements, Events, Results) for a student's dashboard.
2. **Get Unread Count:** Retrieve the number of unread notifications to dynamically update the UI notification badge.
3. **Mark Notification as Read:** Mark a single notification as read using its unique ID.
4. **Mark All Notifications as Read:** Bulk-update all unread notifications to read status.
5. **Create Notification (Admin/Coordinator):** Publish and broadcast a new campus update with a category and priority level.
6. **Delete Notification (Admin/Coordinator):** Remove old, expired, or incorrect updates from the active feed.

---

## 2. Common HTTP Headers & Authentication
For the evaluation phase, users accessing APIs are pre-authorized. However, the system architecture supports standard HTTP headers:
- `Accept: application/json` (Tells the server that the client expects JSON)
- `Content-Type: application/json` (Required for write operations: POST, PUT)
- `Authorization: Bearer <token>` (Optional header reserved for the logging middleware client payload authentication)

---

## 3. REST API Endpoints Specification

### 3.1 Retrieve Notifications (Paginated & Filterable)
Fetches a list of notifications based on page, limit, type filter, and read status.

- **Endpoint:** `/api/notifications`
- **Method:** `GET`
- **Headers:**
  ```http
  Accept: application/json
  ```
- **Query Parameters:**
  - `page` (integer, default: `1`): The current page number.
  - `limit` (integer, default: `10`): Number of records per page.
  - `type` (string, optional: `Placement`, `Event`, `Result`): Filter by category.
  - `read` (boolean, optional: `true`, `false`): Filter by read or unread status.

- **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "notifications": [
        {
          "_id": "60d5ec49f3234b3e8c253488",
          "title": "Google Recruitment Drive 2026",
          "message": "Google is recruiting Software Engineers. Direct link in portal. Apply before July 10.",
          "type": "Placement",
          "priority": "Critical",
          "isRead": false,
          "createdAt": "2026-07-01T11:45:00.000Z",
          "expiresAt": "2026-07-10T23:59:59.000Z"
        }
      ],
      "pagination": {
        "totalItems": 25,
        "totalPages": 3,
        "currentPage": 1,
        "limit": 10,
        "hasNextPage": true,
        "hasPrevPage": false
      }
    }
  }
  ```

---

### 3.2 Get Unread Notifications Count
Retrieves the total count of unread notifications to display on the dashboard badge.

- **Endpoint:** `/api/notifications/unread-count`
- **Method:** `GET`
- **Headers:**
  ```http
  Accept: application/json
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "unreadCount": 12
    }
  }
  ```

---

### 3.3 Mark Notification as Read
Marks a single notification as read using its path parameter ID.

- **Endpoint:** `/api/notifications/:id/read`
- **Method:** `PUT`
- **Headers:**
  ```http
  Accept: application/json
  Content-Type: application/json
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "message": "Notification marked as read.",
    "data": {
      "_id": "60d5ec49f3234b3e8c253488",
      "isRead": true,
      "updatedAt": "2026-07-01T11:46:12.000Z"
    }
  }
  ```
- **Error Response (HTTP 404 Not Found):**
  ```json
  {
    "success": false,
    "error": "Notification not found."
  }
  ```

---

### 3.4 Mark All Notifications as Read (Bulk Update)
Updates all notifications belonging to the student to read.

- **Endpoint:** `/api/notifications/read-all`
- **Method:** `PUT`
- **Headers:**
  ```http
  Accept: application/json
  Content-Type: application/json
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "message": "All notifications marked as read.",
    "data": {
      "modifiedCount": 12
    }
  }
  ```

---

### 3.5 Create Notification
Broadcasts a new notification. This triggers real-time socket events.

- **Endpoint:** `/api/notifications`
- **Method:** `POST`
- **Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body Example:**
  ```json
  {
    "title": "Placement Prep Workshop",
    "message": "Mandatory resume building seminar at Audi-2 on July 2.",
    "type": "Placement",
    "priority": "High",
    "expiresAt": "2026-07-02T18:00:00.000Z"
  }
  ```
- **Response (HTTP 201 Created):**
  ```json
  {
    "success": true,
    "message": "Notification created successfully.",
    "data": {
      "_id": "60d5ec49f3234b3e8c253490",
      "title": "Placement Prep Workshop",
      "message": "Mandatory resume building seminar at Audi-2 on July 2.",
      "type": "Placement",
      "priority": "High",
      "isRead": false,
      "createdAt": "2026-07-01T11:48:00.000Z",
      "expiresAt": "2026-07-02T18:00:00.000Z"
    }
  }
  ```
- **Error Response (HTTP 400 Bad Request):**
  ```json
  {
    "success": false,
    "error": "Validation failed: 'title' is required; 'type' must be one of [Placement, Event, Result]."
  }
  ```

---

### 3.6 Delete Notification
Deletes a notification from the collection database.

- **Endpoint:** `/api/notifications/:id`
- **Method:** `DELETE`
- **Headers:**
  ```http
  Accept: application/json
  ```
- **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "message": "Notification deleted successfully."
  }
  ```

---

## 4. Formal JSON Schema Architecture

Below are the formal JSON Schema descriptions for the resource objects.

### 4.1 Notification Resource Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Notification",
  "type": "object",
  "properties": {
    "_id": {
      "type": "string",
      "description": "Unique identifier generated by MongoDB (ObjectId)"
    },
    "title": {
      "type": "string",
      "minLength": 3,
      "maxLength": 100,
      "description": "Short heading of the notification"
    },
    "message": {
      "type": "string",
      "minLength": 5,
      "maxLength": 1000,
      "description": "Detailed description of the announcement"
    },
    "type": {
      "type": "string",
      "enum": ["Placement", "Event", "Result"],
      "description": "Category of the notification"
    },
    "priority": {
      "type": "string",
      "enum": ["Low", "Medium", "High", "Critical"],
      "default": "Medium",
      "description": "Urgency level of the notification"
    },
    "isRead": {
      "type": "boolean",
      "default": false,
      "description": "Indicates whether the student has viewed this item"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO timestamp representing creation time"
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO timestamp for auto-expiration or archiving"
    }
  },
  "required": ["title", "message", "type"]
}
```

---

## 5. Real-Time Notification Mechanism (Socket.io)

To avoid performance overhead from constant REST HTTP polling, the platform employs a real-time event distribution layer based on **WebSockets** using **Socket.io**.

### 5.1 Architecture DFD
```
  ┌──────────────┐           (1) Create Post          ┌───────────────┐
  │  Admin UI    ├───────────────────────────────────>│  Express API  │
  └──────────────┘                                    └───────┬───────┘
                                                              │
                                                         (2) Write
                                                              ▼
  ┌──────────────┐      (4) Broadcast "new-notification" ┌────┴──────────┐
  │ Student App  │<───────────────────────────────────┤  Socket.io    │
  │ (React-MUI)  │                                    │  Server Layer │
  └──────────────┘                                    └───────────────┘
```

### 5.2 Real-time Sequence of Events
1. **Client Registration:**
   - The React UI client initializes the `socket.io-client` connection on mounting.
   - The connection joins a default channel `campus-alerts`.
2. **Server-Side Trigger:**
   - Upon a successful database save in `POST /api/notifications`, the route controller executes:
     ```javascript
     io.to('campus-alerts').emit('new-notification', newNotificationData);
     ```
3. **Payload Structure for 'new-notification' Event:**
   ```json
   {
     "_id": "60d5ec49f3234b3e8c253490",
     "title": "B.Tech VI Sem Results Out",
     "message": "Results for B.Tech VI Sem Regular Examinations have been published.",
     "type": "Result",
     "priority": "High",
     "isRead": false,
     "createdAt": "2026-07-01T11:48:00.000Z"
   }
   ```
4. **Client-Side React Handler:**
   - The custom hook listens for the event:
     ```javascript
     socket.on('new-notification', (notification) => {
       // 1. Update state array in UI
       // 2. Play subtle sound or trigger dynamic slide-in alert
       // 3. Increment unread counter badge
     });
     ```

---
---

# Stage 2: Database Design & Scaling

This section covers the persistent storage choice, schema specifications, scaling strategy under high data volumes, and corresponding database query implementations.

## 1. Persistent Storage (DB) Choice & Explanation

For the **Campus Notification Platform**, we select **MongoDB** (NoSQL Document Store) as the persistent storage engine.

### Rationale for choosing MongoDB:
1. **Schema Flexibility:** Campus notifications can evolve. For instance, a `Placement` notification might later require fields like `packageLPA` (number) or `registrationLink` (string), whereas a `Result` notification might require `semester` or `batch`. MongoDB's dynamic schema easily supports this polymorphism without complex SQL joins.
2. **High Write and Read Throughput:** When notifications are broadcasted, they trigger instant lookups and updates (e.g. marking as read). MongoDB provides memory-mapped files and indexing that allow sub-millisecond retrieval.
3. **JSON Alignment:** MongoDB stores documents natively in BSON, which aligns perfectly with Express.js backend endpoints and React client payloads, eliminating the Object-Relational Impedance Mismatch.
4. **Built-in Expiration (TTL Indexing):** Notifications naturally expire after a deadline (e.g. event end date or placement registration closing). MongoDB has native Time-To-Live (TTL) index features that auto-delete documents, keeping storage footprints light.

---

## 2. Applicable DB Schema Definition

Here is the database collection structure. We write it using **Mongoose** schema declaration syntax:

```javascript
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 1000
  },
  type: {
    type: String,
    required: true,
    enum: ['Placement', 'Event', 'Result']
  },
  priority: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  isRead: {
    type: Boolean,
    required: true,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: false
  }
});

// INDEXES FOR OPTIMAL RETRIEVAL
// 1. Compound index for filtered retrieval and chronological sorting
notificationSchema.index({ type: 1, createdAt: -1 });

// 2. Index for unread count speed
notificationSchema.index({ isRead: 1 });

// 3. TTL index for auto-deletion of expired notifications (archives them after expiration)
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
```

---

## 3. Data Volume Scale Challenges & Solutions

As the number of students and notifications grows over multiple academic semesters, the database will face scalability bottlenecks.

### 3.1 Expected Problems:
1. **Unread Count Query Latency:** The unread count API is called on every dashboard mount. Doing a collection scan (`db.notifications.countDocuments({ isRead: false })`) across millions of documents becomes very slow.
2. **Offset Pagination Lag:** Standard skip-limit offset pagination (`skip(page * limit).limit(limit)`) scans and discards preceding documents, resulting in linear lookup degradation as the page number increases.
3. **Index Memory Overhead:** If we place indices on too many columns, the cumulative index size will exceed RAM, causing MongoDB to page indices to disk (resulting in major disk I/O latency).

### 3.2 Solutions:
1. **Counter Caching (Redis):** Cache the unread count in a Redis key. Increment or decrement it on notification creation or read action using atomic operations (`INCR`/`DECR`), keeping database reads to zero for navigation badges.
2. **Cursor-Based Pagination:** Instead of offset pagination, query using cursors (`nextId` or `createdAt` timestamp limit), executing:
   ```javascript
   db.notifications.find({ createdAt: { $lt: lastSeenTimestamp } }).limit(limit)
   ```
   This uses the compound index directly without scanning skipped documents.
3. **Time-To-Live (TTL) Archiving:** Automatically prune active notifications by enabling MongoDB's TTL index on `expiresAt` or run a daily cron script that archives older records into a separate cold-storage historical collection.

---

## 4. Database Query Implementations (NoSQL)

Here are the specific MongoDB Shell and Mongoose queries matching our Stage 1 REST API contracts.

### 4.1 Retrieve Paginated Notifications (with Type and Read Status Filters)
- **MongoDB raw query:**
  ```javascript
  db.notifications.find({
    type: "Placement",
    isRead: false
  })
  .sort({ createdAt: -1 })
  .skip(10)
  .limit(10)
  ```
- **Mongoose Service Layer:**
  ```javascript
  const getNotifications = async (queryFilters, page = 1, limit = 10) => {
    const filter = {};
    if (queryFilters.type) filter.type = queryFilters.type;
    if (queryFilters.read !== undefined) filter.isRead = queryFilters.read;

    const skipCount = (page - 1) * limit;

    const [notifications, totalItems] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skipCount)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter)
    ]);

    return {
      notifications,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit
      }
    };
  };
  ```

### 4.2 Get Unread Count
- **MongoDB raw query:**
  ```javascript
  db.notifications.countDocuments({ isRead: false })
  ```
- **Mongoose Service Layer:**
  ```javascript
  const getUnreadCount = async () => {
    return await Notification.countDocuments({ isRead: false });
  };
  ```

### 4.3 Mark Single Notification as Read
- **MongoDB raw query:**
  ```javascript
  db.notifications.updateOne(
    { _id: ObjectId("60d5ec49f3234b3e8c253488") },
    { $set: { isRead: true } }
  )
  ```
- **Mongoose Service Layer:**
  ```javascript
  const markAsRead = async (id) => {
    return await Notification.findByIdAndUpdate(
      id,
      { $set: { isRead: true } },
      { new: true }
    );
  };
  ```

### 4.4 Mark All Notifications as Read (Bulk Update)
- **MongoDB raw query:**
  ```javascript
  db.notifications.updateMany(
    { isRead: false },
    { $set: { isRead: true } }
  )
  ```
- **Mongoose Service Layer:**
  ```javascript
  const markAllAsRead = async () => {
    const result = await Notification.updateMany(
      { isRead: false },
      { $set: { isRead: true } }
    );
    return { modifiedCount: result.modifiedCount };
  };
  ```

### 4.5 Create Notification
- **MongoDB raw query:**
  ```javascript
  db.notifications.insertOne({
    title: "Placement Prep Workshop",
    message: "Mandatory resume building seminar at Audi-2 on July 2.",
    type: "Placement",
    priority: "High",
    isRead: false,
    createdAt: new Date(),
    expiresAt: new Date("2026-07-02T18:00:00.000Z")
  })
  ```
- **Mongoose Service Layer:**
  ```javascript
  const createNotification = async (data) => {
    return await Notification.create({
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority || 'Medium',
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
    });
  };
  ```

### 4.6 Delete Notification
- **MongoDB raw query:**
  ```javascript
  db.notifications.deleteOne({ _id: ObjectId("60d5ec49f3234b3e8c253488") })
  ```
- **Mongoose Service Layer:**
  ```javascript
  const deleteNotification = async (id) => {
    return await Notification.findByIdAndDelete(id);
  };
  ```
