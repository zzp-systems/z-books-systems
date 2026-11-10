/**
 * Z-Books Philippine Statutory Engine (2025/2026 Mandates)
 * Standard: SSS (RA 11199), PhilHealth (RA 11223), Pag-IBIG Fund, BIR TRAIN Law (RA 10963)
 */

import { Employee, TimekeepingRecord, PayrollComputedItem, JournalEntryLine } from '../types/accounting';

/**
 * 1. SSS Contribution Calculation (2025/2026 Mandate)
 * Total Contribution Rate: 14.0% (Employee: 4.5%, Employer: 9.5%)
 * Regular MSC Floor: ₱5,000 | Regular MSC Ceiling: ₱20,000 | WISP/MPF Ceiling: ₱35,000
 * Employees Compensation (EC): ₱10 (< ₱15,000 MSC) or ₱30 (>= ₱15,000 MSC)
 */
export function computeSSS(monthlyBasic: number) {
  const m = Math.max(5000, monthlyBasic);
  const regularMsc = Math.min(20000, Math.round(m / 500) * 500);

  const sss_ee = Math.round(regularMsc * 0.045 * 100) / 100;
  const sss_er = Math.round(regularMsc * 0.095 * 100) / 100;
  const ec_er = regularMsc < 15000 ? 10.00 : 30.00;

  // WISP (Mandatory Provident Fund) for compensation > ₱20,000 up to ₱35,000
  let wispMsc = 0;
  if (m > 20000) {
    const totalMsc = Math.min(35000, Math.round(m / 500) * 500);
    wispMsc = totalMsc - 20000;
  }
  const wisp_ee = Math.round(wispMsc * 0.045 * 100) / 100;
  const wisp_er = Math.round(wispMsc * 0.095 * 100) / 100;

  return {
    regularMsc,
    wispMsc,
    sss_ee,
    sss_er,
    ec_er,
    wisp_ee,
    wisp_er,
    total_ee: sss_ee + wisp_ee,
    total_er: sss_er + ec_er + wisp_er
  };
}

/**
 * 2. PhilHealth Contribution (5.0% Premium Rate)
 * Split evenly: 2.5% Employee / 2.5% Employer
 * Monthly Income Floor: ₱10,000 (Min premium ₱500 total, ₱250 each)
 * Monthly Income Ceiling: ₱100,000 (Max premium ₱5,000 total, ₱2,500 each)
 */
export function computePhilHealth(monthlyBasic: number) {
  const cappedIncome = Math.min(100000, Math.max(10000, monthlyBasic));
  const totalMonthlyPremium = Math.round(cappedIncome * 0.05 * 100) / 100;
  const share = Math.round((totalMonthlyPremium / 2) * 100) / 100;
  return {
    baseSalary: cappedIncome,
    totalPremium: totalMonthlyPremium,
    philhealth_ee: share,
    philhealth_er: share
  };
}

/**
 * 3. Pag-IBIG (HDMF) Contribution
 * Statutory 2% with statutory ceiling of ₱200 Employee and ₱200 Employer (Total ₱400/mo)
 */
export function computePagIBIG(monthlyBasic: number) {
  const share = Math.min(200.00, Math.round(monthlyBasic * 0.02 * 100) / 100);
  return {
    pagibig_ee: share,
    pagibig_er: share
  };
}

/**
 * 4. Philippine TRAIN Law (RA 10963) Semi-Monthly Withholding Tax Table
 * Monthly threshold: ₱20,833 (Semi-monthly: ₱10,417)
 */
export function computeSemiMonthlyWithholdingTax(taxableCompensation: number): number {
  if (taxableCompensation <= 10417) {
    return 0.00;
  } else if (taxableCompensation <= 16666) {
    return Math.round((taxableCompensation - 10417) * 0.15 * 100) / 100;
  } else if (taxableCompensation <= 33332) {
    return Math.round((937.50 + (taxableCompensation - 16667) * 0.20) * 100) / 100;
  } else if (taxableCompensation <= 83332) {
    return Math.round((4270.83 + (taxableCompensation - 33333) * 0.25) * 100) / 100;
  } else if (taxableCompensation <= 333332) {
    return Math.round((16770.83 + (taxableCompensation - 83333) * 0.30) * 100) / 100;
  } else {
    return Math.round((91770.83 + (taxableCompensation - 333333) * 0.35) * 100) / 100;
  }
}

