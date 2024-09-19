import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pkg;

// Database connection details
const client = new Client({host:"sbu-incstats-nea-psql.postgres.database.azure.com", user:"pmbetaling", password:process.env.DATABASE_PASSWORD, database:"postgres", port:5432});

client
  .connect()
  .then(() => console.log("Connected to the database"))
  .catch((err) => console.error("Connection error", err.stack));

  export function addOrUpdateInc(user_name, text, category, dropdown_id) {
    return client.query(
      `INSERT INTO incs (user_name, text, category, dropdown_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (dropdown_id) 
       DO UPDATE SET user_name = EXCLUDED.user_name, text = EXCLUDED.text, category = EXCLUDED.category`,
      [user_name, text, category, dropdown_id],
    );
  }


  export async function addCategory(category_name) {
    try {
      const result = await client.query(
        `INSERT INTO categories (name)
         VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`,
        [category_name]
      );
      return result;  // Return the result of the query
    } catch (error) {
      console.error("Error inserting category:", error);
      throw error;  // Re-throw error to be caught in the command handler
    }
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
    const result = await client.query("SELECT name FROM categories");
    const categories = result.rows.map(row => row.name);
    console.log("categories", categories);
    return categories;
  } catch (err) {
    console.error("Error fetching categories", err);
  }
}
