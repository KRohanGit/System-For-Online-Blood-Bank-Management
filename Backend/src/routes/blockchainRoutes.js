const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchain/blockchainService');
const { authenticateToken } = require('../middleware/auth');


router.get('/chain/verify', authenticateToken, (req, res) => {
  const result = blockchainService.verifyChain();
  res.json(result);
});

router.get('/chain/stats', authenticateToken, (req, res) => {
  const stats = blockchainService.getChainStats();
  res.json(stats);
});

router.get('/block/:index', authenticateToken, (req, res) => {
  const index = parseInt(req.params.index, 10);
  const block = blockchainService.getBlock(index);
  if (!block) {
    return res.status(404).json({ message: 'Block not found' });
  }
  res.json(block);
});

router.get('/transactions/type/:type', authenticateToken, (req, res) => {
  const transactions = blockchainService.getTransactionsByType(req.params.type);
  res.json({ type: req.params.type, count: transactions.length, transactions });
});

router.get('/transactions/actor/:actorId', authenticateToken, (req, res) => {
  const transactions = blockchainService.getTransactionsByActor(req.params.actorId);
  res.json({ actorId: req.params.actorId, count: transactions.length, transactions });
});

router.get('/audit/:entityType/:entityId', authenticateToken, (req, res) => {
  const { entityType, entityId } = req.params;
  const validTypes = ['hospital', 'donor', 'transfer'];
  if (!validTypes.includes(entityType)) {
    return res.status(400).json({ message: `Invalid entity type. Valid: ${validTypes.join(', ')}` });
  }
  const trail = blockchainService.getAuditTrail(entityId, entityType);
  res.json({ entityType, entityId, count: trail.length, auditTrail: trail });
});

router.post('/mine', authenticateToken, (req, res) => {
  const result = blockchainService.minePendingTransactions();
  res.json(result);
});

router.post('/record/transfer', authenticateToken, (req, res) => {
  const result = blockchainService.recordBloodTransfer(req.body);
  res.json(result);
});

router.post('/record/donation', authenticateToken, (req, res) => {
  const result = blockchainService.recordDonation(req.body);
  res.json(result);
});

router.post('/record/emergency', authenticateToken, (req, res) => {
  const result = blockchainService.recordEmergencyRequest(req.body);
  res.json(result);
});

router.post('/record/inventory', authenticateToken, (req, res) => {
  const result = blockchainService.recordInventoryChange(req.body);
  res.json(result);
});

module.exports = router;
