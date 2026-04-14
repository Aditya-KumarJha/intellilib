import { NextResponse } from "next/server";
import amqplib from "amqplib";

const mainQueue = "library_notifications";
const deadLetterQueue = "library_notifications_dead_letter";

export async function GET(req: Request) {
  const token = req.headers.get("x-scheduler-token");
  const expected = process.env.RESERVATION_SCHEDULER_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    return NextResponse.json(
      {
        ok: false,
        rabbitmqConfigured: false,
        queues: null,
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  let connection: amqplib.ChannelModel | null = null;
  try {
    connection = await amqplib.connect(rabbitUrl);
    const channel = await connection.createChannel();

    const [main, dead] = await Promise.all([
      channel.checkQueue(mainQueue),
      channel.checkQueue(deadLetterQueue),
    ]);

    await channel.close();

    return NextResponse.json({
      ok: true,
      rabbitmqConfigured: true,
      queues: {
        main: {
          name: mainQueue,
          messageCount: main.messageCount,
          consumerCount: main.consumerCount,
        },
        deadLetter: {
          name: deadLetterQueue,
          messageCount: dead.messageCount,
          consumerCount: dead.consumerCount,
        },
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown worker health error";
    return NextResponse.json(
      {
        ok: false,
        rabbitmqConfigured: true,
        error: message,
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  } finally {
    await connection?.close().catch(() => undefined);
  }
}
