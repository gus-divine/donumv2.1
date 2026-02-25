import type { PaymentFrequency } from '@/lib/api/loans';

export interface AmortizationPayment {
  paymentNumber: number;
  scheduledDate: string;
  dueDate: string;
  amountDue: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
}

export interface AmortizationSchedule {
  payments: AmortizationPayment[];
  totalPayments: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPrincipal: number;
}

/**
 * Calculate monthly payment amount using standard amortization formula
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 * where P = principal, r = monthly interest rate, n = number of payments
 */
export function calculateMonthlyPayment(
  principal: number,
  annualInterestRate: number,
  termMonths: number
): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualInterestRate === 0) return principal / termMonths;

  const monthlyRate = annualInterestRate / 12;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
  
  return principal * (numerator / denominator);
}

/**
 * Calculate payment amount based on frequency
 */
export function calculatePaymentAmount(
  principal: number,
  annualInterestRate: number,
  termMonths: number,
  frequency: PaymentFrequency
): number {
  const monthlyPayment = calculateMonthlyPayment(principal, annualInterestRate, termMonths);
  
  switch (frequency) {
    case 'monthly':
      return monthlyPayment;
    case 'quarterly':
      return monthlyPayment * 3;
    case 'annually':
      return monthlyPayment * 12;
    default:
      return monthlyPayment;
  }
}

/**
 * Calculate number of payments based on frequency
 */
export function calculateNumberOfPayments(
  termMonths: number,
  frequency: PaymentFrequency
): number {
  switch (frequency) {
    case 'monthly':
      return termMonths;
    case 'quarterly':
      return Math.ceil(termMonths / 3);
    case 'annually':
      return Math.ceil(termMonths / 12);
    default:
      return termMonths;
  }
}

/**
 * Calculate months between payments based on frequency
 */
export function getMonthsBetweenPayments(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'annually':
      return 12;
    default:
      return 1;
  }
}

/**
 * Generate complete amortization schedule
 */
export function generateAmortizationSchedule(
  principal: number,
  annualInterestRate: number,
  termMonths: number,
  frequency: PaymentFrequency,
  startDate: Date = new Date()
): AmortizationSchedule {
  const monthlyRate = annualInterestRate / 12;
  const paymentAmount = calculatePaymentAmount(principal, annualInterestRate, termMonths, frequency);
  const numberOfPayments = calculateNumberOfPayments(termMonths, frequency);
  const monthsBetweenPayments = getMonthsBetweenPayments(frequency);

  const payments: AmortizationPayment[] = [];
  let remainingBalance = principal;
  const scheduleDate = new Date(startDate);

  for (let i = 1; i <= numberOfPayments; i++) {
    // Calculate interest for this payment period
    // For non-monthly frequencies, calculate interest over multiple months
    const interestAmount = remainingBalance * monthlyRate * monthsBetweenPayments;
    
    // Calculate principal payment
    let principalAmount = paymentAmount - interestAmount;
    
    // For the last payment, adjust to ensure balance goes to zero
    if (i === numberOfPayments) {
      principalAmount = remainingBalance;
      const finalPaymentAmount = principalAmount + interestAmount;
      
      payments.push({
        paymentNumber: i,
        scheduledDate: scheduleDate.toISOString().split('T')[0],
        dueDate: scheduleDate.toISOString().split('T')[0],
        amountDue: finalPaymentAmount,
        principalAmount: principalAmount,
        interestAmount: interestAmount,
        remainingBalance: 0,
      });
      break;
    }

    // Ensure principal doesn't exceed remaining balance
    if (principalAmount > remainingBalance) {
      principalAmount = remainingBalance;
    }

    remainingBalance -= principalAmount;

    // Calculate scheduled and due dates
    const scheduledDateStr = new Date(scheduleDate).toISOString().split('T')[0];
    const dueDateStr = new Date(scheduleDate).toISOString().split('T')[0];

    payments.push({
      paymentNumber: i,
      scheduledDate: scheduledDateStr,
      dueDate: dueDateStr,
      amountDue: paymentAmount,
      principalAmount: principalAmount,
      interestAmount: interestAmount,
      remainingBalance: remainingBalance,
    });

    // Move to next payment date
    scheduleDate.setMonth(scheduleDate.getMonth() + monthsBetweenPayments);
  }

  const totalInterest = payments.reduce((sum, p) => sum + p.interestAmount, 0);
  const totalPrincipal = payments.reduce((sum, p) => sum + p.principalAmount, 0);

  return {
    payments,
    totalPayments: numberOfPayments,
    monthlyPayment: paymentAmount,
    totalInterest,
    totalPrincipal,
  };
}

/**
 * Calculate maturity date based on loan start date and term
 */
export function calculateMaturityDate(
  startDate: Date,
  termMonths: number
): Date {
  const maturityDate = new Date(startDate);
  maturityDate.setMonth(maturityDate.getMonth() + termMonths);
  return maturityDate;
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
