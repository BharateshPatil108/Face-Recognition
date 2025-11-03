const mysql = require('mysql2');

// Create a connection pool (recommended for better performance)
const pool = mysql.createPool({
  host: 'localhost',    // Change to your MySQL server host (e.g., '127.0.0.1' or remote server)
  port: 3306, 
  user: 'root',         // Your MySQL username
  password: 'root$321',         // Your MySQL password
  database: 'facerecongination', // Your database name
  waitForConnections: true,
  connectionLimit: 10,  // Number of connections in pool
  queueLimit: 0
});

// Export the pool for use in other files
module.exports = pool.promise();
