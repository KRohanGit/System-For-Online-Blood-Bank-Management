const CommunityPost = require('../models/CommunityPost');
const Notification = require('../models/Notification');
const HospitalProfile = require('../models/HospitalProfile');
const { broadcast, emitToRole } = require('../services/realtime/socketService');

const normalizeType = (type) => {
  const value = String(type || '').toLowerCase();
  const mapping = {
    request: 'request',
    blood_request: 'request',
    announcement: 'announcement',
    general: 'announcement',
    story: 'story',
    thank_you: 'story',
    question: 'question'
  };
  return mapping[value] || 'request';
};

const normalizeUrgency = (urgency) => {
  const value = String(urgency || '').toLowerCase();
  if (['critical', 'high', 'medium', 'low'].includes(value)) {
    return value;
  }
  return 'medium';
};

const resolveAuthorModel = (userRole) => {
  const role = String(userRole || '').toLowerCase();
  if (role === 'public_user') return 'PublicUser';
  if (role === 'hospital_admin') return 'User';
  return 'User';
};

const resolveLocation = async (reqLocation, user, userRole) => {
  if (reqLocation?.coordinates?.length === 2) {
    return {
      type: 'Point',
      coordinates: [Number(reqLocation.coordinates[0]), Number(reqLocation.coordinates[1])],
      address: reqLocation.address || null,
      city: reqLocation.city || null,
      state: reqLocation.state || null
    };
  }

  if (Array.isArray(user?.location?.coordinates) && user.location.coordinates.length === 2) {
    return {
      type: 'Point',
      coordinates: [Number(user.location.coordinates[0]), Number(user.location.coordinates[1])],
      address: user.location.address || null,
      city: user.location.city || null,
      state: user.location.state || null
    };
  }

  if (String(userRole || '').toLowerCase() === 'hospital_admin') {
    const profile = await HospitalProfile.findOne({ userId: user._id }).lean();
    const coords = profile?.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      return {
        type: 'Point',
        coordinates: [Number(coords[0]), Number(coords[1])],
        address: profile.location?.address || null,
        city: profile.location?.city || null,
        state: profile.location?.state || null
      };
    }
  }

  return {
    type: 'Point',
    coordinates: [0, 0],
    address: 'Not provided',
    city: 'Unknown',
    state: 'Unknown'
  };
};

const getUserDisplayName = (user) => user.fullName || user.name || user.hospitalName || user.email || 'User';

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
    const authorModel = resolveAuthorModel(req.userRole);
    const resolvedLocation = await resolveLocation(location, req.user, req.userRole);
    
    const post = await CommunityPost.create({
      authorId: req.user._id,
      authorModel,
      authorName: getUserDisplayName(req.user),
      title,
      content,
      type: normalizeType(type),
      bloodGroup,
      urgency: normalizeUrgency(urgency),
      location: resolvedLocation,
      contactInfo,
      expiresAt
    });

    broadcast('community.post.created', {
      postId: post._id,
      title: post.title,
      type: post.type,
      urgency: post.urgency,
      authorName: post.authorName,
      createdAt: post.createdAt
    });
    emitToRole('public_user', 'community.post.created', { postId: post._id, title: post.title });
    emitToRole('hospital_admin', 'community.post.created', { postId: post._id, title: post.title });
    emitToRole('doctor', 'community.post.created', { postId: post._id, title: post.title });
    emitToRole('super_admin', 'community.post.created', { postId: post._id, title: post.title });
    
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
      userId: req.user._id,
      userName: getUserDisplayName(req.user),
      content
    });
    
    await post.save();

    broadcast('community.post.commented', {
      postId,
      commentCount: post.comments.length,
      latestCommentBy: getUserDisplayName(req.user)
    });
    
    if (post.authorId.toString() !== String(req.user._id)) {
      try {
        await Notification.create({
          userId: post.authorId,
          userModel: post.authorModel,
          title: 'New Comment',
          message: `${getUserDisplayName(req.user)} commented on your post`,
          type: 'announcement',
          relatedEntity: { entityType: 'System', entityId: null },
          metadata: {
            postId: String(postId),
            actorName: String(getUserDisplayName(req.user) || 'User')
          }
        });
      } catch (notificationError) {
        console.error('Failed to create comment notification:', notificationError.message);
      }
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
    
    const likeIndex = post.likes.findIndex((id) => String(id) === String(req.user._id));
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.user._id);
    }
    
    await post.save();
    broadcast('community.post.liked', {
      postId: post._id,
      likes: post.likes.length
    });
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
    
    if (post.authorId.toString() !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    post.status = status;
    await post.save();

    broadcast('community.post.updated', {
      postId: post._id,
      status: post.status
    });
    
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
    
    if (post.authorId.toString() !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await post.deleteOne();
    broadcast('community.post.deleted', {
      postId: req.params.id
    });
    res.status(200).json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
