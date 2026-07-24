import React, { useState } from 'react'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [bill, setBill] = useState('')

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Setup Wizard - Step {step} of 2</h2>
      {step === 1 ? (
        <div>
          <label>Estimated Monthly Bill amount</label>
          <input 
            type="number" 
            value={bill} 
            onChange={(e) => setBill(e.target.value)} 
            style={{ display: 'block', width: '100%', padding: '8px', margin: '15px 0' }}
          />
          <button onClick={() => setStep(2)} style={{ padding: '10px 20px', background: '#0070f3', color: '#fff', border: 'none' }}>
            Next
          </button>
        </div>
      ) : (
        <div>
          <p>Appliances estimation setup completed.</p>
          <button onClick={() => alert('Onboarding completed!')} style={{ padding: '10px 20px', background: 'green', color: '#fff', border: 'none' }}>
            Finish
          </button>
        </div>
      )}
    </div>
  )
}
