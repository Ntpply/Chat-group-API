const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

router.get('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('username email phone birthdate');

    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    res.json({
      username: user.username,
      email: user.email,
      phone: user.phone,
      birthdate: user.birthdate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด', detail: err.message });
  }
});

router.post('/register', async (req, res) => {
  const { email, password, username, phone, birthdate } = req.body;
  if (!email || !password || !username || !phone || !birthdate)
    return res.status(400).json({ error: 'กรอกข้อมูลไม่ครบ' });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'อีเมลนี้ถูกใช้ไปแล้ว' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new User({
      email,
      password: hashedPassword,
      username,
      phone,
      birthdate
    });

    await user.save();
    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'เกิดข้อผิดพลาด', detail: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body; 

  if (!email || !password) {
    return res.status(400).json({ error: 'กรอกข้อมูลไม่ครบ' });
  }

  try {
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: email }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'อีเมลหรือชื่อผู้ใช้ไม่ถูกต้อง' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    res.status(200).json({
      message: 'เข้าสู่ระบบสำเร็จ',
      userId: user._id,
      username: user.username
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด', detail: err.message });
  }
});


module.exports = router;
