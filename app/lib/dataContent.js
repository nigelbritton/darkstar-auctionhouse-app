/**
 *
 *
 *
 */

'use strict';

const mySQL = require('mysql');
const connectionDetails = {
    connectionLimit : process.env.DATABASE_CONNECTION_LIMIT || 5,
    host     : process.env.DATABASE_HOST || '',
    user     : process.env.DATABASE_USER || '',
    password : process.env.DATABASE_PASSWORD || '',
    database : process.env.DATABASE_NAME || ''
};
const connectionPool = null;

if (connectionDetails.host !== '' &&
    connectionDetails.user !== '' &&
    connectionDetails.password !== '' &&
    connectionDetails.database !== '') {
    connectionPool = mySQL.createPool({
        connectionLimit : connectionDetails.connectionLimit,
        host     : connectionDetails.host,
        user     : connectionDetails.user,
        password : connectionDetails.password,
        database : connectionDetails.database
    });
}

let Database = {
    query: function ( query ) {
        return new Promise(function (success, reject) {
            if (!connectionPool) {
                reject();
            } else {
                connectionPool.getConnection(function(err, connection) {
                    if (err) { reject(); }
                    connection.query(query, function(err, rows) {
                        connection.release();
                        if (err) { reject(); }
                        else {
                            success(rows);
                        }
                    });
                });
            }
        });
    }
};

var exports = module.exports = {
    query: Database.query
};
