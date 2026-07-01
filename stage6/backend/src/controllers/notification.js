const axios = require('axios');
const config = require('../config/dotenv');
const { getAccessToken } = require('../services/tokenManager');
const Log = require('../services/logger');

// Local in-memory store for read notification IDs to support dashboard toggle interactivity
let readNotificationIds = new Set();

const weightMap = {
  'placement': 3,
  'result': 2,
  'event': 1
};

/**
 * Fetch and Sort Notifications by Weight and Recency
 */
async function getNotifications(req, res, next) {
  const limit = parseInt(req.query.limit, 10) || 10;
  const filterType = req.query.type; // Placement, Result, Event

  const apiUrl = `${config.BASE_URL}/evaluation-service/notifications`;

  try {
    const token = await getAccessToken();
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      timeout: 8000
    });

    let rawNotifications = response.data.notifications || [];

    // Map the external items and attach the local read status
    let mapped = rawNotifications.map(item => ({
      _id: item.ID,
      title: `${item.Type} Update: ${item.Message.substring(0, 20)}`,
      message: item.Message,
      type: item.Type,
      isRead: readNotificationIds.has(item.ID),
      createdAt: item.Timestamp
    }));

    // Filter by type if requested
    if (filterType) {
      mapped = mapped.filter(item => item.type.toLowerCase() === filterType.toLowerCase());
    }

    // Sorting algorithm: Weight (Placement > Result > Event) and Recency (newest first)
    mapped.sort((a, b) => {
      const weightA = weightMap[a.type.toLowerCase()] || 0;
      const weightB = weightMap[b.type.toLowerCase()] || 0;

      if (weightB !== weightA) {
        return weightB - weightA; // Descending weight
      }

      // If weight is same, compare timestamps in descending order
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Take top N
    const sliced = mapped.slice(0, limit);

    // Calculate count of unread items from the FULL active list (not just sliced)
    const unreadCount = mapped.filter(item => !item.isRead).length;

    // Log this operation using custom logging middleware (maps to singular "controller")
    await Log(
      'backend', 
      'info', 
      'web-backend-controllers', 
      `Successfully loaded ${mapped.length} items from server. Sorted by weight & recency. Displaying top ${sliced.length} items. Active unread count: ${unreadCount}`
    );

    return res.status(200).json({
      success: true,
      data: {
        notifications: sliced,
        unreadCount: unreadCount,
        totalItems: mapped.length
      }
    });

  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    
    await Log(
      'backend', 
      'error', 
      'web-backend-controllers', 
      `Failed to load notifications from evaluation API: ${errorDetails}`
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications from upstream provider.'
    });
  }
}

/**
 * Mark a single notification as Read in memory
 */
async function markAsRead(req, res) {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ success: false, error: 'Notification ID is required.' });
  }

  readNotificationIds.add(id);

  await Log(
    'backend', 
    'info', 
    'web-backend-controllers', 
    `Notification with ID ${id} marked as read locally.`
  );

  return res.status(200).json({
    success: true,
    message: 'Notification marked as read.',
    data: {
      _id: id,
      isRead: true
    }
  });
}

/**
 * Mark all notifications as read in memory
 */
async function markAllAsRead(req, res) {
  const apiUrl = `${config.BASE_URL}/evaluation-service/notifications`;

  try {
    const token = await getAccessToken();
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 8000
    });

    const rawNotifications = response.data.notifications || [];
    
    // Add all fetched IDs to the read set
    rawNotifications.forEach(item => {
      readNotificationIds.add(item.ID);
    });

    await Log(
      'backend', 
      'info', 
      'web-backend-controllers', 
      `Bulk marked all ${rawNotifications.length} fetched notifications as read.`
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: {
        modifiedCount: rawNotifications.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch all items for bulk read update.'
    });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
