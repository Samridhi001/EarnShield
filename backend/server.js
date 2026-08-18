require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const validateEnv = require('./src/utils/validateEnv');
const authRoutes = require('./src/routes/authRoutes');
const subscriptionRoutes = require('./src/routes/subscriptionRoutes');
const claimRoutes = require('./src/routes/claimRoutes');
const walletRoutes = require('./src/routes/walletRoutes');

validateEnv();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'EarnShield API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/wallet', walletRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`EarnShield backend running on port ${PORT}`);
});