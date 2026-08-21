const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 400,
        message: "NAme, email and password are mandatory.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 400,
        message: "Password must be atleast 6 characters.",
      });
    }

    const existingUser = await pool.query(
      "select id from users where email = $1",
      [email.toLowerCase()],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: 409,
        message: "User already exists.",
      });
    }

    const passHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `insert into users (name, email, password_hash)
        values ($1, $2, $3)
        returning id, name, email, created_at`,
      [name.trim(), email.toLowerCase().trim(), passHash],
    );

    return res.status(201).json({
      status: 201,
      message: "User created successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "User can not be registered",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 400,
        message: "Email and password are required.",
      });
    }

    const result = await pool.query("select * from users where email = $1", [
      email.toLowerCase().trim(),
    ]);

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        status: 401,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        status: 401,
        message: "Invalid email or password.",
      });
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );

    return res.status(200).json({
      status: 200,
      message: "Login successful",
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Can not login.",
    });
  }
}

module.exports = { register, login };
