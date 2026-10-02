import dns from "dns";
import "dotenv/config";
import app from "./App.js";
import { connectDB, disconnectDB } from "./config/db.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT,"0.0.0.0",() => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        try {
          await disconnectDB();

          console.log("Server and database connection closed.");
          process.exit(0);
        } catch (error) {
          console.error(`Shutdown failed: ${error.message}`);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();