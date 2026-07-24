import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes.js';
import onboardingRoutes from './src/routes/onboardingRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import gamificationRoutes from './src/routes/gamificationRoutes.js';
import leaderboardRoutes from './src/routes/leaderboardRoutes.js';
import profileRoutes from './src/routes/profileRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import coachRoutes from './src/routes/coachRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/notification', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
