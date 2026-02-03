const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');

router.post('/', protect, appointmentController.createAppointment);
router.get('/my-appointments', protect, appointmentController.getMyAppointments);
router.patch('/:id/cancel', protect, appointmentController.cancelAppointment);
router.get('/hospital', protect, appointmentController.getHospitalAppointments);
router.patch('/:id/status', protect, appointmentController.updateAppointmentStatus);

module.exports = router;
