// Central export point for all blood inventory controllers
const crudOps = require('./crudOperations');
const stockMgmt = require('./stockManagement');
const unitOps = require('./unitOperations');
const emergency = require('./emergencyOperations');

module.exports = {
  ...crudOps,
  ...stockMgmt,
  ...unitOps,
  ...emergency
};
