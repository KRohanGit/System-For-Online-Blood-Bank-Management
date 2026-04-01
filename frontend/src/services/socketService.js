import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function connectSocket(userId, role) {
  if (socket && socket.connected) {
    return socket;
  }
  socket = io(SOCKET_URL, {
    query: { userId, role },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function joinHospitalRoom(hospitalId) {
  if (socket) {
    socket.emit('join:hospital', hospitalId);
  }
}

export function joinEmergencyRoom(emergencyId) {
  if (socket) {
    socket.emit('join:emergency', emergencyId);
  }
}

export function joinBloodCampRoom(campId) {
  if (socket) {
    socket.emit('join:bloodcamp', campId);
  }
}

export function onEvent(eventName, callback) {
  if (socket) {
    socket.on(eventName, callback);
    return () => socket.off(eventName, callback);
  }
  return () => {};
}

export function onEmergencyNew(callback) {
  return onEvent('emergency:new', callback);
}

export function onEmergencyCritical(callback) {
  return onEvent('emergency:critical', callback);
}

export function onEmergencyUpdate(callback) {
  return onEvent('emergency:update', callback);
}

export function onInventoryChange(callback) {
  return onEvent('inventory:change', callback);
}

export function onLowStockAlert(callback) {
  return onEvent('alert:low_stock', callback);
}

export function onTransferUpdate(callback) {
  return onEvent('transfer:update', callback);
}

export function onDonationConfirmed(callback) {
  return onEvent('donation:confirmed', callback);
}

export function onAppointmentReminder(callback) {
  return onEvent('appointment:reminder', callback);
}

export function onSystemAlert(callback) {
  return onEvent('system:alert', callback);
}
