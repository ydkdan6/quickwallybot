import express from 'express';
const router = express.Router();
import userService from '../../services/userService';
const { validateTelegramWebAppData } = require('../utils/telegramAuth');

router.post('/', async (req, res) => {

  const userServices = new userService();

  try {
    const { telegram_id, full_name, email, pin, init_data } = req.body;

    if (!telegram_id || !full_name || !email || !pin) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!/^[0-9]{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4-6 digits' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const existingUser = await userServices.getUserByTelegramId(telegram_id);
    if (existingUser) {
      return res.status(400).json({ error: 'User already registered' });
    }

    const result = await userServices.createUser(telegram_id, full_name, email, pin);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: result.user.id,
        full_name: result.user.full_name,
        email: result.user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

module.exports = router;
