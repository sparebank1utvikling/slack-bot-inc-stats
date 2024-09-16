import pkg from "@slack/bolt";
import dotenv from "dotenv";
import { addOrUpdateInc, getIncs, getIncNumberByWeek, getIncByCategory, getCategoriesArray, addCategory } from "./db.js";
import QuickChart from 'quickchart-js';

const { App, SocketModeReceiver } = pkg;
dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN, // Bot user token
  receiver: new SocketModeReceiver({
    appToken: process.env.SOCKET_TOKEN, // App-level token
  }),
});

const categories = await getCategoriesArray() ?? [];

app.command('/addcategory', async ({ command, ack, respond }) => {
  await ack(); // Acknowledge the command

  const categoryName = command.text.trim();

  if (!categoryName) {
    return respond({
      text: "Please provide a category name.",
    });
  }

  try {
    // Insert the new category into the database
    const result = await addCategory(categoryName)

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

app.event("app_home_opened", async ({ event, client }) => {
  try {
    /* view.publish is the method that your app uses to push a view to the Home tab */
    await client.views.publish({
      /* the user that opened your app's app home */
      user_id: event.user,

      /* the view object that appears in the app home*/
      view: {
        type: "home",
        callback_id: "home_view",

        /* body of the view */
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Welcome to your _App's Home tab_* :tada:",
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "This is a section block with a button."
            },
            accessory: {
              type: "button",
              text: {
                type: "plain_text",
                text: "Click me!"
              },
              action_id: "button_click"
            }
          }
        ],
      },
    });
  }
  catch (error) {
    console.error(error);
  }

});

// Add your event listeners
app.event("message", async ({ event, client, context }) => {
  console.log("Message received:", event);
  const encodedText = btoa(event.text);
  console.log("encodedText", encodedText);
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
            type: "static_select",
            action_id: `category_select-${encodedText}`,
            placeholder: {
              type: "plain_text",
              text: "Select a category",
            },
            options: categories.map((category) => ({
              text: {
                type: "plain_text",
                text: category,
              },
              value: category,
            })),
          },
        },
      ],
    });
  } catch (error) {
    console.error("Error posting message:", error);
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
  await say(`You selected: ${selectedCategory}`);
  addOrUpdateInc(body.user.username, text, selectedCategory);
});

app.command("/inc_stats", async ({ ack, body, client }) => {
  // Acknowledge the command request
  await ack();
  console.log("body", body);

  const numbers = body.text.match(/\d+/);
  const numberOfDays = numbers ? parseInt(numbers[0]) : undefined;
  console.log("Extracted number:", numberOfDays);

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
            type: 'image',
            image_url: chartUrlByCategory,
            alt_text: 'Incidents per Week'
          },
          {
            type: 'image',
            image_url: chartUrlByWeek,
            alt_text: 'Incidents per Week'
          }
        ],
      },
    });
  } catch (error) {
    console.error("Error posting message:", error);
  }
});

app.event("app_home_opened", async ({ event, client, context }) => {
  try {
    const dbResponse = await getIncs();
    /* view.publish is the method that your app uses to push a view to the Home tab */
    await client.views.publish({
      /* the user that opened your app's app home */
      user_id: event.user,

      /* the view object that appears in the app home*/
      view: {
        type: "home",
        callback_id: "home_view",

        /* body of the view */
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Welcome to your _App's Home tab_* :tada:",
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: dbResponse.rows
                .map((row) => `${row.text} (${row.category})`)
                .join("\n"),
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Click me!",
                },
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error(error);
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Bolt app started");
})();


async function generateIncByWeekChart(numberOfDays){

  const incNumberByWeek = await getIncNumberByWeek(numberOfDays);

  // Prepare data for the chart
  const labels = incNumberByWeek.rows.map(row => row.week.toISOString().split('T')[0]);
  const data = incNumberByWeek.rows.map(row => parseInt(row.count, 10));

   // Generate the bar chart URL using QuickChart
  const chart = new QuickChart();
  chart.setConfig({
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Incidents per Week',
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  chart.setWidth(800);
  chart.setHeight(400);
  return chart.getUrl();
}

async function generateIncByCategoryChart(numberOfDays){
  const dbResponse = await getIncByCategory(numberOfDays);

  const labels = dbResponse.rows.map(row => row.category);
  const data = dbResponse.rows.map(row => parseInt(row.count, 10));

   // Generate the bar chart URL using QuickChart
  const chart = new QuickChart();
  chart.setConfig({
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Incidents by category',
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  chart.setWidth(800);
  chart.setHeight(400);
  return chart.getUrl();
}