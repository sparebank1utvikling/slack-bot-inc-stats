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

  //Currently this relies on the text to be unique. This is not optimal but couldnt find another way to do it TODO: could be done better
  export function addOrUpdateInc(user_name, text, category) {
    return client.query(
      `INSERT INTO incs (user_name, text, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (text)
       DO UPDATE SET
         user_name = EXCLUDED.user_name,
         category = EXCLUDED.category`,
      [user_name, text, category],
    );
  }

export function addCategory(category_name) {
  return client.query(
    `INSERT INTO categories (category_name)
     VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`,
    [category_name],
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

export function getIncByCategory(numberOfDaysAgo){
  if (numberOfDaysAgo === undefined) {
    const query = {
      text: `SELECT category, COUNT(*) FROM incs GROUP BY category`,
    };
    return client.query(query);
}
else {
  // Calculate the date range
  const dateAgo = new Date();
  dateAgo.setDate(dateAgo.getDate() - numberOfDaysAgo);
  const formattedDateAgo = dateAgo.toISOString(); // ISO8601 format

  // Construct the SQL query with parameterized query
  const query = {
    text: `SELECT category, COUNT(*) FROM incs WHERE created_at >= $1 GROUP BY category;`,
    values: [formattedDateAgo],
  };
  return client.query(query);
}
}

export async function getIncNumberByWeek(numberOfDaysAgo) {
  let queryText;

  if (numberOfDaysAgo === undefined) {
    queryText = `
      SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS count
      FROM incs
      GROUP BY week
      ORDER BY week;
    `;
  } else {
    // Calculate the date range
    const dateAgo = new Date();
    dateAgo.setDate(dateAgo.getDate() - numberOfDaysAgo);
    const formattedDateAgo = dateAgo.toISOString(); // ISO8601 format

    // Construct the SQL query with parameterized query
    queryText = {
      text: `
        SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) AS count
        FROM incs
        WHERE created_at >= $1
        GROUP BY week
        ORDER BY week;
      `,
      values: [formattedDateAgo],
    };
  }

  return await client.query(queryText);
}

export async function getCategoriesArray() {
  try {
    const result = await client.query("SELECT category_name FROM categories");
    const categories = result.rows.map(row => row.category_name);
    console.log("categories", categories);
    return categories;
  } catch (err) {
    console.error("Error fetching categories", err);
  }
}
