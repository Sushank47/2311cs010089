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

---
---

# Stage 3: Relational DB Query Analysis & Performance Optimization

This section contains an evaluation of a slow-performing SQL query on a relational database system consisting of **50,000 students** and **5,000,000 notification records**.

## 1. Query Analysis

The slow-performing query developed by a team member is:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### 1.1 Is this query accurate?
**Yes, logically it is accurate.** It correctly filters the database records by selecting rows where the identifier `studentID` is `1042`, filters out read items by checking if `isRead` is `false` (meaning unread), and returns them sorted by creation time (`createdAt`) in ascending order (oldest first).

### 1.2 Why is this query slow?
1. **Full Table Scan (FTS):** In a table containing 5,000,000 rows, if there is no index covering `studentID` or `isRead`, the database engine must execute a sequential scan of every single row on disk to identify matching items. This results in heavy disk I/O latency.
2. **Post-Query Sorting (File-Sort):** The database engine has to sort the matching row records on-the-fly. If the sorting column `createdAt` is not pre-sorted via index ordering, MySQL/PostgreSQL performs a "File-Sort" (writing temporary sort data to disk if the match set is larger than the configuration's sort buffer), causing high CPU load.
3. **Inefficient Column Selection (`SELECT *`):** Selecting all columns fetches large text columns (like the message body) unnecessarily into memory, inflating query buffer utilization.

---

## 2. Recommended Optimizations & Computational Cost

To optimize execution speed, we will apply two primary modifications:

### 2.1 Index Creation
We will create a **Composite (Multi-column) Index** covering the search criteria and sorting column:

```sql
CREATE INDEX idx_notifications_student_unread_created 
ON notifications(studentID, isRead, createdAt);
```

#### Why a Composite Index is optimal here:
- **Index Filtering:** The database engine directly jumps to the index subtree matching `studentID = 1042` and `isRead = false`.
- **Index Sorting:** Because `createdAt` is the trailing key in the composite index, the records in that index leaf node are already physically sorted in ascending order. The database engine returns the pre-sorted records directly, completely bypassing the "File-Sort" stage.

### 2.2 Projection Optimization
Modify the query to project only the essential columns required for navigation badges and feed rendering instead of using `SELECT *`:

```sql
SELECT id, title, message, notificationType, priority, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### 2.3 Computational Cost Comparison

| Performance Metric | Before Optimization (FTS) | After Optimization (Composite Index) |
|---|---|---|
| **Query Complexity** | $O(N)$ table scan + $O(K \log K)$ sorting | $O(\log N + M)$ index seek & sequential read |
| **Disk I/O** | High (scans 5 million rows on disk) | Very Low (reads index nodes + $M$ data rows) |
| **Sort Operation** | Explicit File-Sort (high CPU/Temp disk write) | None (pre-sorted index scan) |
| **Average Execution Time** | ~1.5 to 5.0 seconds | **< 1.0 millisecond** |

*(Where $N = 5,000,000$ total records, $K$ is the unread matches before sort, and $M$ is the actual unread records, e.g. < 15)*

---

## 3. Evaluation of "Adding Indexes on Every Column" Advice

Another developer suggested: *"Add indexes on every column to be safe."*

### Is this advice effective?
**No, this is highly dangerous and counterproductive advice.**

### Rationale:
1. **Severe Write Overhead:** Every write operation (`INSERT`, `UPDATE`, `DELETE`) triggers updates to all indexes. Placing indexes on every column makes writes slow and degrades ingestion performance.
2. **RAM Exhaustion:** Indexes must reside in memory (e.g. the InnoDB buffer pool in MySQL) to be fast. If indexes are built on every column, the index sizes will exceed database memory, causing swapping to disk and slowing the entire database down.
3. **Optimizer Confusion:** The database query planner may choose sub-optimal indexes, increasing execution planning time.
4. **Single-Column Indexes Cannot Satisfy Multi-Column Criteria:** A query with multiple criteria (`WHERE studentID = X AND isRead = Y`) is best served by a single *composite index*, not separate single-column indexes.

---

## 4. SQL Placement Query (Last 7 Days)

To find all unique students who received a placement notification in the last 7 days, we use the following SQL query:

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL 7 DAY;
```

*(Note: In standard PostgreSQL syntax, the interval subtraction is represented as: `createdAt >= CURRENT_TIMESTAMP - INTERVAL '7 days'`)*

### Query Execution Strategy for DB Admin:
To ensure this query runs instantly, add the following supporting index:
```sql
CREATE INDEX idx_notifications_type_created ON notifications(notificationType, createdAt);
```

---
---

# Stage 4: High-Concurrency Query & Database Load Optimization

When 50,000 students log into the platform, fetching notifications and counts on each page load causes a database query flood (read storm). This section proposes architectural solutions, performance techniques, and evaluates their engineering tradeoffs.

## 1. Architectural Solutions to Reduce Read Load

To prevent the relational database from being overwhelmed, we propose three major strategies:

### 1.1 Server-Side Caching (Redis In-Memory Key-Value Store)
Instead of querying the SQL/NoSQL database directly on every REST API call, retrieve notifications and unread counts from an in-memory cache layer.

- **Data Flow:**
  - **Read path:** The Express server checks Redis. If the cache hits, the payload is returned in < 1ms. If it misses, query MongoDB/SQL, write it to Redis with a 5-minute Time-to-Live (TTL), and return the data.
  - **Write/Invalidation path:** When an admin creates a notification (`POST /api/notifications`), evict or update the corresponding cache entries.

### 1.2 Read/Write Splitting with Database Replication
Decouple read traffic from write traffic using database replicas.

- **Data Flow:**
  - Set up one **Primary (Master)** database node and multiple **Read-Only (Secondary)** replicas.
  - Write commands (creating, marking read, deleting notifications) execute on the Primary node.
  - Read queries (retrieving the dashboard lists, counting unread alerts) are balanced across the Read-Only Replicas.

### 1.3 State Synchronization via WebSocket Cache Pushes (Push-only Model)
Instead of fetching the full dashboard array on every single page navigation, perform a single baseline pull on app startup. Subsequent alerts are pushed directly to clients via active WebSocket connections and merged client-side.

- **Data Flow:**
  - Client loads -> Fetches `/api/notifications` once.
  - App navigation -> Client uses local state variables.
  - New notification arrives -> Socket.io pushes it, client appends it locally.

---

## 2. In-Depth Tradeoffs Evaluation Matrix

| Strategy | Pros / Benefits | Cons / Risks | Engineering Tradeoffs |
|---|---|---|---|
| **Server-Side Cache (Redis)** | - Sub-millisecond response times.<br>- Reduces database read load by up to 90%.<br>- Scalable memory footprint. | - **Cache Invalidation Complexity:** Risk of serving stale data if cache is not properly cleared on updates.<br>- Additional infrastructure dependencies. | **Consistency vs. Performance:** Opting for high performance at the expense of temporary eventual consistency (e.g., a student might see an unread count out of sync for a short window). |
| **Read/Write Splitting (Replication)** | - Easily scales read throughput by adding replicas.<br>- Redundancy: High availability if the master node goes down. | - **Replication Lag:** Read replicas sync asynchronously. Students might mark an item as read, refresh, and still see it as unread.<br>- High hosting infrastructure costs. | **Strict vs. Eventual Consistency:** Sacrifices immediate query accuracy during peak traffic windows in exchange for database survival and write throughput. |
| **Client-Side State Cache (WebSocket Sync)** | - Minimizes total API calls to the server.<br>- Zero network wait time during page transitions. | - **State Divergence:** If a client loses connection, they miss push events, causing their UI to become out of sync.<br>- Memory overhead on the user's mobile device. | **Client Autonomy vs. Server Authority:** Shifts state-management workload to the browser client, requiring complex sync checks (e.g. fetching diffs on reconnect). |

---

## 3. Recommended Multi-Tier Architecture

To achieve optimal performance and absolute reliability under peak load (e.g., placement result release hours):
1. **Tier 1 (Redis):** Cache unread notification counts per student. Since unread counts are read constantly on every nav bar render, keeping counts in Redis is highly efficient.
2. **Tier 2 (Cursor-Based Replicas):** Route all list queries to read replicas using cursor parameters to ensure database query execution times remain uniform.
3. **Tier 3 (WebSockets):** Push new announcements directly to connected clients, updating client-side lists in memory to bypass page-reload fetch storms.

---
---

# Stage 5: Reliable Broadcast Architectures (Notify All)

During placement season, administrators broadcast announcements to all **50,000 students** simultaneously. This section analyzes the performance flaws of synchronous loops and proposes a reliable, decoupled asynchronous architecture.

## 1. Shortcomings of Synchronous Loops

The proposed synchronous pseudocode:
```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)      # calls Email API
        save_to_db(student_id, message)      # DB insert
        push_to_app(student_id, message)     # WebSocket push
```

### Critical Flaws Identified:
1. **Blocking Call Operations & Timeout Risk:** The loop calls `send_email` sequentially. Network calls to external Email APIs typically take 50ms - 200ms per call. For 50,000 students, the loop will run for $50,000 \times 100\text{ms} = 5,000\text{ seconds}$ (~1.4 hours). The HTTP request will time out, and the single-threaded Node.js event loop will block, causing service denial for all other users.
2. **Lack of Fault Tolerance & Failure cascading:** If the Email API fails midway (e.g. at student 24,000 due to rate limits), the loop throws an exception and halts. There is no state persistence tracking who received it, resulting in:
   - Double-delivery to already notified students if re-triggered.
   - Missing notifications for the remaining 26,000 students.
3. **Tight Coupling:** The three concerns—Persistence (saving to database), Real-time delivery (WebSockets), and External delivery (Email)—are tightly coupled. A network failure in the Email API halts database storage.
4. **Database Strain:** Making 50,000 separate single inserts sequentially wastes database connection pools and resources.

---

## 2. Decoupling DB Storage and Email API Deliveries

### Should they happen together synchronously?
**No. Database storage and email delivery must be decoupled asynchronously.**

### Rationale:
- **Local vs. Remote Reliability:** DB storage is a local, high-reliability action. Email delivery is a remote, low-reliability action (dependent on SMTP, spam filters, network API keys).
- **Primary vs. Secondary Announcements:** The database is the platform's primary source of truth. If the email channel fails, a student can still log in and view the placement announcement on their dashboard. An email failure should never prevent a notification from registering in the database.
- **Velocity Difference:** DB bulk writes take milliseconds, while sending 50,000 emails takes minutes or hours. They should execute on separate timelines.

---

## 3. Redesigned Reliable & Scalable Architecture

We redesign the system utilizing the **Publisher-Subscriber / Message Queue Pattern** (e.g., BullMQ with Redis, or RabbitMQ):

```
                       ┌──────────────────────┐
                       │  Admin / Post API    │
                       └──────────┬───────────┘
                                  │
                       1. Create & Bulk DB Save
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │  MongoDB / SQL DB    │ (Source of Truth)
                       └──────────┬───────────┘
                                  │
                        2. Queue Broadcast Job
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │ Redis Message Queue  │ (e.g. BullMQ / RabbitMQ)
                       └────┬────────────┬────┘
                            │            │
            3. Fetch Jobs   │            │ 3. Fetch Jobs
                            ▼            ▼
                     ┌──────────┐    ┌──────────┐
                     │ Worker 1 │    │ Worker 2 │ (Distributed concurrency)
                     └────┬─────┘    └────┬─────┘
                          │               │
               4. Concurrent Deliveries   │ 4. Concurrent Deliveries
                          ▼               ▼
                   ┌──────────────┐ ┌──────────────┐
                   │  SMTP Email  │ │ WebSocket    │
                   │  Gateways    │ │ Broadcasters │
                   └──────────────┘ └──────────────┘
```

### Key Redesign Strategies:
1. **Single Bulk DB Insertion:** Create a single global notification document, and map user statuses or use a fan-out key. In MongoDB, insert the notification template record once, and then register unread counts in user documents.
2. **Asynchronous Worker Queues:** Push a single broadcast job metadata onto a Message Queue. Workers fetch this job, chunk student list IDs (e.g., 500 per batch), and distribute tasks across concurrent email workers.
3. **Idempotency & State Tracking:** Save job progress inside the Redis queue state (e.g., `completedCount: 20000`). If a worker crashes or an email gateway fails, it resumes from the last successfully processed batch.
4. **Dead-Letter Queue (DLQ):** Emails that fail to deliver after 3 retry attempts are routed to a Dead-Letter Queue (DLQ) for admin review, preventing loop blockage.

---

## 4. Revised Pseudocode (Queue Worker Pattern)

### 4.1 Publisher (Express API Controller)
```python
# Save notification and publish worker jobs
function publish_broadcast(title: string, message: string, student_ids: array):
    # Step 1: Bulk Database Persistence (one transaction)
    notification_doc = db.save_notification_template({
        "title": title,
        "message": message,
        "createdAt": now()
    })
    
    # Step 2: Push WebSocket broad-alert job
    queue.publish_job("websocket_broadcast", {
        "notification_id": notification_doc.id,
        "message": message
    })
    
    # Step 3: Chunk student list to prevent task exhaustion and publish jobs
    batch_size = 500
    student_chunks = chunk_array(student_ids, batch_size)
    for chunk in student_chunks:
        queue.publish_job("email_delivery_batch", {
            "notification_id": notification_doc.id,
            "student_ids": chunk,
            "message": message,
            "retry_count": 0
        })
        
    return { "success": True, "notification_id": notification_doc.id }
```

### 4.2 Email Queue Consumer Worker
```python
# Background worker processing chunks concurrently
function process_email_batch_worker(job):
    student_ids = job.data.student_ids
    message = job.data.message
    
    for student_id in student_ids:
        try:
            # Check if student already received email in case of resume-from-crash
            if not db.check_delivery_receipt(student_id, job.data.notification_id):
                send_email(student_id, message)
                db.record_delivery_receipt(student_id, job.data.notification_id)
        except Exception as e:
            # Handle failure per student, write log to custom Logging Middleware
            Log("process_email_batch_worker", "ERROR", "email-service", f"Failed for {student_id}: {str(e)}")
            
            # Requeue job for failed students if retry limits are not exceeded
            if job.data.retry_count < 3:
                queue.publish_job("email_delivery_batch", {
                    "notification_id": job.data.notification_id,
                    "student_ids": [student_id],
                    "message": message,
                    "retry_count": job.data.retry_count + 1
                })
            else:
                queue.publish_dead_letter_queue({
                    "student_id": student_id,
                    "notification_id": job.data.notification_id,
                    "reason": str(e)
                })
```
