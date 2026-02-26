const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const messageRoutes = require("./routes/message.routes");
const conversationRoutes = require("./routes/conversation.routes");
const notificationRoutes = require("./routes/notification.routes");
const groupRoutes = require("./routes/group.routes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/groups", groupRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || "Internal server error",
  });
});

module.exports = app;
