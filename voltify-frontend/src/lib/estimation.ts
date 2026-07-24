export function calculateEstimation(billAmount: number, appliances: string[]) {
  return billAmount * 0.8 / (appliances.length || 1);
}
