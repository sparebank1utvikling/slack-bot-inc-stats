import pkg from "@slack/bolt";
import dotenv from "dotenv";
import {
  addOrUpdateInc,
  getIncs,
  getIncNumberByWeek,
  getIncByCategory,
  getCategoriesArray,
  addCategory,
} from "./db.js";
import QuickChart from "quickchart-js";

const { App, SocketModeReceiver } = pkg;
dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN, // Bot user token
  receiver: new SocketModeReceiver({
    appToken: process.env.SOCKET_TOKEN, // App-level token
  }),
});

app.command("/addcategory", async ({ command, ack, respond }) => {
  await ack(); // Acknowledge the command

  const categoryName = command.text.trim();
  console.log(`Category Name: '${categoryName}'`);

  if (!categoryName) {
    return respond({
      text: "Please provide a category name.",
    });
  }

  try {
    // Insert the new category into the database
    const result = await addCategory(categoryName);

    if (result.rowCount > 0) {
      return respond({
        text: `Category '${categoryName}' has been added successfully.`,
      });
    } else {
      return respond({
        text: `Category '${categoryName}' already exists.`,
      });
    }
  } catch (error) {
    console.error("Error inserting category:", error);
    return respond({
      text: "There was an error adding the category. Please try again later.",
    });
  }
});

// Add your event listeners
app.event("message", async ({ event, client }) => {
  // Check if the message is a reply (i.e., it has a thread_ts field)
  if (event.thread_ts) {
    // Ignore replies
    return;
  }
  const encodedText = btoa(event.text);
  try {
    // Respond with a message containing a dropdown menu
    await client.chat.postMessage({
      channel: event.channel,
      text: `Hello, <@${event.user}>! Please choose a category:`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Please choose a category from the dropdown menu below:",
          },
          accessory: {
            type: "external_select",
            action_id: `category_select-${encodedText}`,
            placeholder: {
              type: "plain_text",
              text: "Select a category",
            },
            min_query_length: 0,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Error posting message:", error);
  }
});

// Listen for when the user clicks the dropdown and fetch categories
app.options(/category_select-.*/, async ({ options, ack }) => {
  try {
    // Fetch the list of categories dynamically
    const categories = (await getCategoriesArray()) ?? [];

    // Format the options
    const optionsList = categories.map((category) => ({
      text: {
        type: "plain_text",
        text: category,
      },
      value: category,
    }));

    // Acknowledge the request and provide the options
    await ack({
      options: optionsList,
    });

    console.log("Dropdown options provided:", optionsList);
  } catch (error) {
    console.error("Error fetching dropdown options:", error);
  }
});

// Listen for the interaction from the dropdown menu
app.action(/category_select-.*/, async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  console.log("body", body);
  const text = atob(body.actions[0].action_id.split("-")[1]);
  console.log("text", text);
  // Respond to the user's selection
  const selectedCategory = body.actions[0].selected_option.text.text;
  const dropdown_id = body.actions[0].action_id;
  addOrUpdateInc(body.user.username, text, selectedCategory, dropdown_id);
});


app.command("/inc_stats", async ({ ack, body, client }) => {
  // Acknowledge the command request
  await ack();

  const numbers = body.text.match(/\d+/);
  const numberOfDays = numbers ? parseInt(numbers[0]) : undefined;

  const dbResponse = await getIncs(numberOfDays);

  const totalIncs = dbResponse.rows.length;
  

  const chartUrlByWeek = await generateIncByWeekChart(numberOfDays);
  const chartUrlByCategory = await generateIncByCategoryChart(numberOfDays);

  // Post a response in the channel where the command was invoked
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "inc_stats_modal",
        title: {
          type: "plain_text",
          text: `Inc stats ${numberOfDays ? `siste ${numberOfDays} dager` : ""}`,
        },
        blocks: [
          {
            type: "section",
            block_id: "total_count",
            text: {
              type: "mrkdwn",
              text: `Total incs: ${totalIncs}`,
            },
          },
          {
            type: "image",
            image_url: chartUrlByCategory,
            alt_text: "Incidents per Week",
          },
          {
            type: "image",
            image_url: chartUrlByWeek,
            alt_text: "Incidents per Week",
          },
        ],
      },
    });
  } catch (error) {
    console.error("Error posting message:", error);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app started");
})();

async function generateIncByWeekChart(numberOfDays) {
  const incNumberByWeek = await getIncNumberByWeek(numberOfDays);

  // Prepare data for the chart
  const labels = incNumberByWeek.rows.map(
    (row) => row.week.toISOString().split("T")[0],
  );
  const data = incNumberByWeek.rows.map((row) => parseInt(row.count, 10));

  // Generate the bar chart URL using QuickChart
  const chart = new QuickChart();
  chart.setConfig({
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Incidents per Week",
          data: data,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
  chart.setWidth(800);
  chart.setHeight(400);
  return chart.getUrl();
}

async function generateIncByCategoryChart(numberOfDays) {
  const dbResponse = await getIncByCategory(numberOfDays);

  const labels = dbResponse.rows.map((row) => row.category);
  const data = dbResponse.rows.map((row) => parseInt(row.count, 10));

  // Generate the bar chart URL using QuickChart
  const chart = new QuickChart();
  chart.setConfig({
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Incidents by category",
          data: data,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
  chart.setWidth(800);
  chart.setHeight(400);
  return chart.getUrl();
}
