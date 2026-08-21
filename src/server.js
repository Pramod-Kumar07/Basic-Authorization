const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const requireAuth = require("./middleware/authMiddleware");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api", requireAuth, userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("app is running on port:", PORT);
});
