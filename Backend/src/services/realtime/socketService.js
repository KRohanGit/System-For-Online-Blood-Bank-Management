const { Server } = require('socket.io');


let io = null;
const connectedClients = new Map();
const roomMemberships = new Map();

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 60000
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    const userRole = socket.handshake.query.role;
    const hospitalId = socket.handshake.query.hospitalId;

    if (userId) {
      connectedClients.set(socket.id, { userId, role: userRole, socket });
      socket.join(`user:${userId}`);
      if (userRole) {
        socket.join(`role:${userRole}`);
      }
    }

    socket.on('join:hospital', (hospitalId) => {
      socket.join(`hospital:${hospitalId}`);
      trackRoom(socket.id, `hospital:${hospitalId}`);
    });

    if (hospitalId) {
      socket.join(`hospital:${hospitalId}`);
      trackRoom(socket.id, `hospital:${hospitalId}`);
      io.emit('hospital.online', {
        hospitalId,
        userId,
        timestamp: new Date().toISOString()
      });
    }

    socket.on('join:emergency', (emergencyId) => {
      socket.join(`emergency:${emergencyId}`);
      trackRoom(socket.id, `emergency:${emergencyId}`);
    });

    socket.on('join:bloodcamp', (campId) => {
      socket.join(`bloodcamp:${campId}`);
      trackRoom(socket.id, `bloodcamp:${campId}`);
    });

    socket.on('disconnect', () => {
      const rooms = roomMemberships.get(socket.id);

      if (rooms) {
        const hospitalRoom = Array.from(rooms).find((room) => room.startsWith('hospital:'));
        if (hospitalRoom) {
          const disconnectedHospitalId = hospitalRoom.split(':')[1];
          io.emit('hospital.offline', {
            hospitalId: disconnectedHospitalId,
            userId,
            timestamp: new Date().toISOString()
          });
        }
      }

      connectedClients.delete(socket.id);
      if (rooms) {
        rooms.forEach((room) => socket.leave(room));
        roomMemberships.delete(socket.id);
      }
    });
  });

  return io;
}

function trackRoom(socketId, room) {
  if (!roomMemberships.has(socketId)) {
    roomMemberships.set(socketId, new Set());
  }
  roomMemberships.get(socketId).add(room);
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

function emitToRole(role, event, data) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

function emitToHospital(hospitalId, event, data) {
  if (io) {
    io.to(`hospital:${hospitalId}`).emit(event, data);
  }
}

function emitToEmergency(emergencyId, event, data) {
  if (io) {
    io.to(`emergency:${emergencyId}`).emit(event, data);
  }
}

function broadcast(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

function getConnectedCount() {
  return connectedClients.size;
}

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitToHospital,
  emitToEmergency,
  broadcast,
  getConnectedCount
};
