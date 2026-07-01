const axios = require('axios');
const config = require('../config/dotenv');
const { getAccessToken } = require('../services/tokenManager');
const Log = require('../services/logger');

let readNotificationIds = new Set();
// Local memory store for newly created notifications to merge them with upstream items
let locallyCreatedNotifications = [];

const weightMap = {
  'placement': 3,
  'result': 2,
  'event': 1
};

/**
 * Fetch and Sort Notifications by Weight and Recency
 */
async function getNotifications(req, res) {
  const limit = parseInt(req.query.limit, 10) || 10;
  const filterType = req.query.type;

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

    // Map external notifications
    let mapped = rawNotifications.map(item => ({
      _id: item.ID,
      title: `${item.Type} Update: ${item.Message.substring(0, 20)}`,
      message: item.Message,
      type: item.Type,
      isRead: readNotificationIds.has(item.ID),
      createdAt: item.Timestamp
    }));

    // Merge in-memory locally created notifications
    const mappedLocal = locallyCreatedNotifications.map(item => ({
      _id: item._id,
      title: item.title,
      message: item.message,
      type: item.type,
      isRead: readNotificationIds.has(item._id),
      createdAt: item.createdAt
    }));

    let combined = [...mappedLocal, ...mapped];

    // Filter by type if requested
    if (filterType) {
      combined = combined.filter(item => item.type.toLowerCase() === filterType.toLowerCase());
    }

    // Sort by priority weight and recency
    combined.sort((a, b) => {
      const weightA = weightMap[a.type.toLowerCase()] || 0;
      const weightB = weightMap[b.type.toLowerCase()] || 0;

      if (weightB !== weightA) {
        return weightB - weightA;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const sliced = combined.slice(0, limit);
    const unreadCount = combined.filter(item => !item.isRead).length;

    await Log(
      'backend',
      'info',
      'web-backend-controllers',
      `Loaded ${combined.length} combined items. Displaying top ${sliced.length}.`
    );

    return res.status(200).json({
      success: true,
      data: {
        notifications: sliced,
        unreadCount: unreadCount,
        totalItems: combined.length
      }
    });

  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    await Log('backend', 'error', 'web-backend-controllers', `Get notifications failed: ${errorDetails}`);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications.'
    });
  }
}

/**
 * Mark a single notification as read
 */
async function markAsRead(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Notification ID is required.' });
  }

  readNotificationIds.add(id);

  await Log('backend', 'info', 'web-backend-controllers', `Marked notification ${id} as read.`);

  return res.status(200).json({
    success: true,
    message: 'Notification marked as read.',
    data: { _id: id, isRead: true }
  });
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(req, res) {
  const apiUrl = `${config.BASE_URL}/evaluation-service/notifications`;

  try {
    const token = await getAccessToken();
    const response = await axios.get(apiUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 8000
    });

    const rawNotifications = response.data.notifications || [];
    rawNotifications.forEach(item => readNotificationIds.add(item.ID));
    locallyCreatedNotifications.forEach(item => readNotificationIds.add(item._id));

    await Log('backend', 'info', 'web-backend-controllers', 'All alerts marked as read bulk.');

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: { modifiedCount: rawNotifications.length + locallyCreatedNotifications.length }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to bulk mark read.' });
  }
}

/**
 * Create and broadcast a new notification via Socket.io
 */
async function createNotification(req, res) {
  const { title, message, type, priority } = req.body;

  if (!title || !message || !type) {
    return res.status(400).json({ success: false, error: 'Title, message, and type are required.' });
  }

  const newId = `local-${Math.random().toString(36).substring(2, 11)}`;
  const newNotification = {
    _id: newId,
    title: `${type} Update: ${title}`,
    message,
    type,
    priority: priority || 'Medium',
    isRead: false,
    createdAt: new Date().toISOString()
  };

  // Add to local in-memory store
  locallyCreatedNotifications.unshift(newNotification);

  // Broadcast to all connected WebSockets clients using attached Socket.io server
  if (req.io) {
    req.io.emit('new-notification', newNotification);
  }

  await Log(
    'backend',
    'info',
    'web-backend-controllers',
    `Created and broadcasted alert: ${newId.substring(0, 15)}`
  );

  return res.status(201).json({
    success: true,
    message: 'Notification created and broadcasted.',
    data: newNotification
  });
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
};
