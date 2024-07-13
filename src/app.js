import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes import

import userRouter from "./routes/user.routes.js";

//routes declaration
//app.get(); // here you can't use the router as they are in other file and you are importing it. Hence you need to use Middleware.
app.use("/api/v1/users", userRouter); //this will act as prefix
// http://localhost:8000/api/vi/users/register and registerUser method will be called

export { app };
