import "dotenv/config";
import amqplib from "amqplib";
import { Resend } from "resend";

const rabbitUrl = process.env.RABBITMQ_URL;
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM;
const queueName = "library_notifications";
const deadLetterQueueName = "library_notifications_dead_letter";
const maxRetryCount = 5;

if (!rabbitUrl) {
  console.error("RABBITMQ_URL is missing");
  process.exit(1);
}

if (!resendApiKey || !resendFrom) {
  console.error("RESEND_API_KEY or RESEND_FROM is missing");
  process.exit(1);
}

const resend = new Resend(resendApiKey);

async function handleMessage(message) {
  if (!message) return;

  const payload = JSON.parse(message.content.toString("utf8"));
  if (!payload.to || !payload.subject || !payload.html || !payload.text) {
    throw new Error("Invalid mail payload");
  }

  await resend.emails.send({
    from: resendFrom,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

async function startWorker() {
  const connection = await amqplib.connect(rabbitUrl);
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName, { durable: true });
  await channel.assertQueue(deadLetterQueueName, { durable: true });
  await channel.prefetch(10);

  console.log(`Listening on queue: ${queueName}`);

  channel.consume(queueName, async (message) => {
    if (!message) return;

    try {
      await handleMessage(message);
      channel.ack(message);
    } catch (error) {
      console.error("Failed processing message:", error);
      const headers = message.properties?.headers || {};
      const retryCount = Number(headers["x-retry-count"] || 0);

      if (retryCount < maxRetryCount) {
        channel.sendToQueue(queueName, message.content, {
          persistent: true,
          contentType: "application/json",
          headers: {
            ...headers,
            "x-retry-count": retryCount + 1,
          },
        });
        channel.ack(message);
        return;
      }

      channel.sendToQueue(deadLetterQueueName, message.content, {
        persistent: true,
        contentType: "application/json",
        headers: {
          ...headers,
          "x-retry-count": retryCount,
          "x-failed-at": new Date().toISOString(),
        },
      });
      channel.ack(message);
    }
  });
}

startWorker().catch((error) => {
  console.error("Notification worker failed:", error);
  process.exit(1);
});
