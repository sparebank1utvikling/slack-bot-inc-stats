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

export function addInc(user_name, text, category) {
  return client.query(
    `INSERT INTO incs (user_name, text, category) VALUES ($1, $2, $3)`,
    [user_name, text, category],
  );
}

export function getIncs(numberOfDaysAgo) {
  if (numberOfDaysAgo === undefined) {
    const query = {
      text: `SELECT * FROM incs`,
    };
    return client.query(query);
  } else {
    // Calculate the date range
    const dateAgo = new Date();
    dateAgo.setDate(dateAgo.getDate() - numberOfDaysAgo);
    const formattedDateAgo = dateAgo.toISOString(); // ISO8601 format

    // Construct the SQL query with parameterized query
    const query = {
      text: `SELECT * FROM incs WHERE created_at >= $1`,
      values: [formattedDateAgo],
    };
    return client.query(query);
  }
}

export async function getIncNumberByWeek() {
  // Query data from PostgreSQL
  const queryText = `
  SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS count
  FROM incs
  GROUP BY week
  ORDER BY week;
`;
  return await client.query(queryText);
}
