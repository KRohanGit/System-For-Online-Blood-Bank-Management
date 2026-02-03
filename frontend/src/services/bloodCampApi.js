/**
 * Blood Camp API Service
 * 
 * Purpose: Handle all blood camp related API calls
 * 
 * Academic Context:
 * - Centralized API service pattern
 * - Separation of concerns (API logic separate from UI)
 * - Reusable API methods across components
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Handle API response
 */
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Blood Camp API methods
 */
export const bloodCampAPI = {
  // ============= PUBLIC METHODS (No authentication required) =============
  
  /**
   * Get all blood camps
   */
  getAllCamps: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/blood-camps${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Get nearby blood camps based on user location
   */
  getNearbyCamps: async (longitude, latitude, maxDistance = 50) => {
    const url = `${API_BASE_URL}/blood-camps/nearby?longitude=${longitude}&latitude=${latitude}&maxDistance=${maxDistance}`;
    
    const response = await fetch(url);
    return handleResponse(response);
  },

  /**
   * Get single camp by ID
   */
  getCampById: async (campId) => {
    const response = await fetch(`${API_BASE_URL}/blood-camps/${campId}`);
    return handleResponse(response);
  },

  // ============= PROTECTED METHODS (Authentication required) =============

  /**
   * Create a new blood camp
   */
  createCamp: async (campData) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(campData)
    });
    
    return handleResponse(response);
  },

  /**
   * Get camps organized by logged-in user
   */
  getMyCamps: async (params = {}) => {
    const token = getAuthToken();
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/blood-camps/my/camps${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Update blood camp
   */
  updateCamp: async (campId, campData) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/${campId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(campData)
    });
    
    return handleResponse(response);
  },

  /**
   * Cancel blood camp
   */
  cancelCamp: async (campId, reason) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/${campId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
    
    return handleResponse(response);
  },

  /**
   * Delete blood camp
   */
  deleteCamp: async (campId) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/${campId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  // ============= BOOKING METHODS =============

  /**
   * Book a blood camp slot
   */
  bookCamp: async (campId, notes = '') => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/${campId}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ notes })
    });
    
    return handleResponse(response);
  },

  /**
   * Get user's bookings
   */
  getMyBookings: async (params = {}) => {
    const token = getAuthToken();
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/blood-camps/my/bookings${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Get booking by ID
   */
  getBookingById: async (bookingId) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/bookings/${bookingId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Cancel booking
   */
  cancelBooking: async (bookingId, reason = '') => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
    
    return handleResponse(response);
  },

  /**
   * Get camp bookings (for organizer)
   */
  getCampBookings: async (campId, params = {}) => {
    const token = getAuthToken();
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/blood-camps/${campId}/bookings${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Check in booking
   */
  checkInBooking: async (bookingId) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/bookings/${bookingId}/check-in`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Complete booking (mark donation as done)
   */
  completeBooking: async (bookingId) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/bookings/${bookingId}/complete`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  }
};

/**
 * Notification API methods
 */
export const notificationAPI = {
  /**
   * Get user's notifications
   */
  getMyNotifications: async (params = {}) => {
    const token = getAuthToken();
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/blood-camps/notifications/my${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async () => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/notifications/unread-count`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Mark notification as unread
   */
  markAsUnread: async (notificationId) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/notifications/${notificationId}/unread`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Delete notification
   */
  deleteNotification: async (notificationId) => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  },

  /**
   * Delete all read notifications
   */
  deleteAllRead: async () => {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/blood-camps/notifications/delete-all-read`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return handleResponse(response);
  }
};

/**
 * Geolocation helper
 */
export const geolocationHelper = {
  /**
   * Get user's current location
   */
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }
};
