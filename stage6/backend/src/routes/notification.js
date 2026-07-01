const express = require('express');
const router = express.Router();
const controller = require('../controllers/notification');

// Fetch priority sorted list
router.get('/', controller.getNotifications);

// Mark single as read
router.put('/:id/read', controller.markAsRead);

// Bulk mark as read
router.put('/read-all', controller.markAllAsRead);

module.exports = router;
