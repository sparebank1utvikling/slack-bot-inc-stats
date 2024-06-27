import pkg from "pg";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker"; 
dotenv.config();

const { Client } = pkg;
// Database connection details
const client = new Client({ connectionString: process.env.DATABASE_URL });

const categories = ['category_1', 'category_2', 'category_3', 'category_4', 'category_5', 'category_6', 'category_7', 'category_8', 'category_9', 'category_10', 'category_11', 'category_12', 'category_13', 'category_14', 'category_15'];

function getRandomCategory() {
    const randomIndex = Math.floor(Math.random() * categories.length);
    return categories[randomIndex];
  }

async function insertTestINCs() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
  
    try {
      await client.connect();
      console.log("Connected to the database");
  
      // Generate 100 test INCs
      const incs = [];
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
  
      for (let i = 0; i < 100; i++) {
        const createdAt = new Date(
          threeMonthsAgo.getTime() +
            Math.random() * (now.getTime() - threeMonthsAgo.getTime())
        );
        incs.push({
          user_name: faker.internet.userName(),
          text: faker.lorem.sentence(),
          category: getRandomCategory(),
          created_at: createdAt.toISOString()
        });
      }
  
      // Insert the INCs into the database
      for (const inc of incs) {
        await client.query(
          `
            INSERT INTO incs (user_name, text, category, created_at)
            VALUES ($1, $2, $3, $4)
          `,
          [inc.user_name, inc.text, inc.category, inc.created_at]
        );
      }
  
      console.log("100 test INCs inserted successfully");
    } catch (err) {
      console.error("Error inserting test INCs:", err.stack);
    } finally {
      await client.end();
    }
  }

  async function deleteAllINCs() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
  
    try {
      await client.connect();
      console.log("Connected to the database");
  
      // Delete all INCs from the table
      await client.query(`
        DELETE FROM incs
      `);
      
      console.log("All INCs have been deleted successfully");
    } catch (err) {
      console.error("Error deleting INCs:", err.stack);
    } finally {
      await client.end();
    }
  }
  
  // Run the function to delete all INCs
  deleteAllINCs();
  
  // Run the function to insert test INCs
  insertTestINCs();
  