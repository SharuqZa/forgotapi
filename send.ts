const express = require('express');
const { Request, Response } = require('express');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const mysql= require ('mysql2/promise');



const app = express();
const port = 3000;

app.use(express.json());

// Create database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.post('/forgotPassword', (req, res) => {
  const { email } = req.body;
  const forgotPassword = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '10m' });
  res.send(forgotPassword);
});

app.post('/ResetPassword', async (req, res) => {
  const { email } = req.body;

  // Check if user email is in the database
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM user WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  } finally {
    conn.release();
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const forgotPassword = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '10m' });

  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: email,
    subject: 'Reset Password',
    text: `Click on the following link to reset your password: ${process.env.CLIENT_URL}/reset-password?token=${forgotPassword}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send('Email sent');
  } catch (err) {
    console.log(err);
    res.status(500).send('Server error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});