/**
 * 5. Plant Timekeeping & Infraction Penalties
 * Policy:
 * - 8-hour workday
 * - Hourly Rate = Daily Rate / 8
 * - Per-Minute Rate = Hourly Rate / 60
 * - 5-minute grace period: if tardy <= 5 minutes, 0 deduction. If > 5 minutes, exact per-minute deduction.
 * - AWOL penalty: 1 full daily rate deduction per AWOL day.
 * - Overtime: 125% regular overtime rate under PH Labor Code.
 * - Perfect attendance bonus: ₱1,000 (production) or ₱750 (admin) if zero tardiness, zero undertime, zero AWOL.
 */
export function computeAttendance(dailyRate: number, timekeeping: TimekeepingRecord) {
  const hourlyRate = dailyRate / 8;
  const perMinuteRate = hourlyRate / 60;

  // 5-minute grace period policy
  const penalizedTardy = timekeeping.tardy_minutes > 5 ? timekeeping.tardy_minutes : 0;
  const tardinessDeduction = Math.round(penalizedTardy * perMinuteRate * 100) / 100;
  const undertimeDeduction = Math.round(timekeeping.undertime_minutes * perMinuteRate * 100) / 100;
  const awolDeduction = Math.round(timekeeping.awol_days * dailyRate * 100) / 100;

  const totalInfractions = tardinessDeduction + undertimeDeduction + awolDeduction;
  const isPerfectAttendance = timekeeping.tardy_minutes === 0 && timekeeping.undertime_minutes === 0 && timekeeping.awol_days === 0;

  return {
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    perMinuteRate: Math.round(perMinuteRate * 1000) / 1000,
    penalizedTardyMinutes: penalizedTardy,
    tardinessDeduction,
    undertimeDeduction,
    awolDeduction,
    totalAttendanceDeduction: totalInfractions,
    isPerfectAttendance
  };
}

/**
 * 6. Full Employee Semi-Monthly Payroll Calculation
 */
export function computeEmployeePayrollItem(
  emp: Employee,
  timekeeping: TimekeepingRecord,
  cycle: 'FIRST_HALF' | 'SECOND_HALF' | 'MONTHLY' = 'SECOND_HALF'
): PayrollComputedItem {
  const dailyRate = emp.daily_rate;
  const monthlyBasic = emp.monthly_basic_rate;

  const basicPay = Math.round(timekeeping.days_worked * dailyRate * 100) / 100;
  const hourlyRate = dailyRate / 8;
  const overtimePay = Math.round(timekeeping.ot_hours * (hourlyRate * 1.25) * 100) / 100;

  const attendance = computeAttendance(dailyRate, timekeeping);

  // Bonus for plant punctuality
  const isDirectLabor = ['Baker', 'Slicer', 'Wrapper', 'Oven Master', 'QA Inspector'].includes(emp.station_role);
  const perfectAttendanceBonus = attendance.isPerfectAttendance ? (isDirectLabor ? 1000.00 : 750.00) : 0.00;

  const grossPay = Math.max(0, Math.round((basicPay + overtimePay + perfectAttendanceBonus - attendance.totalAttendanceDeduction) * 100) / 100);

  // Monthly statutory contributions divided by 2 for semi-monthly payroll
  const sssMonthly = computeSSS(monthlyBasic);
  const phicMonthly = computePhilHealth(monthlyBasic);
  const hdmfMonthly = computePagIBIG(monthlyBasic);

  const divisor = cycle === 'MONTHLY' ? 1 : 2;
  const sss_ee = Math.round((sssMonthly.total_ee / divisor) * 100) / 100;
  const sss_er = Math.round((sssMonthly.total_er / divisor) * 100) / 100;
  const philhealth_ee = Math.round((phicMonthly.philhealth_ee / divisor) * 100) / 100;
  const philhealth_er = Math.round((phicMonthly.philhealth_er / divisor) * 100) / 100;
  const pagibig_ee = Math.round((hdmfMonthly.pagibig_ee / divisor) * 100) / 100;
  const pagibig_er = Math.round((hdmfMonthly.pagibig_er / divisor) * 100) / 100;

  const totalStatutoryEE = sss_ee + philhealth_ee + pagibig_ee;
  const totalStatutoryER = sss_er + philhealth_er + pagibig_er;

  // Taxable Compensation = Gross Pay less Statutory Employee Deductions
  const taxableCompensation = Math.max(0, grossPay - totalStatutoryEE);
  const withholdingTax = computeSemiMonthlyWithholdingTax(taxableCompensation);

  const totalDeductions = Math.round((totalStatutoryEE + withholdingTax) * 100) / 100;
  const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

  return {
    employee_id: emp.id,
    employee_name: emp.full_name,
    employee_id_number: emp.employee_id_number,
    station_role: emp.station_role,
    cost_center_code: emp.cost_center_code,
    daily_rate: dailyRate,
    monthly_basic_rate: monthlyBasic,
    days_worked: timekeeping.days_worked,
    ot_hours: timekeeping.ot_hours,
    tardy_minutes: timekeeping.tardy_minutes,
    undertime_minutes: timekeeping.undertime_minutes,
    awol_days: timekeeping.awol_days,
    basic_pay: basicPay,
    overtime_pay: overtimePay,
    perfect_attendance_bonus: perfectAttendanceBonus,
    gross_pay: grossPay,
    tardiness_deduction: attendance.tardinessDeduction,
    undertime_deduction: attendance.undertimeDeduction,
    awol_deduction: attendance.awolDeduction,
    total_attendance_deduction: attendance.totalAttendanceDeduction,
    sss_ee,
    philhealth_ee,
    pagibig_ee,
    withholding_tax: withholdingTax,
    total_statutory_ee: totalStatutoryEE,
    sss_er,
    philhealth_er,
    pagibig_er,
    total_statutory_er: totalStatutoryER,
    total_deductions: totalDeductions,
    net_pay: netPay
  };
}

