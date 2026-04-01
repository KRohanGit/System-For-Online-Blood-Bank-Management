import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityAPI, geolocationHelper } from '../../services/communityApi';
import PostCard from '../../components/common/PostCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import './CommunityPage.css';

export default function CommunityPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('all');
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(50);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '', content: '', type: 'general', bloodGroup: '', urgency: 'low',
    contactPhone: '', contactEmail: ''
  });
  
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    fetchAllPosts();
  }, []);

  const fetchAllPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await communityAPI.getAllPosts({ status: 'active' });
      setPosts(response.data.posts);
      setViewMode('all');
    } catch (err) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const location = await geolocationHelper.getCurrentLocation();
      setUserLocation(location);
      const response = await communityAPI.getNearbyPosts(location.longitude, location.latitude, searchRadius);
      setPosts(response.data.posts);
      setViewMode('nearby');
    } catch (err) {
      setError(err.message || 'Failed to load nearby posts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (post) => {
    setSelectedPost(post);
  };

  const handleComment = (post) => {
    if (!isLoggedIn) {
      alert('Please login to comment');
      navigate('/signin/public-user');
      return;
    }
    setSelectedPost(post);
  };

  const handleLike = async (postId) => {
    if (!isLoggedIn) {
      alert('Please login to like posts');
      navigate('/signin/public-user');
      return;
    }
    try {
      await communityAPI.likePost(postId);
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
      fetchAllPosts();
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    try {
      await communityAPI.addComment(selectedPost._id, commentText);
      setCommentText('');
      const response = await communityAPI.getPostById(selectedPost._id);
      setSelectedPost(response.data.post);
      fetchAllPosts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleCreatePost = () => {
    if (!isLoggedIn) {
      alert('Please login to create a post');
      navigate('/signin/public-user');
      return;
    }
    setShowCreateForm(true);
  };

  const submitNewPost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Title and content are required');
      return;
    }
    try {
      setCreateLoading(true);
      await communityAPI.createPost({
        title: newPost.title,
        content: newPost.content,
        type: newPost.type,
        bloodGroup: newPost.bloodGroup || undefined,
        urgency: newPost.urgency,
        contactInfo: {
          phone: newPost.contactPhone,
          email: newPost.contactEmail
        }
      });
      setShowCreateForm(false);
      setNewPost({ title: '', content: '', type: 'general', bloodGroup: '', urgency: 'low', contactPhone: '', contactEmail: '' });
      fetchAllPosts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create post');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="community-page">
      <header className="community-header">
        <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
        <h1>🩸 Community</h1>
        <p>Connect, share, and help save lives together</p>
      </header>

      <div className="action-bar">
        <button className="btn-primary" onClick={handleCreatePost}>+ Create Post</button>
        <button className={`btn-secondary ${viewMode === 'nearby' ? 'active' : ''}`} onClick={viewMode === 'nearby' ? fetchAllPosts : fetchNearbyPosts}>
          📍 {viewMode === 'nearby' ? 'Show All' : 'Find Nearby'}
        </button>
        {viewMode === 'nearby' && userLocation && (
          <select value={searchRadius} onChange={(e) => { setSearchRadius(Number(e.target.value)); fetchNearbyPosts(); }}>
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
        )}
      </div>

      <div className="posts-container">
        {loading && <LoadingSpinner message="Loading posts..." />}
        {error && !loading && <ErrorMessage message={error} onRetry={fetchAllPosts} />}
        {!loading && !error && posts.length === 0 && (
          <EmptyState icon="🏥" title="No posts found" message="Be the first to share!" />
        )}
        {!loading && !error && posts.length > 0 && (
          <div className="posts-grid">
            {posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                onViewDetails={handleViewDetails}
                onComment={handleComment}
                onLike={handleLike}
                isLiked={likedPosts.has(post._id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPost.title}</h2>
              <button className="close-btn" onClick={() => setSelectedPost(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="post-details">
                <p><strong>Posted by:</strong> {selectedPost.authorName}</p>
                <p><strong>Location:</strong> {selectedPost.location?.city}</p>
                {selectedPost.bloodGroup && <p><strong>Blood Group:</strong> <span className="blood-badge">{selectedPost.bloodGroup}</span></p>}
                <p><strong>Urgency:</strong> <span className={`urgency-badge urgent-${selectedPost.urgency}`}>{selectedPost.urgency}</span></p>
                <p className="post-full-content">{selectedPost.content}</p>
                {selectedPost.contactInfo && (
                  <div className="contact-info">
                    <p>📞 {selectedPost.contactInfo.phone}</p>
                    <p>📧 {selectedPost.contactInfo.email}</p>
                  </div>
                )}
              </div>
              <div className="comments-section">
                <h3>Comments ({selectedPost.comments?.length || 0})</h3>
                {selectedPost.comments?.map((comment, idx) => (
                  <div key={idx} className="comment">
                    <strong>{comment.userName}</strong>
                    <p>{comment.content}</p>
                  </div>
                ))}
                {isLoggedIn && (
                  <div className="comment-form">
                    <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." rows={3} />
                    <button onClick={submitComment} className="btn-primary">Post Comment</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Post</h2>
              <button className="close-btn" onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submitNewPost}>
                <div style={{ marginBottom: '12px' }}>
                  <label><strong>Title *</strong></label>
                  <input type="text" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} placeholder="Post title" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '4px' }} required />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label><strong>Content *</strong></label>
                  <textarea value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} placeholder="Describe your post..." rows={4} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '4px' }} required />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label><strong>Type</strong></label>
                    <select value={newPost.type} onChange={(e) => setNewPost({ ...newPost, type: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '4px' }}>
                      <option value="general">General</option>
                      <option value="blood_request">Blood Request</option>
                      <option value="announcement">Announcement</option>
                      <option value="thank_you">Thank You</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label><strong>Blood Group</strong></label>
                    <select value={newPost.bloodGroup} onChange={(e) => setNewPost({ ...newPost, bloodGroup: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '4px' }}>
                      <option value="">Any / N/A</option>
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label><strong>Urgency</strong></label>
                    <select value={newPost.urgency} onChange={(e) => setNewPost({ ...newPost, urgency: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '4px' }}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label><strong>Contact Phone</strong></label>
                    <input type="tel" value={newPost.contactPhone} onChange={(e) => setNewPost({ ...newPost, contactPhone: e.target.value })} placeholder="Phone number" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '4px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label><strong>Contact Email</strong></label>
                    <input type="email" value={newPost.contactEmail} onChange={(e) => setNewPost({ ...newPost, contactEmail: e.target.value })} placeholder="Email address" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '4px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={createLoading}>{createLoading ? 'Posting...' : 'Create Post'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
