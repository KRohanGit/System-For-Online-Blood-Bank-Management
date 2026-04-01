const crypto = require('crypto');


class BlockchainService {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.difficulty = 2;
    this._createGenesisBlock();
  }

  _createGenesisBlock() {
    const genesis = {
      index: 0,
      timestamp: new Date().toISOString(),
      transactions: [],
      previousHash: '0',
      nonce: 0,
      hash: ''
    };
    genesis.hash = this._calculateHash(genesis);
    this.chain.push(genesis);
  }

  _calculateHash(block) {
    const data = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      transactions: block.transactions,
      previousHash: block.previousHash,
      nonce: block.nonce
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  _mineBlock(block) {
    const target = '0'.repeat(this.difficulty);
    while (block.hash.substring(0, this.difficulty) !== target) {
      block.nonce++;
      block.hash = this._calculateHash(block);
    }
    return block;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addTransaction(transaction) {
    const tx = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: transaction.type,
      data: transaction.data,
      actor: transaction.actor,
      signature: this._signTransaction(transaction)
    };
    this.pendingTransactions.push(tx);
    if (this.pendingTransactions.length >= 5) {
      return this.minePendingTransactions();
    }
    return { queued: true, transactionId: tx.id, pendingCount: this.pendingTransactions.length };
  }

  minePendingTransactions() {
    if (this.pendingTransactions.length === 0) {
      return { mined: false, reason: 'No pending transactions' };
    }
    const block = {
      index: this.chain.length,
      timestamp: new Date().toISOString(),
      transactions: [...this.pendingTransactions],
      previousHash: this.getLatestBlock().hash,
      nonce: 0,
      hash: ''
    };
    block.hash = this._calculateHash(block);
    const minedBlock = this._mineBlock(block);
    this.chain.push(minedBlock);
    const txCount = this.pendingTransactions.length;
    this.pendingTransactions = [];
    return {
      mined: true,
      blockIndex: minedBlock.index,
      blockHash: minedBlock.hash,
      transactionCount: txCount,
      nonce: minedBlock.nonce
    };
  }

  _signTransaction(transaction) {
    const payload = JSON.stringify({
      type: transaction.type,
      data: transaction.data,
      actor: transaction.actor,
      timestamp: new Date().toISOString()
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  verifyChain() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      if (current.hash !== this._calculateHash(current)) {
        return {
          valid: false,
          error: `Block ${i} hash mismatch`,
          blockIndex: i
        };
      }
      if (current.previousHash !== previous.hash) {
        return {
          valid: false,
          error: `Block ${i} previous hash mismatch`,
          blockIndex: i
        };
      }
    }
    return { valid: true, blocks: this.chain.length, lastBlock: this.getLatestBlock().hash };
  }

  getBlock(index) {
    if (index < 0 || index >= this.chain.length) {
      return null;
    }
    return this.chain[index];
  }

  getTransactionsByType(type) {
    const transactions = [];
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.type === type) {
          transactions.push({ ...tx, blockIndex: block.index, blockHash: block.hash });
        }
      }
    }
    return transactions;
  }

  getTransactionsByActor(actorId) {
    const transactions = [];
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.actor === actorId) {
          transactions.push({ ...tx, blockIndex: block.index, blockHash: block.hash });
        }
      }
    }
    return transactions;
  }

  getChainStats() {
    let totalTransactions = 0;
    const typeCounts = {};
    for (const block of this.chain) {
      totalTransactions += block.transactions.length;
      for (const tx of block.transactions) {
        typeCounts[tx.type] = (typeCounts[tx.type] || 0) + 1;
      }
    }
    return {
      totalBlocks: this.chain.length,
      totalTransactions,
      pendingTransactions: this.pendingTransactions.length,
      transactionsByType: typeCounts,
      chainValid: this.verifyChain().valid,
      latestBlockHash: this.getLatestBlock().hash,
      difficulty: this.difficulty
    };
  }

  recordBloodTransfer(transferData) {
    return this.addTransaction({
      type: 'BLOOD_TRANSFER',
      data: {
        transferId: transferData.transferId,
        fromHospital: transferData.fromHospital,
        toHospital: transferData.toHospital,
        bloodGroup: transferData.bloodGroup,
        units: transferData.units,
        timestamp: new Date().toISOString()
      },
      actor: transferData.initiatedBy
    });
  }

  recordDonation(donationData) {
    return this.addTransaction({
      type: 'DONATION',
      data: {
        donationId: donationData.donationId,
        donorId: donationData.donorId,
        hospitalId: donationData.hospitalId,
        bloodGroup: donationData.bloodGroup,
        volume: donationData.volume,
        timestamp: new Date().toISOString()
      },
      actor: donationData.donorId
    });
  }

  recordEmergencyRequest(requestData) {
    return this.addTransaction({
      type: 'EMERGENCY_REQUEST',
      data: {
        requestId: requestData.requestId,
        hospitalId: requestData.hospitalId,
        bloodGroup: requestData.bloodGroup,
        units: requestData.units,
        urgency: requestData.urgency,
        timestamp: new Date().toISOString()
      },
      actor: requestData.hospitalId
    });
  }

  recordInventoryChange(inventoryData) {
    return this.addTransaction({
      type: 'INVENTORY_CHANGE',
      data: {
        hospitalId: inventoryData.hospitalId,
        bloodGroup: inventoryData.bloodGroup,
        action: inventoryData.action,
        units: inventoryData.units,
        reason: inventoryData.reason,
        timestamp: new Date().toISOString()
      },
      actor: inventoryData.modifiedBy
    });
  }

  getAuditTrail(entityId, entityType) {
    const trail = [];
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        let match = false;
        if (entityType === 'hospital') {
          match = tx.data.hospitalId === entityId ||
                  tx.data.fromHospital === entityId ||
                  tx.data.toHospital === entityId;
        } else if (entityType === 'donor') {
          match = tx.data.donorId === entityId;
        } else if (entityType === 'transfer') {
          match = tx.data.transferId === entityId;
        }
        if (match) {
          trail.push({
            transactionId: tx.id,
            type: tx.type,
            data: tx.data,
            timestamp: tx.timestamp,
            blockIndex: block.index,
            blockHash: block.hash,
            signature: tx.signature
          });
        }
      }
    }
    return trail;
  }
}

const blockchainService = new BlockchainService();

module.exports = blockchainService;
