export const getLeaderboard = async (req, res) => {
  const { type } = req.params;
  
  const rankings = [
    { rank: 1, name: 'Ananya Sharma', coins: 450, streak: 12, savings_pct: 18, rank_change: 0, is_current_user: false },
    { rank: 2, name: 'Vikram Singh', coins: 380, streak: 9, savings_pct: 15, rank_change: 1, is_current_user: false },
    { rank: 3, name: 'Ravi Kumar', coins: 250, streak: 7, savings_pct: 12, rank_change: -1, is_current_user: true },
    { rank: 4, name: 'Priya Patel', coins: 180, streak: 4, savings_pct: 9, rank_change: 0, is_current_user: false }
  ];

  res.json({
    type,
    period: 'weekly',
    rankings,
    user_rank: { rank: 3, rank_change: -1 }
  });
};
