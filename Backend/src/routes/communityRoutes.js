const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { protect } = require('../middleware/auth');

router.get('/', communityController.getAllPosts);
router.get('/nearby', communityController.getNearbyPosts);
router.get('/:id', communityController.getPostById);
router.post('/', protect, communityController.createPost);
router.post('/:id/comment', protect, communityController.addComment);
router.post('/:id/like', protect, communityController.likePost);
router.patch('/:id/status', protect, communityController.updatePostStatus);
router.delete('/:id', protect, communityController.deletePost);

module.exports = router;
