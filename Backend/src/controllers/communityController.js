const CommunityPost = require('../models/CommunityPost');
const Notification = require('../models/Notification');

exports.getAllPosts = async (req, res) => {
  try {
    const { type, status = 'active', bloodGroup, urgency, page = 1, limit = 20 } = req.query;
    
    const query = { status };
    if (type) query.type = type;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (urgency) query.urgency = urgency;
    
    const posts = await CommunityPost.find(query)
      .sort({ urgency: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const total = await CommunityPost.countDocuments(query);
    
    res.status(200).json({
      success: true,
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNearbyPosts = async (req, res) => {
  try {
    const { longitude, latitude, radius = 50 } = req.query;
    
    if (!longitude || !latitude) {
      return res.status(400).json({ success: false, message: 'Location coordinates required' });
    }
    
    const posts = await CommunityPost.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseFloat(radius)
    ).sort({ urgency: 1, createdAt: -1 });
    
    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, type, bloodGroup, urgency, location, contactInfo, expiresAt } = req.body;
    
    const post = await CommunityPost.create({
      authorId: req.user.id,
      authorModel: req.user.model,
      authorName: req.user.name || req.user.hospitalName,
      title,
      content,
      type,
      bloodGroup,
      urgency,
      location,
      contactInfo,
      expiresAt
    });
    
    res.status(201).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const postId = req.params.id;
    
    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    post.comments.push({
      userId: req.user.id,
      userName: req.user.name,
      content
    });
    
    await post.save();
    
    if (post.authorId.toString() !== req.user.id) {
      await Notification.create({
        userId: post.authorId,
        userModel: post.authorModel,
        title: 'New Comment',
        message: `${req.user.name} commented on your post`,
        type: 'comment',
        relatedEntity: { model: 'CommunityPost', id: postId }
      });
    }
    
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.likePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const likeIndex = post.likes.indexOf(req.user.id);
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.user.id);
    }
    
    await post.save();
    res.status(200).json({ success: true, likes: post.likes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePostStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const post = await CommunityPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    if (post.authorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    post.status = status;
    await post.save();
    
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    if (post.authorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await post.deleteOne();
    res.status(200).json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
