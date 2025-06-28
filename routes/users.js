const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/register', async (req, res) => {
  const { email, password, username, phone, birthdate } = req.body;
  if (!email || !password || !username || !phone || !birthdate)
    return res.status(400).json({ error: 'กรอกข้อมูลไม่ครบ' });
  try {
    const user = new User({ email, password, username, phone, birthdate });
    await user.save();
    res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด', detail: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    res.status(200).json({ message: 'เข้าสู่ระบบสำเร็จ' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'เกิดข้อผิดพลาด', detail: err.message });
  }
});

module.exports = router;
