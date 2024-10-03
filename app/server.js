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
import { ChartJSNodeCanvas } from "chartjs-node-canvas"; // Import Chart.js

const { App, SocketModeReceiver } = pkg;
dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN, // Bot user token
  receiver: new SocketModeReceiver({
    appToken: process.env.SOCKET_TOKEN, // App-level token
  }),
});

// Set up the ChartJSNodeCanvas instance
const chartWidth = 800;
const chartHeight = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: chartWidth,
  height: chartHeight,
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

app.event("message", async ({ event, client }) => {
  // Check if the message is a new message
  if (event.subtype || (event.thread_ts && event.thread_ts !== event.ts)) {
    // Ignore everything except new messages
    return;
  }

  const encodedText = btoa(event.text);
  console.log("Posting an ephemeral message to user:", event.user, "in channel:", event.channel);

  try {
    // Respond with an ephemeral message containing a dropdown menu
    await client.chat.postEphemeral({
      channel: event.channel, // The channel where the message was posted
      user: event.user, // The user who triggered the event
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

    console.log("Ephemeral message posted successfully");
  } catch (error) {
    console.error("Error posting ephemeral message:", error);
  }
});

// Listen for when the user clicks the dropdown and fetch categories
app.options(/category_select-.*/, async ({ options, ack }) => {
  try {
    // Fetch the list of categories dynamically
    const categories = (await getCategoriesArray()) ?? [];

    // Get the user input from the options.value field
    const userInput = options.value || "";

    // If no input is provided, return all categories
    const filteredCategories = userInput
      ? categories.filter((category) =>
          category.toLowerCase().includes(userInput.toLowerCase())
        )
      : categories;

    // Format the options
    const optionsList = filteredCategories.map((category) => ({
      text: {
        type: "plain_text",
        text: category,
      },
      value: category,
    }));

    // Acknowledge the request and provide the filtered options
    await ack({
      options: optionsList,
    });

    console.log("Dropdown options provided:", optionsList);
  } catch (error) {
    console.error("Error fetching and filtering dropdown options:", error);
  }
});

// Listen for the interaction from the dropdown menu
app.action(/category_select-.*/, async ({ body, ack }) => {
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
            alt_text: "Incidents per Category",
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

  // Create the chart configuration
  const chartConfig = {
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
  };


  // Render the chart and get the image as JPEG
  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig, {
    format: 'jpeg', // Change format to JPEG
    width: 400, // Set width
    height: 200, // Set height
    quality: 0.5, // Set quality (0 to 1)
  });
  // Convert the image buffer to a base64 string
  const imageBase64 = imageBuffer.toString('base64');
  console.log("imageBase64", imageBase64.length);
  // Return the URL for Slack (using a data URL)
  return `data:image/png;base64,${imageBase64}`;
}

async function generateIncByCategoryChart(numberOfDays) {
  const dbResponse = await getIncByCategory(numberOfDays);
  const sortedCategories = dbResponse.rows.sort((a, b) => b.count - a.count); 

  const labels = sortedCategories.map((row) => row.category);
  const data = sortedCategories.map((row) => parseInt(row.count, 10));

  // Create the chart configuration
  const chartConfig = {
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
        x: {
          ticks: {
            autoSkip: false, // Show all labels
            maxTicksLimit: labels.length,
          },
        },
        y: {
          beginAtZero: true,
          min: 0,
          stepSize: 1,
        },
      },
    },
  };

  // Render the chart and get the image as JPEG
  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig, {
    format: 'jpeg', // Change format to JPEG
    width: 400, // Set width
    height: 200, // Set height
    quality: 0.5, // Set quality (0 to 1)
  });
  // Convert the image buffer to a base64 string
  const imageBase64 = imageBuffer.toString('base64');
  console.log("imageBase64", imageBase64.length);
  // Return the URL for Slack (using a data URL)
  return `data:image/png;base64,${imageBase64}`;
}
