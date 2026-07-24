import React from 'react'
import DailyEnergyChart from '../components/dashboard/DailyEnergyChart'
import ApplianceAllocationChart from '../components/dashboard/ApplianceAllocationChart'

export default function Dashboard() {
  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>
      <h1>Dashboard Overview</h1>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ flex: 1, padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Daily Usage Trend</h3>
          <DailyEnergyChart />
        </div>
        <div style={{ flex: 1, padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Appliance Allocation</h3>
          <ApplianceAllocationChart />
        </div>
      </div>
    </div>
  )
}
