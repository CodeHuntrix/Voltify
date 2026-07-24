import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import VerifyOTP from './pages/auth/VerifyOTP'
import Onboarding from './pages/onboarding'
import Dashboard from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Predictions from './pages/Predictions'
import Shop from './pages/Shop'
import Streak from './pages/Streak'
import AppLayout from './components/layout/AppLayout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Protected Dashboard Layout Routes */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/streak" element={<Streak />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
