export function calculatePlatformFee(amount: number, status?: string): number {
  const fee = amount * 0.07; // 7%
  // For refunded orders, platform fee should be negative (refunded)
  return status === 'refunded' ? -fee : fee;
}

export function calculateStripeFee(amount: number): number {
  return (amount * 0.029) + 0.30; // 2.9% + $0.30
}

export function calculateNetAmount(amount: number, status?: string): number {
  const platformFee = calculatePlatformFee(amount, status);
  const stripeFee = calculateStripeFee(amount);
  return amount - platformFee - stripeFee;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}
