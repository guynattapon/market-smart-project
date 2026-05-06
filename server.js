require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // แก้ไขจาก 'Pool' เป็น 'pg' ให้ถูกต้อง
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs'); 
const axios = require('axios');    

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 🗄️ การเชื่อมต่อฐานข้อมูล (Supabase Cloud)
// ==========================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // <--- แก้เป็นบรรทัดนี้ เพื่อให้ดึงค่าจาก Render
  ssl: {
    rejectUnauthorized: false 
  }
});

// ตรวจสอบการเชื่อมต่อ Database
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Database connection error:', err.stack);
  }
  console.log('✅ Connected to Supabase Cloud Database');
  release();
});

// ==========================================
// 📁 ตั้งค่าการอัปโหลดไฟล์
// ==========================================
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){ fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, 'file-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ==========================================
// 🔔 ตั้งค่า LINE Notify Token
// ==========================================
const LINE_TOKEN = ''; 

const sendLineNotify = async (message) => {
    if(!LINE_TOKEN) return;
    try {
        await axios.post('https://notify-api.line.me/api/notify', `message=${encodeURIComponent(message)}`, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${LINE_TOKEN}`
            }
        });
    } catch (error) {
        console.error('LINE Notify Error:', error.message);
    }
};

// ==========================================
// 🔐 ระบบ Authentication
// ==========================================

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    await pool.query(
    `INSERT INTO users (username, password_hash, full_name, phone_number, id_card_number, role) 
     VALUES ($1, $2, $3, $4, $5, 'tenant')`, 
    [username, hashedPassword, full_name, phone_number, id_card_number]
);
    
    const user = result.rows[0];
    let validPassword = false;
    
    // *** จุดสำคัญ: ต้องใช้ user.password_hash ให้ตรงกับในฐานข้อมูล ***
    const dbPassword = user.password_hash; 

    if (dbPassword && (dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$'))) {
        // ถ้าเป็นรหัสแบบเข้ารหัส (เช่นของ Guy123)
        validPassword = await bcrypt.compare(password, dbPassword);
    } else {
        // ถ้าเป็นรหัสธรรมดา (เช่น 1234 ของ admin)
        validPassword = (password === dbPassword);
    }

    if (!validPassword) return res.status(401).json({ message: "รหัสผ่านผิด" });

    res.json({ user_id: user.user_id, username: user.username, role: user.role, full_name: user.full_name });
  } catch (err) { console.error(err); res.status(500).send(err.message); }
});

app.post('/register', async (req, res) => {
  const { username, password, full_name, phone_number, id_card_number } = req.body;
  if (!username || !password || !full_name || !phone_number || !id_card_number) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
  }
  try {
    const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (check.rows.length > 0) return res.status(400).json({ message: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว" });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await pool.query(
        `INSERT INTO users (username, password, full_name, phone_number, id_card_number, role) 
         VALUES ($1, $2, $3, $4, $5, 'tenant')`, 
        [username, hashedPassword, full_name, phone_number, id_card_number]
    );
    res.json({ message: "Success" });
  } catch (err) { res.status(500).send(err.message); }
});

// ==========================================
// 👥 ระบบจัดการผู้ใช้งาน (User Management)
// ==========================================
app.get('/users', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.user_id, u.username, u.full_name, u.phone_number, u.id_card_number, u.role, u.created_at,
               COUNT(b.booking_id)::int as total_bookings
        FROM users u
        LEFT JOIN bookings b ON u.user_id = b.user_id
        GROUP BY u.user_id
        ORDER BY u.role ASC, u.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { phone_number, id_card_number } = req.body; 

        await pool.query(
            `UPDATE users 
             SET phone_number = $1, id_card_number = $2 
             WHERE user_id = $3`,
            [phone_number, id_card_number, userId]
        );
        
        res.json({ message: "อัปเดตข้อมูลผู้ใช้งานสำเร็จเรียบร้อย!" });
    } catch (err) { 
        res.status(500).send(err.message); 
    }
});

// ==========================================
// 🏪 ระบบจัดการแผงตลาด (Stalls)
// ==========================================

app.get('/stalls', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, b.booking_id, b.customer_name, b.customer_phone, b.product_details, b.start_date
      FROM stalls s
      LEFT JOIN bookings b ON s.stall_id = b.stall_id AND b.status IN ('approved', 'pending')
      ORDER BY s.zone, s.stall_code
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/stalls', upload.array('stallImages', 5), async (req, res) => {
  const { stall_code, zone, rent_type, price, size } = req.body;
  const imageUrls = req.files && req.files.length > 0 
      ? req.files.map(file => `/uploads/${file.filename}`).join(',') 
      : null;
      
  try {
      await pool.query(
          'INSERT INTO stalls (stall_code, zone, rent_type, price, size, stall_image_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
          [stall_code, zone, rent_type, price, size, imageUrls, 'vacant']
      );
      res.json({ message: "Success" });
  } catch (err) { 
      if (err.code === '23505') {
          return res.status(400).json({ message: `รหัสแผง "${stall_code}" มีอยู่ในระบบแล้ว` });
      }
      res.status(500).json({ message: err.message }); 
  }
});

app.put('/stalls/:id', upload.array('stallImages', 5), async (req, res) => {
  const { stall_code, zone, rent_type, price, size } = req.body;
  const imageUrls = req.files && req.files.length > 0 
      ? req.files.map(file => `/uploads/${file.filename}`).join(',') 
      : null;

  try {
      if (imageUrls) {
          await pool.query(
              'UPDATE stalls SET stall_code = $1, zone = $2, rent_type = $3, price = $4, size = $5, stall_image_url = $6 WHERE stall_id = $7',
              [stall_code, zone, rent_type, price, size, imageUrls, req.params.id]
          );
      } else {
          await pool.query(
              'UPDATE stalls SET stall_code = $1, zone = $2, rent_type = $3, price = $4, size = $5 WHERE stall_id = $6',
              [stall_code, zone, rent_type, price, size, req.params.id]
          );
      }
      res.json({ message: "Updated success" });
  } catch (err) {
      res.status(500).send(err.message);
  }
});

app.put('/stalls/reset/:id', async (req, res) => {
  await pool.query("UPDATE stalls SET status = 'vacant' WHERE stall_id = $1", [req.params.id]);
  res.json({ message: "Reset success" });
});

app.delete('/stalls/:id', async (req, res) => {
  try {
      await pool.query('DELETE FROM invoices WHERE booking_id IN (SELECT booking_id FROM bookings WHERE stall_id = $1)', [req.params.id]);
      await pool.query('DELETE FROM bookings WHERE stall_id = $1', [req.params.id]);
      await pool.query('DELETE FROM stalls WHERE stall_id = $1', [req.params.id]);
      res.json({ message: "Deleted success" });
  } catch (err) { 
      res.status(500).send(err.message); 
  }
});

// ==========================================
// 📝 ระบบการจอง (Bookings)
// ==========================================

app.post('/bookings', upload.fields([{ name: 'idCardImage', maxCount: 1 }, { name: 'slipImage', maxCount: 1 }]), async (req, res) => {
    const { user_id, stall_id, start_date, product_details, customer_name, customer_phone } = req.body;
    const idCardUrl = req.files['idCardImage'] ? `/uploads/${req.files['idCardImage'][0].filename}` : null;
    const slipUrl = req.files['slipImage'] ? `/uploads/${req.files['slipImage'][0].filename}` : null;
  
    try {
        await pool.query(
            `INSERT INTO bookings (user_id, stall_id, start_date, product_details, status, customer_name, customer_phone, id_card_image_url, slip_image_url) 
            VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)`, 
            [user_id, stall_id, start_date, product_details, customer_name, customer_phone, idCardUrl, slipUrl]
        );
        await pool.query("UPDATE stalls SET status = 'reserved' WHERE stall_id = $1", [stall_id]);
        sendLineNotify(`🔔 มีคำสั่งจองแผงใหม่!\nจากคุณ: ${customer_name}\nสถานะ: รอตรวจสอบหลักฐาน ⏳`);
        res.json({ message: "Booking Success" });
    } catch (err) { 
        res.status(500).send(err.message); 
    }
});

app.post('/bookings/walk-in', upload.single('idCardImage'), async (req, res) => {
  const { stall_id, full_name, phone_number, start_date, id_card_number } = req.body;
  const idCardUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
      let userRes = await pool.query('SELECT user_id FROM users WHERE username = $1', [phone_number]);
      let userId;
      
      if (userRes.rows.length > 0) {
          userId = userRes.rows[0].user_id;
          if(id_card_number) await pool.query('UPDATE users SET id_card_number = $1 WHERE user_id = $2', [id_card_number, userId]);
      } else {
          const salt = await bcrypt.genSalt(10);
          const hashedPhonePass = await bcrypt.hash(phone_number, salt);
          const newUser = await pool.query(
              "INSERT INTO users (username, password, role, full_name, phone_number, id_card_number) VALUES ($1, $2, 'tenant', $3, $4, $5) RETURNING user_id", 
              [phone_number, hashedPhonePass, full_name, phone_number, id_card_number]
          );
          userId = newUser.rows[0].user_id;
      }

      await pool.query("INSERT INTO bookings (user_id, stall_id, start_date, status, customer_name, customer_phone, id_card_image_url) VALUES ($1, $2, $3, 'approved', $4, $5, $6)", [userId, stall_id, start_date, full_name, phone_number, idCardUrl]);
      await pool.query("UPDATE stalls SET status = 'occupied' WHERE stall_id = $1", [stall_id]);
      res.json({ message: "Walk-in Success" });
  } catch (err) { 
      res.status(500).send(err.message); 
  }
});

app.get('/bookings/all', async (req, res) => {
    try {
        const result = await pool.query(`SELECT b.*, s.stall_code FROM bookings b JOIN stalls s ON b.stall_id = s.stall_id ORDER BY b.booking_id DESC`);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/bookings/approve/:id', async (req, res) => {
  await pool.query("UPDATE bookings SET status = 'approved' WHERE booking_id = $1", [req.params.id]);
  const booking = await pool.query('SELECT stall_id FROM bookings WHERE booking_id = $1', [req.params.id]);
  if(booking.rows.length > 0) await pool.query("UPDATE stalls SET status = 'occupied' WHERE stall_id = $1", [booking.rows[0].stall_id]);
  res.json({ message: "Approved" });
});

app.put('/bookings/reject/:id', async (req, res) => {
    const { reason } = req.body;
    await pool.query("UPDATE bookings SET status = 'rejected', rejection_reason = $1 WHERE booking_id = $2", [reason, req.params.id]);
    const booking = await pool.query('SELECT stall_id FROM bookings WHERE booking_id = $1', [req.params.id]);
    if(booking.rows.length > 0) await pool.query("UPDATE stalls SET status = 'vacant' WHERE stall_id = $1", [booking.rows[0].stall_id]);
    res.json({ message: "Rejected" });
});

// ==========================================
// 💳 ระบบบิลและการชำระเงิน (Invoices)
// ==========================================

app.post('/invoices/create', async (req, res) => {
    const { booking_id, rent_price, water_current, electric_current, flat_water, flat_electric, is_flat_rate } = req.body;
    try {
        const prevRes = await pool.query('SELECT water_meter_current, electric_meter_current FROM invoices WHERE booking_id = $1 ORDER BY invoice_id DESC LIMIT 1', [booking_id]);
        const water_last = prevRes.rows.length > 0 ? prevRes.rows[0].water_meter_current : 0;
        const electric_last = prevRes.rows.length > 0 ? prevRes.rows[0].electric_meter_current : 0;
        
        let total = parseFloat(rent_price || 0);
        let final_w_current = is_flat_rate ? water_last : parseFloat(water_current || 0);
        let final_e_current = is_flat_rate ? electric_last : parseFloat(electric_current || 0);

        if (is_flat_rate) {
            total += parseFloat(flat_water || 0) + parseFloat(flat_electric || 0);
        } else {
            total += ((final_w_current - water_last) * 18) + ((final_e_current - electric_last) * 8);
        }

        await pool.query(
            `INSERT INTO invoices (booking_id, total_amount, payment_status, water_meter_last, water_meter_current, electric_meter_last, electric_meter_current) 
             VALUES ($1, $2, 'unpaid', $3, $4, $5, $6)`, 
            [booking_id, total, water_last, final_w_current, electric_last, final_e_current]
        );
        res.json({ message: "Invoice created successfully", total });
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/invoices/all', async (req, res) => {
    try {
        const result = await pool.query(`SELECT i.*, b.customer_name, s.stall_code FROM invoices i JOIN bookings b ON i.booking_id = b.booking_id JOIN stalls s ON b.stall_id = s.stall_id ORDER BY i.invoice_id DESC`);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/my-invoices/:userId', async (req, res) => {
  const result = await pool.query(`SELECT i.*, s.stall_code FROM invoices i JOIN bookings b ON i.booking_id = b.booking_id JOIN stalls s ON b.stall_id = s.stall_id WHERE b.user_id = $1 ORDER BY i.invoice_id DESC`, [req.params.userId]);
  res.json(result.rows);
});

app.post('/invoices/pay', upload.single('slipImage'), async (req, res) => {
  const slipUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const { invoice_id } = req.body;
  await pool.query("UPDATE invoices SET payment_slip_url = $1, payment_status = 'pending_check' WHERE invoice_id = $2", [slipUrl, invoice_id]);
  res.json({ message: "Paid" });
});

app.put('/invoices/approve/:id', async (req, res) => {
  await pool.query("UPDATE invoices SET payment_status = 'paid' WHERE invoice_id = $1", [req.params.id]);
  res.json({ message: "Approved" });
});

app.get('/dashboard/stats', async (req, res) => {
    try {
      const financeRes = await pool.query(`SELECT COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0)::int as total_revenue, COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_amount ELSE 0 END), 0)::int as total_unpaid FROM invoices`);
      const zoneRes = await pool.query(`SELECT zone, COALESCE(SUM(price), 0)::int as revenue FROM stalls WHERE status != 'vacant' GROUP BY zone`);
      const stallRes = await pool.query(`SELECT status, COUNT(*)::int as count FROM stalls GROUP BY status`);
      res.json({ finance: financeRes.rows[0], zones: zoneRes.rows, stalls: stallRes.rows });
    } catch (err) { res.status(500).send(err.message); }
});

app.listen(port, () => console.log(`🚀 Server running on port ${port} & Connected to Supabase`));