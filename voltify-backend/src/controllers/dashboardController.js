export const getDashboardData = async (req, res) => {
  res.json({
    dailyUsage: [12, 15, 14, 18, 16, 20, 19],
    allocation: { Fridge: 40, AC: 35, Lighting: 15, Others: 10 }
  });
};
