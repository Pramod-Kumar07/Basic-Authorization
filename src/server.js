const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const paymentRoutes = require("./routes/payment.routes");
const requireAuth = require("./middleware/authMiddleware");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api", requireAuth, userRoutes);
app.use("/api", requireAuth, paymentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("app is running on port:", PORT);
});
