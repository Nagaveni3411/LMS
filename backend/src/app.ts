import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { coursesRouter } from "./routes/courses.js";
import { enrollmentsRouter } from "./routes/enrollments.js";
import { progressRouter } from "./routes/progress.js";
import { errorHandler, notFound } from "./middleware/error.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/courses", coursesRouter);
app.use("/api", enrollmentsRouter);
app.use("/api/progress", progressRouter);

app.use(notFound);
app.use(errorHandler);
