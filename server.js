const express = require("express");
const fs = require("fs");
const path = require("path");
const sql = require("mssql/msnodesqlv8");
const cors = require("cors");
const session = require("express-session");
const app = express();
const ngrock = require("ngrok");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const uploadsDirectory = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory);
}

// const upload = multer({
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10 MB (adjust the limit as needed)
//   },
// });
// Proper session configuration

app.use(
  session({
    secret: "25b71c899d6fc9e2a4e19d88ad79221a43213cf550db90ee67c7dd08df8c006e",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
    },
  })
);

const corsOptions = {
  origin: "http://192.168.0.115:5000",
  // origin: "*",
  methods: "GET,POST,PUT",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const nodemailer = require("nodemailer");
const { error } = require("console");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "poojachavan081096@gmail.com", // use your gmail here
    pass: "quks xmdh uhxe bbkz", // generate smtp password ans use here
  },
});

const config = {
  user: "fg_minterior",
  password: "@J220a3qq",
  server: "146.88.24.73",
  database: "lissom_minterior1",
};

// const config = {
//   user: "sa",
//   password: "12345678",
//   server: "MSI\\SQLEXPRESS",
//   database: "Matoshree",
// };

let pool;

async function initializePool() {
  try {
    pool = await sql.connect(config);
    console.log("Database connected successfully!");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}

initializePool();

// Login route

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, password)
      .query(
        "SELECT * FROM Tbl_Staff WHERE Email = @email AND Password = @password"
      );

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      req.session.staffId = user.Staff_ID; // Save staff_id in session
      res.status(200).json({ message: "Login successful", user });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/todo_items", async (req, res) => {
  try {
    // Get the staff_id from the session
    const staffId = req.session.staffId;

    // Check if staffId exists in session
    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }

    // Fetch todo items associated with the staff_id
    const result = await pool
      .request()
      .input("staffId", sql.Int, staffId)
      .query("SELECT * FROM Tbl_todo_items WHERE staff_id = @staffId");

    // Send the fetched todo items to the client
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching data from Tbl_todo_items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/task_details", async (req, res) => {
  try {
    const staffId = req.session.staffId;
    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }
    const result = await pool.request().input("staffId", sql.Int, staffId)
      .query(`
        SELECT Tbl_TaskDetails.Subject, Tbl_TaskDetails.chkPublic, CONVERT(varchar, Start_Date, 111) AS Start_Date,
               CONVERT(varchar, Due_Date, 111) AS Due_Date, Tbl_TaskDetails.Status,Tbl_TaskDetails.Description, Reapet_Every, Priority, Billable,Tbl_TaskDetails.Reletd_To,
               Hourly_Rate, Tbl_TaskDetailsMap.TaskStatus, Tbl_TaskDetailsMap.AssignTo, Tbl_TaskDetailsMap.TaskName,
               Tbl_TaskDetailsMap.RelatedTo, Tbl_TaskDetailsMap.RelatedToCast, Tbl_TaskDetails.Createby
        FROM Tbl_TaskDetails
        INNER JOIN Tbl_TaskDetailsMap ON Tbl_TaskDetailsMap.TaskName = Tbl_TaskDetails.Subject
        WHERE Tbl_TaskDetailsMap.StaffID = @staffId
      `);

    // Send the fetched tasks to the client
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching data from Tbl_TaskDetails:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/announcements", async (req, res) => {
  try {
    const result = await pool.request().query(`
        SELECT * 
        FROM Tbl_announcements 
        WHERE YEAR(Createdate) = YEAR(GETDATE()) 
          AND MONTH(Createdate) = MONTH(GETDATE()) 
        ORDER BY Createdate DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching data from Tbl_announcements:", error);

    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/projects", async (req, res) => {
  try {
    const staffId = req.session.staffId;
    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }
    const result = await pool.request().input("staffId", sql.Int, staffId)
      .query(`
        SELECT Tbl_Project_Staff_Mapping.Project_ID, Tbl_Project_Staff_Mapping.Staff_ID,
               Tbl_Staff.First_Name + ' ' + Tbl_Staff.LastName AS First_Name, Tbl_Staff.Email,
               Tbl_Projects.ProjectName, Tbl_Projects.Description, Tbl_Projects.ClientName
        FROM Tbl_Project_Staff_Mapping
        INNER JOIN Tbl_Staff ON Tbl_Project_Staff_Mapping.Staff_ID = Tbl_Staff.Staff_ID
        INNER JOIN Tbl_Projects ON Tbl_Projects.ID = Tbl_Project_Staff_Mapping.Project_ID
        WHERE Tbl_Project_Staff_Mapping.Staff_ID = @staffId
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching data from Tbl_Projects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/profile", async (req, res) => {
  try {
    const staffId = req.session.staffId;

    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }

    const result = await pool.request().input("staffId", sql.Int, staffId)
      .query(`
        SELECT * FROM Tbl_Staff
        WHERE Staff_ID = @staffId
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching data from Tbl_Staff:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/submit-advance-salary-request", async (req, res) => {
  try {
    const { name, employeeId, department, amount, reason } = req.body;
    const staffId = req.session.staffId;

    if (!name || !employeeId || !department || !amount || !reason || !staffId) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const result = await pool
      .request()
      .input("Name", sql.NVarChar, name)
      .input("StaffId", sql.Int, staffId)
      .input("Department", sql.NVarChar, department)
      .input("Amount", sql.Decimal, amount)
      .input("Reason", sql.NVarChar, reason)
      .input("CreateDate", sql.DateTime, new Date()).query(`
        INSERT INTO Tbl_SalaryRequest (Name, StaffID, Deparment, Amount, Reason, CreateDate, Satus)
        VALUES (@Name, @StaffId, @Department, @Amount, @Reason, @CreateDate, 1)
      `);

    res
      .status(200)
      .json({ message: "Advance salary request submitted successfully" });
  } catch (error) {
    console.error("Error submitting advance salary request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// app.post("/submit-leave-request", async (req, res) => {
//   try {
//     const { name, department, startDate, endDate, leaveType, reason } =
//       req.body;
//     const staffId = req.session.staffId;

//     if (!name || !reason) {
//       return res.status(400).json({ error: "All fields are required" });
//     }

//     const result = await pool
//       .request()
//       .input("Name", sql.NVarChar, name)
//       .input("Department", sql.NVarChar, department)
//       .input("StartDate", sql.Date, startDate)
//       .input("EndDate", sql.Date, endDate)
//       .input("LeaveType", sql.NVarChar, leaveType)
//       .input("Reason", sql.NVarChar, reason)
//       .input("RaisedDate", sql.DateTime, new Date())
//       .input("Status", sql.Int, 1)
//       .input("StaffId", sql.Int, staffId).query(`
//     INSERT INTO Tbl_LeaveRequest (Name, Department, StartDate, EndDate, LeaveType, Reason, RaisedDate, Status, StaffId)
//     VALUES (@Name, @Department, @StartDate, @EndDate, @LeaveType, @Reason, @RaisedDate, @Status, @StaffId)
//   `);

//     res.status(200).json({ message: "Leave request submitted successfully" });
//   } catch (error) {
//     console.error("Error submitting leave request:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.post("/submit-leave-request", async (req, res) => {
  try {
    const { name, department, startDate, endDate, leaveType, reason } =
      req.body;
    const staffId = req.session.staffId;

    if (!name || !reason) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingRequest = await pool
      .request()
      .input("StartDate", sql.Date, startDate)
      .input("EndDate", sql.Date, endDate)
      .input("StaffId", sql.Int, staffId).query(`
        SELECT * FROM Tbl_LeaveRequest 
        WHERE StartDate = @StartDate 
        AND EndDate = @EndDate 
        AND StaffId = @StaffId
      `);

    if (existingRequest.recordset.length > 0) {
      const updateResult = await pool
        .request()
        .input("Name", sql.NVarChar, name)
        .input("Department", sql.NVarChar, department)
        .input("LeaveType", sql.NVarChar, leaveType)
        .input("Reason", sql.NVarChar, reason)
        .input("StaffId", sql.Int, staffId)
        .input("StartDate", sql.Date, startDate)
        .input("EndDate", sql.Date, endDate).query(`
          UPDATE Tbl_LeaveRequest 
          SET Name = @Name, Department = @Department, LeaveType = @LeaveType, Reason = @Reason 
          WHERE StartDate = @StartDate 
          AND EndDate = @EndDate 
          AND StaffId = @StaffId
        `);
    } else {
      const insertResult = await pool
        .request()
        .input("Name", sql.NVarChar, name)
        .input("Department", sql.NVarChar, department)
        .input("StartDate", sql.Date, startDate)
        .input("EndDate", sql.Date, endDate)
        .input("LeaveType", sql.NVarChar, leaveType)
        .input("Reason", sql.NVarChar, reason)
        .input("RaisedDate", sql.DateTime, new Date())
        .input("Status", sql.Int, 1)
        .input("StaffId", sql.Int, staffId).query(`
          INSERT INTO Tbl_LeaveRequest (Name, Department, StartDate, EndDate, LeaveType, Reason, RaisedDate, Status, StaffId)
          VALUES (@Name, @Department, @StartDate, @EndDate, @LeaveType, @Reason, @RaisedDate, @Status, @StaffId)
        `);
    }

    res.status(200).json({ message: "Leave request submitted successfully" });
  } catch (error) {
    console.error("Error submitting leave request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// app.post("/submit_presenty", upload.single("photo"), async (req, res) => {
//   try {
//     const { latitude, longitude ,type } = req.body;
//     const staffId = req.session.staffId;
//     const photoName = req.file.filename;
//     const photoPath = path.join(uploadsDirectory, photoName);

//     fs.renameSync(req.file.path, photoPath);

//     const result = await pool
//       .request()
//       .input("Latitude", sql.NVarChar, latitude)
//       .input("Longitude", sql.NVarChar, longitude)
//       .input("Photo", sql.NVarChar, photoName)
//       .input("Photopath", sql.NVarChar, photoPath) // Store the file path in the database
//       // .input("InTime", sql.DateTime, new Date())
//       // .input("Status", sql.Int, 1)
//       .input("Type", sql.NVarChar, type)
//       .input("StaffId", sql.Int, staffId).query(`
//         INSERT INTO Tbl_Presenty (Latitude, Longitude, Photo, Photopath, InTime, Status, StaffId,Type)
//         VALUES (@Latitude, @Longitude, @Photo, @Photopath, getDate(), 1, @StaffId,@Type)
//       `);

//     res.status(200).json({ message: "Presenty submitted successfully" });
//   } catch (error) {
//     console.error("Error submitting attendance:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// app.post("/submit_presenty", upload.single("photo"), async (req, res) => {
//   try {
//     const { latitude, longitude, type } = req.body;
//     const staffId = req.session.staffId;
//     const photoName = req.file.filename;
//     const photoPath = path.join(uploadsDirectory, photoName);

//     fs.renameSync(req.file.path, photoPath);

//     let query = `
//       IF @Type = 'in'
//       BEGIN
//         INSERT INTO Tbl_Presenty (Latitude, Longitude, Photo, Photopath, InTime, Status, StaffId, Type)
//         VALUES (@Latitude, @Longitude, @Photo, @Photopath, GETDATE(), 1, @StaffId, @Type)
//       END
//       ELSE IF @Type = 'out'
//       BEGIN
//         INSERT INTO Tbl_Presenty (Latitude, Longitude, Photo, Photopath, OutTime, Status, StaffId, Type)
//         VALUES (@Latitude, @Longitude, @Photo, @Photopath, GETDATE(), 1, @StaffId, @Type)
//       END`;

//     const result = await pool
//       .request()
//       .input("Latitude", sql.NVarChar, latitude)
//       .input("Longitude", sql.NVarChar, longitude)
//       .input("Photo", sql.NVarChar, photoName)
//       .input("Photopath", sql.NVarChar, photoPath) // Store the file path in the database
//       .input("Type", sql.NVarChar, type)
//       .input("StaffId", sql.Int, staffId)
//       .query(query);

//     res.status(200).json({ message: "Presenty submitted successfully" });
//   } catch (error) {
//     console.error("Error submitting attendance:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// app.post("/submit_presenty", upload.single("photo"), async (req, res) => {
//   try {
//     const { latitude, longitude, type } = req.body;
//     const staffId = req.session.staffId;
//     const photoName = req.file.filename;
//     const photoPath = path.join(uploadsDirectory, photoName);

//     fs.renameSync(req.file.path, photoPath);

//     const poolRequest = pool
//       .request()
//       .input("Latitude", sql.NVarChar, latitude)
//       .input("Longitude", sql.NVarChar, longitude)
//       .input("Photo", sql.NVarChar, photoName)
//       .input("Photopath", sql.NVarChar, photoPath)
//       .input("Type", sql.NVarChar, type)
//       .input("StaffId", sql.Int, staffId);

//     let query;

//     if (type === 'in') {
//       query = `
//         INSERT INTO Tbl_Presenty (Latitude, Longitude, Photo, Photopath, InTime, Status, StaffId, Type)
//         VALUES (@Latitude, @Longitude, @Photo, @Photopath, GETDATE(), 1, @StaffId, @Type)
//       `;
//     } else if (type === 'out') {
//       query = `
//         UPDATE Tbl_Presenty
//         SET OutTime = GETDATE(), Photo = @Photo, Photopath = @Photopath, Type = @Type
//         WHERE StaffId = @StaffId
//         AND CONVERT(DATE, InTime) = CONVERT(DATE, GETDATE())
//       `;
//     }

//     const result = await poolRequest.query(query);

//     if (result.rowsAffected[0] === 0 && type === 'out') {
//       return res.status(404).json({ error: "No matching 'in' record found for today" });
//     }

//     res.status(200).json({ message: "Presenty submitted successfully" });
//   } catch (error) {
//     console.error("Error submitting attendance:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// app.post("/submit_presenty", upload.single("photo"), async (req, res) => {
//   try {
//     const { latitude, longitude, type } = req.body;
//     const staffId = req.session.staffId;
//     const photoName = req.file.filename;
//     const photoPath = path.join(uploadsDirectory, photoName);

//     fs.renameSync(req.file.path, photoPath);

//     const poolRequest = pool
//       .request()
//       .input("Latitude", sql.NVarChar, latitude)
//       .input("Longitude", sql.NVarChar, longitude)
//       .input("Photo", sql.NVarChar, photoName)
//       .input("Photopath", sql.NVarChar, photoPath)
//       .input("Type", sql.NVarChar, type)
//       .input("StaffId", sql.Int, staffId);

//     let query;

//     if (type === 'in') {
//       query = `
//         INSERT INTO Tbl_Presenty (Latitude, Longitude, Photo, Photopath, InTime, Status, StaffId, Type)
//         VALUES (@Latitude, @Longitude, @Photo, @Photopath, GETDATE(), 1, @StaffId, @Type)
//       `;
//     } else if (type === 'out') {
//       query = `
//         UPDATE Tbl_Presenty
//         SET OutTime = GETDATE(),
//             Photo = @Photo,
//             Photopath = @Photopath,
//             Type = @Type,
//             TotalHr = DATEDIFF(MINUTE, InTime, GETDATE()) / 60.0
//         WHERE StaffId = @StaffId
//         AND CONVERT(DATE, InTime) = CONVERT(DATE, GETDATE())
//       `;
//     }

//     const result = await poolRequest.query(query);

//     if (result.rowsAffected[0] === 0 && type === 'out') {
//       return res.status(404).json({ error: "No matching 'in' record found for today" });
//     }

//     res.status(200).json({ message: "Presenty submitted successfully" });
//   } catch (error) {
//     console.error("Error submitting attendance:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// app.post("/submit_presenty", upload.single("photo"), async (req, res) => {
//   try {
//     const { latitude, longitude, type } = req.body;
//     const staffId = req.session.staffId;
//     const photoName = req.file.filename;
//     const photoPath = path.join('uploads', photoName);

//     fs.renameSync(req.file.path, photoPath);

//     const poolRequest = pool
//       .request()
//       .input("Latitude", sql.NVarChar, latitude)
//       .input("Longitude", sql.NVarChar, longitude)
//       .input("Photo", sql.NVarChar, photoName)
//       .input("Photopath", sql.NVarChar, photoPath)
//       .input("Type", sql.NVarChar, type)
//       .input("StaffId", sql.Int, staffId);

//     let query;

//     if (type === 'in') {
//       // Check if an 'in' record already exists for today
//       const checkInQuery = `
//         SELECT COUNT(*) AS count
//         FROM Tbl_Presenty
//         WHERE StaffId = @StaffId
//         AND Type = 'in'
//         AND CONVERT(DATE, InTime) = CONVERT(DATE, GETDATE())
//       `;
//       const checkInResult = await poolRequest.query(checkInQuery);

//       if (checkInResult.recordset[0].count > 0) {
//         return res.status(400).json({ error: "'In' record for today already exists" });
//       }

//       query = `
//         INSERT INTO Tbl_Presenty (Latitude, Longitude, Photo, Photopath, InTime, Status, StaffId, Type)
//         VALUES (@Latitude, @Longitude, @Photo, @Photopath, GETDATE(), 1, @StaffId, @Type)
//       `;
//     } else if (type === 'out') {
//       // Check if an 'out' record already exists for today
//       const checkOutQuery = `
//         SELECT COUNT(*) AS count
//         FROM Tbl_Presenty
//         WHERE StaffId = @StaffId
//         AND Type = 'out'
//         AND CONVERT(DATE, OutTime) = CONVERT(DATE, GETDATE())
//       `;
//       const checkOutResult = await poolRequest.query(checkOutQuery);

//       if (checkOutResult.recordset[0].count > 0) {
//         return res.status(400).json({ error: "'Out' record for today already exists" });
//       }

//       query = `
//         UPDATE Tbl_Presenty
//         SET OutTime = GETDATE(),
//             Photo = @Photo,
//             Photopath = @Photopath,
//             Type = @Type,
//             TotalHr = DATEDIFF(MINUTE, InTime, GETDATE()) / 60.0
//         WHERE StaffId = @StaffId
//         AND CONVERT(DATE, InTime) = CONVERT(DATE, GETDATE())
//         AND Type = 'in'
//       `;
//     }

//     const result = await poolRequest.query(query);

//     if (result.rowsAffected[0] === 0 && type === 'out') {
//       return res.status(404).json({ error: "No matching 'in' record found for today" });
//     }

//     res.status(200).json({ message: "Presenty submitted successfully" });
//   } catch (error) {
//     console.error("Error submitting attendance:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.post("/submit_presenty", upload.single("photo"), async (req, res) => {
  try {
    const { latitude, longitude, type } = req.body;
    const staffId = req.session.staffId;
    const photoName = req.file.filename;
    const photoPath = path.join("uploads", photoName);

    fs.renameSync(req.file.path, photoPath);

    const poolRequest = pool
      .request()
      .input("Latitude", sql.NVarChar, latitude)
      .input("Longitude", sql.NVarChar, longitude)
      .input("Photo", sql.NVarChar, photoName)
      .input("Photopath", sql.NVarChar, photoPath)
      .input("Type", sql.NVarChar, type)
      .input("StaffId", sql.Int, staffId);

    let query;

    if (type === "in") {
      // Check if an 'in' record already exists for today
      const checkInQuery = `
        SELECT COUNT(*) AS count
        FROM Tbl_Presenty
        WHERE StaffId = @StaffId
        AND Type = 'in'
        AND CONVERT(DATE, InTime) = CONVERT(DATE, GETDATE())
      `;
      const checkInResult = await poolRequest.query(checkInQuery);

      if (checkInResult.recordset[0].count > 0) {
        return res
          .status(400)
          .json({ error: "'In' record for today already exists" });
      }

      query = `
        INSERT INTO Tbl_Presenty (Latitude, Longitude, Photo, Photopath, InTime, Status, StaffId, Type)
        VALUES (@Latitude, @Longitude, @Photo, @Photopath, GETDATE(), 1, @StaffId, @Type)
      `;
    } else if (type === "out") {
      // Check if an 'out' record already exists for today
      const checkOutQuery = `
        SELECT COUNT(*) AS count
        FROM Tbl_Presenty
        WHERE StaffId = @StaffId
        AND Type = 'out'
        AND CONVERT(DATE, OutTime) = CONVERT(DATE, GETDATE())
      `;
      const checkOutResult = await poolRequest.query(checkOutQuery);

      if (checkOutResult.recordset[0].count > 0) {
        return res
          .status(400)
          .json({ error: "'Out' record for today already exists" });
      }

      query = `
        UPDATE Tbl_Presenty
        SET OutTime = GETDATE(), 
            Photo = @Photo, 
            Photopath = @Photopath, 
            Type = @Type,
            TotalHr = CAST(DATEDIFF(MINUTE, InTime, GETDATE()) AS FLOAT) / 60.0
        WHERE StaffId = @StaffId
        AND CONVERT(DATE, InTime) = CONVERT(DATE, GETDATE())
        AND Type = 'in'
      `;
    }

    const result = await poolRequest.query(query);

    if (result.rowsAffected[0] === 0 && type === "out") {
      return res
        .status(404)
        .json({ error: "No matching 'in' record found for today" });
    }

    res.status(200).json({ message: "Presenty submitted successfully" });
  } catch (error) {
    console.error("Error submitting attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/paymentrequest", async (req, res) => {
  try {
    const staffId = req.session.staffId;
    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }
    const result = await pool
      .request()
      .input("staffId", sql.Int, staffId)
      .query("SELECT * FROM Tbl_MiscellaneousExpenses WHERE EmpID = @staffId");

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching data from Tbl_MiscellaneousExpenses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/submit_paymentrequest", async (req, res) => {
  try {
    const {
      name,
      note,
      expensestype,
      expensescat,
      expensescatsub,
      expensesdate,
      paymentmode,
      expbillno,
    } = req.body;
    const staffId = req.session.staffId;

    if (!name || !note) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const result = await pool
      .request()
      .input("Name", sql.NVarChar, name)
      .input("Note", sql.NVarChar, note)
      .input("ExpensesType", sql.NVarChar, expensestype)
      .input("ExpensesCat", sql.NVarChar, expensescat)
      .input("ExpensescatSub", sql.NVarChar, expensescatsub)
      .input("Paymentmode", sql.NVarChar, paymentmode)
      .input("Expensesdate", sql.NVarChar, expensesdate)
      .input("Expbillno", sql.NVarChar, expbillno)

      .input("StaffId", sql.Int, staffId).query(`
    INSERT INTO Tbl_MiscellaneousExpenses (Exp_Name, Exp_Note, Exp_Type, Exp_Category, Exp_SubCategory,  BillNo, Exp_Payment, EmpID,Exp_CreateDate,Exp_Date,Exp_Currency,Exp_Status,SaveAS)
    VALUES (@Name, @Note, @ExpensesType, @ExpensesCat, @ExpensescatSub,  @Expbillno, @Paymentmode, @StaffId,getDate(),@Expensesdate,'INR','true','save')
  `);

    res.status(200).json({ message: "paymentrequest submitted successfully" });
  } catch (error) {
    console.error("Error submitting paymentrequest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/submit_item", async (req, res) => {
  try {
    const empId = req.session.staffId;

    const items = req.body.items;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }
    const totalAmount = req.body.totalAmount;

    const latestExpenseRecord = await pool.request().query(`
    SELECT TOP 1
      Exp_Name,
      Exp_Category,
      Exp_SubCategory,
      BillNo,
      Exp_id
    FROM Tbl_MiscellaneousExpenses
    ORDER BY Exp_id DESC
  `);

    if (
      !latestExpenseRecord.recordset ||
      latestExpenseRecord.recordset.length === 0
    ) {
      return res.status(404).json({ error: "No expense record found" });
    }

    const { Exp_Name, Exp_Category, Exp_SubCategory, BillNo, Exp_id } =
      latestExpenseRecord.recordset[0];

    for (const item of items) {
      // Insert each item into the database
      const result = await pool
        .request()
        .input("Item", sql.NVarChar, item.item)
        .input("Description", sql.NVarChar, item.description)
        .input("Quantity", sql.Int, item.qty)
        .input("Rate", sql.Decimal, item.rate)
        .input("Amount", sql.Decimal, item.amount)
        .input("ExpName", sql.NVarChar, Exp_Name)
        .input("ExpCategory", sql.NVarChar, Exp_Category)
        .input("ExpSubCategory", sql.NVarChar, Exp_SubCategory)
        .input("BillNo", sql.NVarChar, BillNo)
        .input("PayRequestId", sql.Int, Exp_id)
        .input("EmpID", sql.Int, empId).query(`
          INSERT INTO Tbl_BillOfficeExpenses (Item, Description, Quantity, Rate, Amount, EmpID, BelongTo, Exp_CreateDate,ExP_Name, Exp_Category, Exp_SubCategory, BillNo, PayRequestID)
          VALUES (@Item, @Description, @Quantity, @Rate, @Amount, @EmpID, 'Payment Request', GETDATE(),@ExpName, @ExpCategory, @ExpSubCategory, @BillNo, @PayRequestId)
        `);
    }

    const fileData = req.body.fileData; // Assuming fileData contains the file information
    if (fileData) {
      await pool
        .request()
        .input("FileName", sql.NVarChar, fileData.fileName)
        .input("FilePath", sql.NVarChar, fileData.filePath)
        .input("Extension", sql.NVarChar, fileData.extension)
        .input("Create_Date", sql.DateTime, new Date())
        .input("Exp_Name", sql.NVarChar, Exp_Name)
        .input("PayRequestID", sql.Int, Exp_id)
        .input("EmpID", sql.Int, empId)
        .input("Status", sql.Int, 1)
        .input("BelongTo", sql.NVarChar, "Payment Request").query(`
          INSERT INTO Tbl_ExpensesFile (FileName, FilePath, Extention, Create_Date, Exp_Name, PayRequestID, EmpID, Status, BelongTo)
          VALUES (@FileName, @FilePath, @Extension, @Create_Date, @Exp_Name, @PayRequestID, @EmpID, @Status, @BelongTo)
        `);
    }

    await pool
      .request()
      .input("ExpAmount", sql.Decimal, totalAmount)
      .input("ExpId", sql.Int, Exp_id).query(`
      UPDATE Tbl_MiscellaneousExpenses
      SET Exp_Amount = @ExpAmount
      WHERE Exp_id = @ExpId
    `);

    res.status(200).json({ message: "Items submitted successfully" });
  } catch (error) {
    console.error("Error submitting items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/reset_password", async (req, res) => {
  const { email } = req.body;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Update the user's OTP in the database
    const updateOtpResult = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("otp", sql.NVarChar, otp)
      .query("UPDATE Tbl_Staff SET OTP = @otp WHERE Email = @email");

    if (updateOtpResult.rowsAffected[0] > 0) {
      const mailOptions = {
        from: "your-email@gmail.com",
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is: ${otp}`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Email error:", error);
          res.json({ success: false, message: "Failed to send OTP to email" });
        } else {
          res.json({
            success: true,
            message: "OTP sent to the email for verification",
          });
        }
      });
    } else {
      res.json({ success: false, message: "Failed to update OTP" });
    }
  } catch (error) {
    console.error("Database error:", error);
    res.sendStatus(500);
  }
});

app.post("/verify_otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const userResult = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT OTP FROM Tbl_Staff WHERE Email = @email");

    if (userResult.recordset.length > 0) {
      const storedOTP = userResult.recordset[0].OTP;

      if (otp === storedOTP) {
        res.sendStatus(200);
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("Database error:", error);
    res.sendStatus(500);
  }
});

app.post("/reset_password_submission", async (req, res) => {
  await initializePool();

  const { email, newPassword, confirmPassword } = req.body;
  console.log("Received data:", { email, newPassword, confirmPassword });

  if (newPassword !== confirmPassword) {
    return res.json({
      success: false,
      message: "New password and confirm password do not match",
    });
  }

  try {
    const pool = await sql.connect(config);
    const updatePasswordResult = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("newPassword", sql.NVarChar, newPassword)
      .query(
        "UPDATE Tbl_Staff SET Password = @newPassword WHERE Email = @email"
      );

    console.log("SQL Query:", updatePasswordResult);

    if (updatePasswordResult.rowsAffected[0] > 0) {
      res.json({ success: true, message: "Password reset successful" });
    } else {
      res.json({
        success: false,
        message: "Invalid email or password reset failed",
      });
    }
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/verifyotp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const userResult = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT OTP FROM Tbl_Staff WHERE Email = @email");

    if (userResult.recordset.length > 0) {
      const storedOTP = userResult.recordset[0].otp;

      if (otp === storedOTP) {
        res.status(200).json({ message: "OTP verified successfully" });
      } else {
        res.status(401).json({ message: "Invalid OTP" });
      }
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/leaveRequestCount", async (req, res) => {
  try {
    const staffId = req.session.staffId;

    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }

    const leaveRequestCount = await pool
      .request()
      .input("staffId", sql.Int, staffId).query(`
        SELECT SUM(DATEDIFF(day, StartDate, EndDate) + 1) AS TotalLeaveDays 
        FROM Tbl_LeaveRequest
        WHERE Staffid = @staffId
      `);

    res.status(200).json({
      leaveRequestCount: leaveRequestCount.recordset[0].TotalLeaveDays,
    });
  } catch (error) {
    console.error("Error calculating leave request days:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// app.get("/currentMonthPresenceCount", async (req, res) => {
//   try {
//     const staffId = req.session.staffId;

//     if (!staffId) {
//       return res.status(401).json({ error: "Not authorized" });
//     }

//     const currentMonthPresenceCount = await pool
//       .request()
//       .input("staffId", sql.Int, staffId).query(`
//         SELECT
//           COUNT(*) AS TotalPresence
//         FROM Tbl_Presenty
//         WHERE Staffid = @staffId
//         AND MONTH(InTime) = MONTH(GETDATE())
//         AND YEAR(InTime) = YEAR(GETDATE())
//       `);

//     res.status(200).json({
//       currentMonthPresenceCount:
//         currentMonthPresenceCount.recordset[0].TotalPresence,
//     });
//   } catch (error) {
//     console.error("Error counting current month presence:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.get("/currentMonthPresenceCount", async (req, res) => {
  try {
    const staffId = req.session.staffId;

    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }

    const currentMonthPresenceCount = await pool
      .request()
      .input("staffId", sql.Int, staffId).query(`
        SELECT 
          COUNT(*) AS TotalPresence
        FROM Tbl_Presenty
        WHERE StaffId = @staffId
      `);

    res.status(200).json({
      currentMonthPresenceCount:
        currentMonthPresenceCount.recordset[0].TotalPresence,
    });
  } catch (error) {
    console.error("Error counting current month presence:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// app.get("/lateAttendanceCount", async (req, res) => {
//   try {
//     const staffId = req.session.staffId;

//     if (!staffId) {
//       return res.status(401).json({ error: "Not authorized" });
//     }

//     const lateAttendanceCount = await pool
//       .request()
//       .input("staffId", sql.Int, staffId).query(`
//         SELECT
//           MONTH(InTime) AS Month,
//           COUNT(*) AS LateAttendanceCount
//         FROM Tbl_Presenty
//         WHERE Staffid = @staffId
//         AND CONVERT(TIME, InTime) > '09:15:00' -- Check if time is after 9:15 AM
//         AND MONTH(InTime) = MONTH(GETDATE())
//         AND YEAR(InTime) = YEAR(GETDATE())
//         GROUP BY MONTH(InTime)
//       `);

//     res.status(200).json({
//       lateAttendanceCount: lateAttendanceCount.recordset,
//     });
//   } catch (error) {
//     console.error("Error counting late attendance:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

app.get("/lateAttendanceCount", async (req, res) => {
  try {
    const staffId = req.session.staffId;

    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }

    const lateAttendanceCount = await pool
      .request()
      .input("staffId", sql.Int, staffId).query(`
        SELECT 
          MONTH(InTime) AS Month,
          COUNT(*) AS LateAttendanceCount
        FROM Tbl_Presenty
        WHERE Staffid = @staffId
        AND CONVERT(TIME, InTime) > '09:15:00' -- Check if time is after 9:15 AM
        AND MONTH(InTime) = MONTH(GETDATE())
        AND YEAR(InTime) = YEAR(GETDATE())
        GROUP BY MONTH(InTime)
      `);

    res.status(200).json({
      lateAttendanceCount: lateAttendanceCount.recordset,
    });
  } catch (error) {
    console.error("Error counting late attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/announcementCount", async (req, res) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Month is zero-based

    const announcementCount = await pool.request().query(`
        SELECT COUNT(*) AS TotalAnnouncements 
        FROM Tbl_announcements
        WHERE YEAR(Createdate) = ${currentYear} 
        AND MONTH(Createdate) = ${currentMonth}
      `);

    res.status(200).json({
      announcementCount: announcementCount.recordset[0].TotalAnnouncements,
    });
  } catch (error) {
    console.error("Error counting announcements:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/projectCount", async (req, res) => {
  try {
    const staffId = req.session.staffId;
    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }
    const result = await pool.request().input("staffId", sql.Int, staffId)
      .query(`
        SELECT COUNT(*) AS ProjectCount
        FROM Tbl_Project_Staff_Mapping
        WHERE Staff_ID = @staffId
      `);

    res.status(200).json({ projectCount: result.recordset[0].ProjectCount });
  } catch (error) {
    console.error("Error fetching project count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/taskCount", async (req, res) => {
  try {
    const staffId = req.session.staffId;
    if (!staffId) {
      return res.status(401).json({ error: "Not authorized" });
    }
    const result = await pool.request().input("staffId", sql.Int, staffId)
      .query(`
        SELECT COUNT(*) AS TaskCount
        FROM Tbl_TaskDetails
        INNER JOIN Tbl_TaskDetailsMap ON Tbl_TaskDetailsMap.TaskName = Tbl_TaskDetails.Subject
        WHERE Tbl_TaskDetailsMap.StaffID = @staffId
      `);

    // Send the fetched task count to the client
    res.status(200).json({ taskCount: result.recordset[0].TaskCount });
  } catch (error) {
    console.error("Error fetching task count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  ngrock
    .connect(PORT)
    .then((ngrokUrl) => {
      console.log(`Ngrok tunnel in ; ${ngrokUrl}`);
    })
    .catch((error) => {
      console.log(`couldnt tunnel ngrok :${error}`);
    });
});
