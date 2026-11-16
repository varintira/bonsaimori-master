require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");

const Bonsai = require("./models/bonsaidb");
const User = require("./models/user");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// ตั้งค่าตัวส่งอีเมล (Gmail)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ฟังก์ชันเช็กเงื่อนไขรหัสผ่าน (8 ตัวขึ้นไป + มีทั้งตัวอักษรและตัวเลข)
function validatePassword(password) {
    if (!password || password.length < 8) {
        return "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return "รหัสผ่านต้องมีทั้งตัวอักษรภาษาอังกฤษและตัวเลขผสมกัน";
    }
    return null; // ผ่านเงื่อนไข
}

// ================= MONGODB (เหมาะกับ Vercel / serverless) =================
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGO_URI, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (err) {
        cached.promise = null; // ล้างเพื่อให้ลองใหม่ได้
        throw err;
    }
    return cached.conn;
}

// ให้ทุก request รอการเชื่อมต่อให้เสร็จก่อน
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("MongoDB Error:", err);
        res.status(500).send("เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
});

// ================= PAGE ROUTES =================
app.get("/", (req, res) => {
    res.redirect("/html/signin.html");
});

app.get("/html/index.html", async (req, res) => {
    try {
        const bonsais = await Bonsai.find();
        res.render("index", { bonsais });
    } catch (err) {
        console.error("Bonsai.find error:", err);
        res.status(500).send("ดึงข้อมูลสินค้าไม่สำเร็จ");
    }
});

// ================= AUTH API ROUTES =================

// 1. สมัครสมาชิก (เช็กรหัสผ่าน 8 ตัวขึ้นไป)
app.post("/api/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ name, email, password: hashedPassword });
        res.json({ success: true, message: "สมัครสมาชิกสำเร็จ!" });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการสมัครสมาชิก" });
    }
});

// 2. เข้าสู่ระบบ
app.post("/api/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "ไม่พบอีเมลนี้ในระบบ กรุณาสมัครสมาชิกก่อน" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
        }

        req.session.userId = user._id;
        req.session.userName = user.name;
        res.json({ success: true, message: `ยินดีต้อนรับคุณ ${user.name}` });
    } catch (err) {
        console.error("Signin error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
    }
});

// 3. ขอรีเซ็ตรหัสผ่าน (ส่งลิงก์ไปที่อีเมล)
app.post("/api/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "ไม่พบอีเมลนี้ในระบบ" });
        }

        // สร้าง Token สุ่ม 32 bytes และตั้งเวลาหมดอายุ 15 นาที
        const token = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const resetUrl = `${baseUrl}/html/repassword.html?token=${token}`;

        // ส่งอีเมลจริงถ้าตั้งค่า EMAIL_USER และ EMAIL_PASS ไว้ใน .env
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail({
                from: `"Bonsai Mori" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: "Reset Your Bonsai Mori Password",
                html: `
                    <div style="font-family: sans-serif; padding: 20px; color: #2c3e2e;">
                        <h2>Reset Your Password</h2>
                        <p>สวัสดีคุณ ${user.name},</p>
                        <p>เราได้รับคำขอเปลี่ยนรหัสผ่านสำหรับบัญชี Bonsai Mori ของคุณ กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ 15 นาที):</p>
                        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2e5a36; color: #ffffff; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                            ตั้งรหัสผ่านใหม่
                        </a>
                        <p style="font-size: 12px; color: #666;">หากคุณไม่ได้เป็นผู้ส่งคำขอนี้ สามารถละเว้นอีเมลฉบับนี้ได้เลย</p>
                    </div>
                `
            });
        }

        res.json({ success: true, message: "ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบการตั้งค่าอีเมล" });
    }
});

// 4. บันทึกรหัสผ่านใหม่จาก Token
app.post("/api/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        // ค้นหา User ที่ Token ตรงกันและยังไม่หมดอายุ ($gt: Date.now())
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "ลิงก์เปลี่ยนรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง" });
        }

        // เข้ารหัสรหัสผ่านใหม่และล้างค่า Token ทิ้ง
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" });
    }
});

// 5. ออกจากระบบ
app.post("/api/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

// รันในเครื่องด้วย node server.js ได้ตามปกติ ส่วนบน Vercel จะใช้ module.exports
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
}

module.exports = app;