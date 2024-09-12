import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Client } = pkg;
// Database connection details
const client = new Client({ connectionString: process.env.DATABASE_URL });

client
  .connect()
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.error("Connection error", err.stack));

try {
  // Create a table
  await client.query(`
        CREATE TABLE IF NOT EXISTS incs (
          id SERIAL PRIMARY KEY,
          user_name VARCHAR(50),
          text VARCHAR(1000) UNIQUE NOT NULL,
          category VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
  console.log("Table created successfully");
} catch (err) {
  console.error("Error initializing database:", err.stack);
} finally {
  await client.end();
}