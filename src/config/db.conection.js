const mysql = require('mysql2/promise');
const dbConfig = require('./db.config');

async function createConnection() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.HOST,
      user: dbConfig.USER,
      password: dbConfig.PASSWORD,
      database: dbConfig.DB,
    });

    console.log('¡Conexión exitosa a la base de datos!');
    return connection;
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
    throw error;
  }
}

module.exports = createConnection;
