/**
 * Blood Camp Routes
 * 
 * Purpose: Define API endpoints for blood camp operations
 * 
 * Academic Context:
 * - RESTful API design principles
 * - Route protection with JWT middleware
 * - Role-based access control (RBAC)
 * 
 * Route Structure:
 * - Public routes: No authentication required
 * - Protected routes: Requires authentication
 * - Organizer routes: Requires authentication + organizer verification
 */

const express = require('express');
const router = express.Router();
const bloodCampController = require('../controllers/bloodCampController');
const campBookingController = require('../controllers/campBookingController');
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// ============= PUBLIC ROUTES (No authentication required) =============

/**
 * @route   GET /api/blood-camps
 * @desc    Get all upcoming blood camps with pagination
 * @access  Public
 */
router.get('/', bloodCampController.getAllCamps);

/**
 * @route   GET /api/blood-camps/nearby
 * @desc    Get nearby blood camps based on user's location
 * @access  Public
 * @query   longitude, latitude, maxDistance (optional, default 50km)
 */
router.get('/nearby', bloodCampController.getNearbyCamps);

/**
 * @route   GET /api/blood-camps/:id
 * @desc    Get single blood camp by ID
 * @access  Public
 */
router.get('/:id', bloodCampController.getCampById);

// ============= PROTECTED ROUTES (Authentication required) =============

/**
 * @route   GET /api/blood-camps/my/camps
 * @desc    Get camps organized by logged-in user
 * @access  Protected (PUBLIC_USER verified or HOSPITAL_ADMIN)
 */
router.get('/my/camps', auth, bloodCampController.getMyCamps);

/**
 * @route   POST /api/blood-camps
 * @desc    Create a new blood camp
 * @access  Protected (PUBLIC_USER verified or HOSPITAL_ADMIN)
 */
router.post('/', auth, bloodCampController.createCamp);

/**
 * @route   PUT /api/blood-camps/:id
 * @desc    Update blood camp details
 * @access  Protected (Camp organizer only)
 */
router.put('/:id', auth, bloodCampController.updateCamp);

/**
 * @route   PATCH /api/blood-camps/:id/cancel
 * @desc    Cancel a blood camp
 * @access  Protected (Camp organizer only)
 */
router.patch('/:id/cancel', auth, bloodCampController.cancelCamp);

/**
 * @route   DELETE /api/blood-camps/:id
 * @desc    Delete a blood camp (soft delete)
 * @access  Protected (Camp organizer only)
 */
router.delete('/:id', auth, bloodCampController.deleteCamp);

// ============= BOOKING ROUTES =============

/**
 * @route   POST /api/blood-camps/:campId/book
 * @desc    Book a slot in a blood camp
 * @access  Protected (PUBLIC_USER verified only)
 */
router.post('/:campId/book', auth, checkRole(['PUBLIC_USER']), campBookingController.bookCamp);

/**
 * @route   GET /api/blood-camps/my/bookings
 * @desc    Get user's bookings
 * @access  Protected (PUBLIC_USER)
 */
router.get('/my/bookings', auth, checkRole(['PUBLIC_USER']), campBookingController.getMyBookings);

/**
 * @route   GET /api/blood-camps/bookings/:bookingId
 * @desc    Get single booking details
 * @access  Protected (Booking owner or camp organizer)
 */
router.get('/bookings/:bookingId', auth, campBookingController.getBookingById);

/**
 * @route   PATCH /api/blood-camps/bookings/:bookingId/cancel
 * @desc    Cancel a booking
 * @access  Protected (Booking owner only)
 */
router.patch('/bookings/:bookingId/cancel', auth, checkRole(['PUBLIC_USER']), campBookingController.cancelBooking);

/**
 * @route   GET /api/blood-camps/:campId/bookings
 * @desc    Get all bookings for a specific camp
 * @access  Protected (Camp organizer only)
 */
router.get('/:campId/bookings', auth, campBookingController.getCampBookings);

/**
 * @route   PATCH /api/blood-camps/bookings/:bookingId/check-in
 * @desc    Check in a user for the camp
 * @access  Protected (Camp organizer only)
 */
router.patch('/bookings/:bookingId/check-in', auth, campBookingController.checkInBooking);

/**
 * @route   PATCH /api/blood-camps/bookings/:bookingId/complete
 * @desc    Mark booking as completed (donation done)
 * @access  Protected (Camp organizer only)
 */
router.patch('/bookings/:bookingId/complete', auth, campBookingController.completeBooking);

// ============= NOTIFICATION ROUTES =============

/**
 * @route   GET /api/blood-camps/notifications/my
 * @desc    Get user's notifications
 * @access  Protected
 */
router.get('/notifications/my', auth, notificationController.getMyNotifications);

/**
 * @route   GET /api/blood-camps/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Protected
 */
router.get('/notifications/unread-count', auth, notificationController.getUnreadCount);

/**
 * @route   PATCH /api/blood-camps/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Protected (Notification owner only)
 */
router.patch('/notifications/:notificationId/read', auth, notificationController.markAsRead);

/**
 * @route   PATCH /api/blood-camps/notifications/:notificationId/unread
 * @desc    Mark notification as unread
 * @access  Protected (Notification owner only)
 */
router.patch('/notifications/:notificationId/unread', auth, notificationController.markAsUnread);

/**
 * @route   PATCH /api/blood-camps/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Protected
 */
router.patch('/notifications/mark-all-read', auth, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/blood-camps/notifications/:notificationId
 * @desc    Delete a notification
 * @access  Protected (Notification owner only)
 */
router.delete('/notifications/:notificationId', auth, notificationController.deleteNotification);

/**
 * @route   DELETE /api/blood-camps/notifications/delete-all-read
 * @desc    Delete all read notifications
 * @access  Protected
 */
router.delete('/notifications/delete-all-read', auth, notificationController.deleteAllRead);

/**
 * @route   POST /api/blood-camps/notifications/test
 * @desc    Create a test notification (for development)
 * @access  Protected
 */
router.post('/notifications/test', auth, notificationController.createTestNotification);

module.exports = router;
