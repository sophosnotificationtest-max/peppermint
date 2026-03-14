import "dotenv/config";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multer from "fastify-multer";
import fs from "fs";
import { exec } from "child_process";
import { track } from "./lib/hog";
import { getEmails } from "./lib/imap";
import { checkToken } from "./lib/jwt";
import { prisma } from "./prisma";
import { registerRoutes } from "./routes";

// Garanta que o diretório de logs existe
const logFilePath = "./logs.log";
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

// Inicializa o Fastify com logger customizado
const server: FastifyInstance = Fastify({
  logger: {
    stream: logStream,
  },
  disableRequestLogging: true,
  trustProxy: true,
});

// Registra o parser de multipart/form-data (multer) - sem await aqui
server.register(multer.contentParser);

// Registra todas as rotas
registerRoutes(server);

// Endpoint de health check
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

// Hook de autenticação JWT (exceto rotas públicas)
server.addHook("preHandler", async function (request: any, reply: any) {
  try {
    // Rotas públicas sem autenticação
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

    const bearer = authHeader.split(" ")[1];
    checkToken(bearer);
  } catch (err) {
    reply.status(401).send({
      message: "Unauthorized",
      success: false,
    });
  }
});

const start = async () => {
  try {
    // Registra o CORS **dentro da função async** (resolve top-level await)
    // @ts-ignore - bypass temporário para mismatch de tipos no Fastify (comum em v4/v5)
    await server.register(cors, {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    } as const);

    // Executa prisma migrate deploy, generate e seed (sequencial)
    await new Promise<void>((resolve, reject) => {
      exec("npx prisma migrate deploy", (err, stdout, stderr) => {
        if (err) {
          console.error("Migrate deploy error:", err);
          reject(err);
          return;
        }
        console.log(stdout);
        console.error(stderr);

        exec("npx prisma generate", (err, stdout, stderr) => {
          if (err) {
            console.error("Prisma generate error:", err);
            reject(err);
            return;
          }
          console.log(stdout);
          console.error(stderr);

          exec("npx prisma db seed", (err, stdout, stderr) => {
            if (err) {
              console.error("Seed error:", err);
              reject(err);
              return;
            }
            console.log(stdout);
            console.error(stderr);
            resolve();
          });
        });
      });
    });

    // Conecta ao banco
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

    // Intervalo para checar emails
    setInterval(() => getEmails(), 10000);
  } catch (err) {
    server.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
