import "dotenv/config";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fs from "fs";
import { exec } from "child_process";
import { track } from "./lib/hog";
import { getEmails } from "./lib/imap";
import { checkToken } from "./lib/jwt";
import { prisma } from "./prisma";
import { registerRoutes } from "./routes";

const logFilePath = "./logs.log";
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

const server: FastifyInstance = Fastify({
  logger: {
    stream: logStream,
  },
  disableRequestLogging: true,
  trustProxy: true,
});

const registerPlugins = async () => {
  await server.register(multipart);
  await server.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });
};

registerRoutes(server);

server.get(
  "/",
  {
    schema: {
      tags: ["health"],
      description: "Health check endpoint",
      response: {
        200: {
          type: "object",
          properties: {
            healthy: { type: "boolean" },
          },
        },
      },
    },
  },
  async function (request, reply) {
    reply.send({ healthy: true });
  }
);

server.addHook("preHandler", async function (request: any, reply: any) {
  try {
    if (
      (request.url === "/api/v1/auth/login" && request.method === "POST") ||
      (request.url === "/api/v1/ticket/public/create" && request.method === "POST")
    ) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const [, bearer] = authHeader.split(" ");
    if (!bearer) {
      throw new Error("Invalid authorization format");
    }

    checkToken(bearer);
  } catch (err: any) {
    server.log.error("Auth error:", err.message || err);
    reply.status(401).send({
      message: "Unauthorized",
      success: false,
    });
  }
});

const start = async () => {
  try {
    await registerPlugins();

    await new Promise<void>((resolve, reject) => {
      exec("npx prisma migrate deploy", (err, stdout, stderr) => {
        if (err) {
          console.error("prisma migrate deploy error:", err);
          reject(err);
          return;
        }
        console.log("migrate deploy:", stdout);

        exec("npx prisma generate", (err, stdout, stderr) => {
          if (err) {
            console.error("prisma generate error:", err);
            reject(err);
            return;
          }
          console.log("prisma generate:", stdout);

          exec("npx prisma db seed", (err, stdout, stderr) => {
            if (err) {
              console.error("prisma db seed error:", err);
              reject(err);
              return;
            }
            console.log("prisma db seed:", stdout);
            resolve();
          });
        });
      });
    });

    await prisma.$connect();
    server.log.info("Connected to Prisma");

    const port = 5003;
    await server.listen({ port: Number(port), host: "0.0.0.0" });

    const client = track();
    client.capture({
      event: "server_started",
      distinctId: "uuid",
    });
    client.shutdownAsync();

    console.info(`Server listening on http://0.0.0.0:${port}`);

    setInterval(() => getEmails(), 10000);
  } catch (err) {
    server.log.error("Startup error:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
