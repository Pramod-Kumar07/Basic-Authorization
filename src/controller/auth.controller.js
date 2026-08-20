const pool = require("../config/db");
const bcrypt = require("bcryptjs");

async function register(req, res) {
  console.log("hellooooooooo", req.body);
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
    console.log(error);
    return res.status(500).json({
      status: 500,
      message: "User can not be registered",
    });
  }
}

module.exports = { register };