/**
 * 7. Generate Balanced Compound Journal Lines for General Ledger Posting
 */
export function generatePayrollJournalLines(items: PayrollComputedItem[], runNumber: string): JournalEntryLine[] {
  let directLaborTotal = 0;
  let adminSalariesTotal = 0;
  let totalSssEr = 0;
  let totalPhicEr = 0;
  let totalHdmfEr = 0;
  let totalSssEe = 0;
  let totalPhicEe = 0;
  let totalHdmfEe = 0;
  let totalWTax = 0;
  let totalNetPay = 0;

  for (const item of items) {
    const isDirect = ['Baker', 'Slicer', 'Wrapper', 'Oven Master', 'QA Inspector'].includes(item.station_role);
    if (isDirect) {
      directLaborTotal += item.gross_pay;
    } else {
      adminSalariesTotal += item.gross_pay;
    }
    totalSssEr += item.sss_er;
    totalPhicEr += item.philhealth_er;
    totalHdmfEr += item.pagibig_er;
    totalSssEe += item.sss_ee;
    totalPhicEe += item.philhealth_ee;
    totalHdmfEe += item.pagibig_ee;
    totalWTax += item.withholding_tax;
    totalNetPay += item.net_pay;
  }

  const lines: JournalEntryLine[] = [];
  let lineOrder = 1;

  // 1. DEBIT: Direct Labor Expense
  if (directLaborTotal > 0) {
    lines.push({
      id: crypto.randomUUID(),
      account_code: '50201',
      account_name: 'Direct Labor - Bakers & Dough Handlers',
      debit_amount: Math.round(directLaborTotal * 100) / 100,
      credit_amount: 0,
      memo: `Plant direct production labor (${runNumber})`,
      line_order: lineOrder++
    });
  }

  // 2. DEBIT: Admin Salaries Expense
  if (adminSalariesTotal > 0) {
    lines.push({
      id: crypto.randomUUID(),
      account_code: '60101',
      account_name: 'Salaries & Wages - Administrative Staff',
      debit_amount: Math.round(adminSalariesTotal * 100) / 100,
      credit_amount: 0,
      memo: `Admin and store supervisor salaries (${runNumber})`,
      line_order: lineOrder++
    });
  }

  // 3. DEBIT: Employer Benefits Share
  if (totalSssEr > 0) {
    lines.push({
      id: crypto.randomUUID(),
      account_code: '60102',
      account_name: 'Employer Statutory Share - SSS (Admin & Plant)',
      debit_amount: Math.round(totalSssEr * 100) / 100,
      credit_amount: 0,
      memo: `Employer SSS & WISP contribution share`,
      line_order: lineOrder++
    });
  }

  if (totalPhicEr > 0) {
    lines.push({
      id: crypto.randomUUID(),
      account_code: '60103',
      account_name: 'Employer Statutory Share - PhilHealth',
      debit_amount: Math.round(totalPhicEr * 100) / 100,
      credit_amount: 0,
      memo: `Employer PhilHealth 2.5% premium share`,
      line_order: lineOrder++
    });
  }

  if (totalHdmfEr > 0) {
    lines.push({
      id: crypto.randomUUID(),
      account_code: '60104',
      account_name: 'Employer Statutory Share - Pag-IBIG',
      debit_amount: Math.round(totalHdmfEr * 100) / 100,
      credit_amount: 0,
      memo: `Employer Pag-IBIG HDMF statutory share`,
      line_order: lineOrder++
    });
  }

  // 4. CREDIT: SSS Payable (Combined EE + ER)
  const combinedSss = Math.round((totalSssEe + totalSssEr) * 100) / 100;
  if (combinedSss > 0) {
    lines.push({
      id: crypto.randomUUID(),
      account_code: '20203',
      account_name: 'Due to SSS (Employee & Employer Premiums)',
      debit_amount: 0,
      credit_amount: combinedSss,
      memo: `Mandatory SSS remittance (EE: ₱${totalSssEe.toFixed(2)}, ER: ₱${totalSssEr.toFixed(2)})`,
      line_order: lineOrder++
    });
  }

  // 5. CREDIT: PhilHealth Payable (Combined EE + ER)
  const combinedPhic = Math.round((totalPhicEe + totalPhicEr) * 100) / 100;
  if (combinedPhic > 0) {
    lines.push({
      id: crypto.randomUUID(),
      account_code: '20204',
      account_name: 'Due to PhilHealth (PHIC Premiums)',
      debit_amount: 0,
      credit_amount: combinedPhic,
      memo: `PhilHealth remittance (EE: ₱${totalPhicEe.toFixed(2)}, ER: ₱${totalPhicEr.toFixed(2)})`,
      line_order: lineOrder++
    });
  }

  // 6. CREDIT: Pag-IBIG Payable (Combined EE + ER)
  const combinedHdmf = Math.round((totalHdmfEe + totalHdmfEr) * 100) / 100;
  if (combinedHdmf > 0) {
    lines.push({
      id: crypto.randomUUID(),
      account_code: '20205',
      account_name: 'Due to Pag-IBIG (HDMF Premiums)',
      debit_amount: 0,
      credit_amount: combinedHdmf,
      memo: `Pag-IBIG remittance (EE: ₱${totalHdmfEe.toFixed(2)}, ER: ₱${totalHdmfEr.toFixed(2)})`,
      line_order: lineOrder++
    });
  }

  // 7. CREDIT: Withholding Tax on Compensation
  if (totalWTax > 0) {
    lines.push({
      id: crypto.randomUUID(),
      account_code: '20202',
      account_name: 'Withholding Tax Payable - Compensation (BIR Form 1601-C)',
      debit_amount: 0,
      credit_amount: Math.round(totalWTax * 100) / 100,
      memo: `BIR TRAIN compensation tax withheld for remittance`,
      line_order: lineOrder++
    });
  }

  // 8. CREDIT: Cash in Bank / Net Pay Payout
  lines.push({
    id: crypto.randomUUID(),
    account_code: '10102',
    account_name: 'Cash in Bank - BDO Current Account',
    debit_amount: 0,
    credit_amount: Math.round(totalNetPay * 100) / 100,
    memo: `Net salary disbursement to employees via online payroll transfer`,
    line_order: lineOrder++
  });

  // Strict balancing check adjustment if minor rounding penny difference exists
  const sumDebits = Math.round(lines.reduce((s, l) => s + l.debit_amount, 0) * 100) / 100;
  const sumCredits = Math.round(lines.reduce((s, l) => s + l.credit_amount, 0) * 100) / 100;
  const delta = Math.round((sumDebits - sumCredits) * 100) / 100;

  if (Math.abs(delta) > 0 && Math.abs(delta) <= 0.05) {
    // Adjust cash credit to eliminate penny rounding discrepancy
    const cashLine = lines.find(l => l.account_code === '10102');
    if (cashLine) {
      cashLine.credit_amount = Math.round((cashLine.credit_amount + delta) * 100) / 100;
    }
  }

  return lines;
}
