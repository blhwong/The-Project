const mysql = require('mysql');
// const createTables = require('./schema.sql');
const mysqlConfig = require('./config.js');
// const Promise = require('bluebird');
const database = 'gewd';

if (process.env.NODE_ENV === 'production') {
  const connection = mysql.createConnection(process.env.CLEARDB_DATABASE_URL)
} else {
  const connection = mysql.createConnection(mysqlConfig);
}
