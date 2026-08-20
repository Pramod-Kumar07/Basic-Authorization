const pool = require("../config/db");

async function getUsers(req, res) {
  try {
    const users = await pool.query("select * from users");
    return res.status(200).json({
      status: 200,
      message: "Success",
      users: users.rows,
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Something went wrong!",
    });
  }
}

module.exports = { getUsers };
