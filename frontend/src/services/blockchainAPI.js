import api from './axiosInstance';

export const verifyChain = () =>
  api.get('/blockchain/chain/verify');

export const getChainStats = () =>
  api.get('/blockchain/chain/stats');

export const getBlock = (index) =>
  api.get(`/blockchain/block/${index}`);

export const getTransactionsByType = (type) =>
  api.get(`/blockchain/transactions/type/${type}`);

export const getTransactionsByActor = (actorId) =>
  api.get(`/blockchain/transactions/actor/${actorId}`);

export const getAuditTrail = (entityType, entityId) =>
  api.get(`/blockchain/audit/${entityType}/${entityId}`);

export const mineBlock = () =>
  api.post('/blockchain/mine');

export const recordTransfer = (data) =>
  api.post('/blockchain/record/transfer', data);

export const recordDonation = (data) =>
  api.post('/blockchain/record/donation', data);

export const recordEmergency = (data) =>
  api.post('/blockchain/record/emergency', data);

export const recordInventoryChange = (data) =>
  api.post('/blockchain/record/inventory', data);
