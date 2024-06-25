// const express = require("express");
// const sql = require("mssql/msnodesqlv8");
// const multer = require("multer");
// const nodemailer = require("nodemailer");
// const session = require("express-session");
// const cookieParser = require("cookie-parser");
// const cors = require("cors");
// const bodyParser = require("body-parser");

// const app = express();

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// app.use(
//   cors({
//     origin: "*",
//     methods: "GET,POST,PUT",
//     credentials: true,
//   })
// );

// const storage = multer.memoryStorage();

// const config = {
//   user: "fg_minterior",
//   password: "@J220a3qq",
//   server: "146.88.24.73",
//   database: "lissom_minterior1",
// };

// let pool;

// async function initializePool() {
//   try {
//     pool = await sql.connect(config);
//     console.log("Database connected successfully!");
//   } catch (error) {
//     console.error("Error connecting to the database:", error);
//   }
// }

// // Call initializePool function to set up the database connection pool
// initializePool();

// sql
//   .connect(config)
//   .then(() => {
//     console.log("Database connected successfully!");
//   })
//   .catch((error) => {
//     console.error("Error connecting to the database:", error);
//   });

// // Define a route for handling login requests
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Query the Tbl_staff table to find a matching user
//     const result = await pool.request()
//       .input('email', sql.NVarChar, email)
//       .input('password', sql.NVarChar, password)
//       .query('SELECT * FROM Tbl_Staff WHERE Email = @email AND Password = @password');

//     // If a user with the provided credentials is found
//     if (result.recordset.length > 0) {
//       const user = result.recordset[0];
//       res.status(200).json({ message: 'Login successful', user });
//     } else {
//       res.status(401).json({ error: 'Invalid email or password' });
//     }
//   } catch (error) {
//     console.error('Error during login:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// app.get('/projects', async (req, res) => {
//   try {
//     const result = await pool.request().query('SELECT * FROM Tbl_Projects');
//     res.status(200).json(result.recordset);
//   } catch (error) {
//     console.error('Error fetching data from Tbl_Projects:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// app.get('/announcements', async (req, res) => {
//   try {
//     const result = await pool.request().query('SELECT * FROM Tbl_announcements');
//     res.status(200).json(result.recordset);
//   } catch (error) {
//     console.error('Error fetching data from Tbl_Projects:', error);

//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// app.get('/todo_items', async (req, res) => {
//   try {
//     const result = await pool.request().query('SELECT * FROM Tbl_todo_items');
//     res.status(200).json(result.recordset);
//   } catch (error) {
//     console.error('Error fetching data from Tbl_Projects:', error);

//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// app.get('/task_details', async (req, res) => {
//   try {
//     const result = await pool.request().query('SELECT * FROM Tbl_TaskDetails');
//     res.status(200).json(result.recordset);
//   } catch (error) {
//     console.error('Error fetching data from Tbl_Projects:', error);

//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

//...................................................................................................

// app.get("/leaveRequestCount", async (req, res) => {
//   try {
//     const staffId = req.session.staffId;

//     if (!staffId) {
//       return res.status(401).json({ error: "Not authorized" });
//     }

//     const leaveRequestCount = await pool
//       .request()
//       .input("staffId", sql.Int, staffId).query(`
//         SELECT COUNT(*) AS TotalLeaveRequests 
//         FROM Tbl_LeaveRequest
//         WHERE Staffid = @staffId
//       `);

//     res.status(200).json({
//       leaveRequestCount: leaveRequestCount.recordset[0].TotalLeaveRequests,
//     });
//   } catch (error) {
//     console.error("Error counting leave requests:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// app.get("/announcements", async (req, res) => {
//   try {
//     const result = await pool
//       .request()
//       .query("SELECT * FROM Tbl_announcements");
//     res.status(200).json(result.recordset);
//   } catch (error) {
//     console.error("Error fetching data from Tbl_Projects:", error);

//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// app.get("/announcements", async (req, res) => {
//   try {
//     const result = await pool
//       .request()
//       .query("SELECT * FROM Tbl_announcements ORDER BY announcement_id DESC");
//     res.status(200).json(result.recordset);
//   } catch (error) {
//     console.error("Error fetching data from Tbl_announcements:", error);

//     res.status(500).json({ error: "Internal server error" });
//   }
// });