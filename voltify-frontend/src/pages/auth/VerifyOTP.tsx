import React, { useState } from 'react'

export default function VerifyOTP() {
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 6) {
      setMessage('OTP verified successfully!')
    } else {
      setMessage('Invalid OTP format')
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Verify OTP</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleVerify}>
        <input 
          type="text" 
          placeholder="Enter 6-digit OTP" 
          value={otp} 
          onChange={(e) => setOtp(e.target.value)} 
          style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
        />
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#0070f3', color: '#fff', border: 'none' }}>
          Verify
        </button>
      </form>
    </div>
  )
}
