export const saveOnboarding = async (req, res) => {
  const { billAmount, appliances } = req.body;
  res.json({ status: 'success', estimated_units: billAmount * 0.5 });
};
