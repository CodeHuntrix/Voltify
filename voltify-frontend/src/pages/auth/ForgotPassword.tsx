import React, { useState } from 'react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setSent(true)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Forgot Password</h2>
      {sent ? <p>Check your email for a reset link.</p> : (
        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
          />
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#0070f3', color: '#fff', border: 'none' }}>
            Send Reset Link
          </button>
        </form>
      )}
    </div>
  )
}
