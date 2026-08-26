const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
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
    const { email, password, token } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 400,
        message: "Email and password are required.",
      });
    }

    //Google recaptcha v3 implementation start
    if (!token) {
      return res.status(400).json({
        status: 400,
        message: "Google recaptcha token is required.",
      });
    }

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        }),
      },
    );

    const recaptchaRes = await response.json();
    console.log({ recaptchaRes });

    if (!recaptchaRes.success || recaptchaRes.score < 0.7) {
      return res.status(400).json({
        status: 400,
        message: "Google recaptcha validation failed.",
      });
    }

    //Google recaptcha implementation end
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

    const refreshToken = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await pool.query(
      `insert into refresh_tokens (user_id, token_hash, expires_at) 
       values ($1, $2, now() + interval '7 days')`,
      [user.id, refreshTokenHash],
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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

async function refresh(req, res) {
  try {
    const refershToken = req.cookies.refreshToken;
    if (!refershToken) {
      return res.status(401).json({
        status: 401,
        message: "Refresh token is required.",
      });
    }

    const decoded = jwt.verify(refershToken, process.env.JWT_REFRESH_SECRET);

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refershToken)
      .digest("hex");

    const tokenResult = await pool.query(
      `select id from refresh_tokens where user_id = $1 and token_hash = $2 and expires_at > now()`,
      [decoded.userId, refreshTokenHash],
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        status: 401,
        message: "Invalid refresh token!",
      });
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );

    return res.json({ accessToken });
  } catch (error) {
    return res.status(401).json({
      status: 401,
      message: "Invalid or expired refresh token!",
    });
  }
}

async function logout(req, res) {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await pool.query(`delete from refresh_tokens where token_hash = $1`, [
      tokenHash,
    ]);
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({
    status: 200,
    message: "Logged out successfully!",
  });
}
module.exports = { register, login, refresh, logout };
