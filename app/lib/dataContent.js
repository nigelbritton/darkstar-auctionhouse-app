/**
 *
 *
 *
 */

'use strict';

const mySQL = require('mysql');
const promise = require('promise');
const connectionDetails = {
    connectionLimit : process.env.DATABASE_CONNECTION_LIMIT || 1,
    host     : process.env.DATABASE_HOST || '',
    user     : process.env.DATABASE_USER || '',
    password : process.env.DATABASE_PASSWORD || '',
    database : process.env.DATABASE_NAME || ''
};
let connectionPool = null;

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
    /**
     * Usage
     * dataContent.query('select * from accounts')
     *   .then(function (result) {
     *      console.log(result);
     *   })
     *   .catch(function(err){
     *      console.log(err);
     *   });
     *
     * @param {string} query
     */
    query: function ( query ) {
        return new promise(function (success, reject) {
            if (!connectionPool) {
                reject(new Error('No database settings / connection.'));
            } else {
                connectionPool.getConnection(function(err, connection) {
                    if (err) { reject(err); }
                    else {
                        connection.query(query, function(err, rows) {
                            connection.release();
                            if (err) { reject(err); }
                            else {
                                success(rows);
                            }
                        });
                    }
                });
            }
        });
    },

    /**
     * Insert
     *
     * Usage
     * dataContent.query('table_name', { field_1: '', field_2: 2, field_3: false });
     *
     * @param {string} table
     * @param {object} fields
     */
    insert: function ( table, fields ) {
        return new promise(function (success, reject) {
            if (!connectionPool) {
                reject(new Error('No database settings / connection.'));
            } else {
                connectionPool.getConnection(function(err, connection) {
                    if (err) { reject(err); }
                    else {

                        let field_names = Object.keys(fields).map(x => `\`${x}\``).join();
                        let field_values = Object.values(fields).map(x => typeof(x) == 'string' ? "'"+x.replace("'", "\\'") + "'" : x).join();
                        let query = `INSERT INTO ${table} (${field_names}) VALUES(${field_values});`;

                        connection.query(query, function(err, rows) {
                            connection.release();
                            if (err) { reject(err); }
                            else {
                                success(rows);
                            }
                        });
                    }
                });
            }
        });
    }

};

var exports = module.exports = {
    query: Database.query,
    insert: Database.insert
};
