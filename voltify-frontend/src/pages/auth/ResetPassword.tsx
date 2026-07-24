import React, { useState } from 'react'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length >= 8) {
      setDone(true)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Reset Password</h2>
      {done ? <p>Password reset complete. You can login now.</p> : (
        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            placeholder="New Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
          />
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#0070f3', color: '#fff', border: 'none' }}>
            Update Password
          </button>
        </form>
      )}
    </div>
  )
}
