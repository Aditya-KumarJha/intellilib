import "dotenv/config";
import amqplib from "amqplib";

const rabbitUrl = process.env.RABBITMQ_URL;
const sourceQueue = process.env.DLQ_NAME || "library_notifications_dead_letter";
const targetQueue = process.env.MAIN_QUEUE_NAME || "library_notifications";
const limitArg = Number(process.argv[2] ?? "50");
const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.floor(limitArg) : 50;

if (!rabbitUrl) {
  console.error("RABBITMQ_URL is missing");
  process.exit(1);
}

async function replay() {
  const connection = await amqplib.connect(rabbitUrl);
  const channel = await connection.createChannel();

  await channel.assertQueue(sourceQueue, { durable: true });
  await channel.assertQueue(targetQueue, { durable: true });

  let moved = 0;

  while (moved < limit) {
    const msg = await channel.get(sourceQueue, { noAck: false });
    if (!msg) break;

    const headers = msg.properties?.headers || {};
    const nextHeaders = {
      ...headers,
      "x-replayed-at": new Date().toISOString(),
      "x-retry-count": 0,
    };

    channel.sendToQueue(targetQueue, msg.content, {
      persistent: true,
      contentType: msg.properties?.contentType || "application/json",
      headers: nextHeaders,
    });

    channel.ack(msg);
    moved += 1;
  }

  await channel.close();
  await connection.close();

  console.log(`Replayed ${moved} message(s) from ${sourceQueue} to ${targetQueue}.`);
}

replay().catch((error) => {
  console.error("Dead-letter replay failed:", error);
  process.exit(1);
});
