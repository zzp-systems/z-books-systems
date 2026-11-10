/**
 * Z-Books Philippine Statutory Payroll Engine (2025/2026 Mandates)
 * Cloudflare Pages Function: /functions/api/payroll.js
 * Governed by: SSS Law (RA 11199), Universal Health Care (RA 11223), Pag-IBIG Fund, TRAIN Law (RA 10963)
 */

// ---------------------------------------------------------------------
// 1. STATUTORY COMPUTATION UTILITIES
// ---------------------------------------------------------------------

/**
 * Compute SSS Contribution (2025/2026 Mandate: 14% Total: 4.5% EE, 9.5% ER)
 * Minimum MSC = ₱5,000, Regular MSC Ceiling = ₱20,000, WISP/MPF Cap = ₱35,000
 */
export function calculateSSS(monthlyBasic) {
  const m = Math.max(5000, monthlyBasic);
  
  // Regular SSS MSC (capped at 20,000)
  const regularMsc = Math.min(20000, Math.round(m / 500) * 500);
  const sss_ee = Math.round(regularMsc * 0.045 * 100) / 100;
  const sss_er = Math.round(regularMsc * 0.095 * 100) / 100;

  // Employees Compensation (EC) - ER only
  const ec_er = regularMsc < 15000 ? 10.00 : 30.00;

  // WISP (Workers' Investment and Savings Program) for MSC > 20,000 up to 35,000
  let wispMsc = 0;
  if (m > 20000) {
    const cappedTotalMsc = Math.min(35000, Math.round(m / 500) * 500);
    wispMsc = cappedTotalMsc - 20000;
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
 * Compute PhilHealth Premium (5% statutory rate: 2.5% EE / 2.5% ER)
 * Income floor: ₱10,000 (Min ₱500 total / ₱250 each), ceiling: ₱100,000 (Max ₱5,000 total / ₱2,500 each)
 */
export function calculatePhilHealth(monthlyBasic) {
  const cappedIncome = Math.min(100000, Math.max(10000, monthlyBasic));
  const totalPremium = Math.round(cappedIncome * 0.05 * 100) / 100;
  const share = Math.round((totalPremium / 2) * 100) / 100;
  return {
    baseSalary: cappedIncome,
    totalPremium,
    philhealth_ee: share,
    philhealth_er: share
  };
}

/**
 * Compute Pag-IBIG (HDMF) Contribution
 * Statutory 2% capped at ₱200 EE and ₱200 ER (Total ₱400/month)
 */
export function calculatePagIBIG(monthlyBasic) {
  const share = Math.min(200.00, Math.round(monthlyBasic * 0.02 * 100) / 100);
  return {
    pagibig_ee: share,
    pagibig_er: share
  };
}

/**
 * Compute Philippine TRAIN Law (RA 10963) Semi-Monthly Withholding Tax on Compensation
 * Exemption threshold: ₱10,417 semi-monthly (equivalent to ₱20,833 monthly)
 */
export function calculateSemiMonthlyWTax(taxableCompensation) {
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
 * Plant Attendance Infraction Deduction
 * Daily Rate / 8 = Hourly Rate; Hourly Rate / 60 = Per-Minute Rate
 * 5-minute grace period policy: tardiness <= 5 minutes is forgiven (0 deduction).
 * Tardiness > 5 minutes is deducted in full.
 */
export function calculateAttendancePenalties(dailyRate, tardyMinutes, undertimeMinutes, awolDays) {
  const hourlyRate = dailyRate / 8;
  const perMinuteRate = hourlyRate / 60;

  // Grace period rule
  const penalizedTardyMinutes = tardyMinutes > 5 ? tardyMinutes : 0;
  const tardinessDeduction = Math.round(penalizedTardyMinutes * perMinuteRate * 100) / 100;
  const undertimeDeduction = Math.round(undertimeMinutes * perMinuteRate * 100) / 100;
  const awolDeduction = Math.round(awolDays * dailyRate * 100) / 100;

  return {
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    perMinuteRate: Math.round(perMinuteRate * 1000) / 1000,
    tardinessDeduction,
    undertimeDeduction,
    awolDeduction,
    totalAttendanceDeductions: tardinessDeduction + undertimeDeduction + awolDeduction,
    qualifiedForAttendanceIncentive: tardyMinutes === 0 && undertimeMinutes === 0 && awolDays === 0
  };
}

// ---------------------------------------------------------------------
// 2. HTTP HANDLERS
// ---------------------------------------------------------------------

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const payload = await request.json();
    const { action } = payload;

    // A. PREVIEW OR COMPUTE PAYROLL FOR A LIST OF EMPLOYEES
    if (action === 'compute_item' || action === 'compute_run') {
      const {
        employees = [],
        period_start,
        period_end,
        payout_date,
        is_second_half = true
      } = payload;

      let totalGross = 0;
      let totalEEDeductions = 0;
      let totalERContributions = 0;
      let totalNet = 0;

      const computedItems = employees.map((emp) => {
        const dailyRate = parseFloat(emp.daily_rate) || (parseFloat(emp.monthly_basic_rate) / 26) || 610.00; // Standard Philippine minimum wage benchmark
        const monthlyBasic = parseFloat(emp.monthly_basic_rate) || (dailyRate * 26);
        const daysWorked = parseFloat(emp.days_worked ?? 13); // 13 days in a semi-monthly period
        const otHours = parseFloat(emp.ot_hours ?? 0);
        const tardyMinutes = parseFloat(emp.tardy_minutes ?? 0);
        const undertimeMinutes = parseFloat(emp.undertime_minutes ?? 0);
        const awolDays = parseFloat(emp.awol_days ?? 0);

        // Earnings
        const basicPay = Math.round(daysWorked * dailyRate * 100) / 100;
        const hourlyRate = dailyRate / 8;
        // 125% regular overtime rate under PH Labor Code
        const otPay = Math.round(otHours * hourlyRate * 1.25 * 100) / 100;

        // Attendance deductions
        const attendance = calculateAttendancePenalties(dailyRate, tardyMinutes, undertimeMinutes, awolDays);

        // Attendance incentive (₱1,000 semi-monthly / ₱2,000 monthly for zero plant infractions)
        const perfectAttendanceBonus = attendance.qualifiedForAttendanceIncentive ? (emp.station_role === 'Baker' || emp.station_role === 'Slicer' ? 1000.00 : 750.00) : 0.00;

        const grossPay = Math.round((basicPay + otPay + perfectAttendanceBonus - attendance.totalAttendanceDeductions) * 100) / 100;

        // Statutory Deductions (Calculated semi-monthly: 50% on 1st half / 50% on 2nd half or applied per cycle)
        const sss = calculateSSS(monthlyBasic);
        const phic = calculatePhilHealth(monthlyBasic);
        const hdmf = calculatePagIBIG(monthlyBasic);

        // In Philippine standard SME payroll, statutory contributions are split 50/50 per pay cycle
        const sss_ee = Math.round((sss.total_ee / 2) * 100) / 100;
        const sss_er = Math.round((sss.total_er / 2) * 100) / 100;
        const phic_ee = Math.round((phic.philhealth_ee / 2) * 100) / 100;
        const phic_er = Math.round((phic.philhealth_er / 2) * 100) / 100;
        const pagibig_ee = Math.round((hdmf.pagibig_ee / 2) * 100) / 100;
        const pagibig_er = Math.round((hdmf.pagibig_er / 2) * 100) / 100;

        const totalStatutoryEE = sss_ee + phic_ee + pagibig_ee;
        const totalStatutoryER = sss_er + phic_er + pagibig_er;

        // Taxable Compensation = Gross Pay less Statutory Employee Share (TRAIN Law)
        const taxableCompensation = Math.max(0, grossPay - totalStatutoryEE);
        const withholdingTax = calculateSemiMonthlyWTax(taxableCompensation);

        const employeeTotalDeductions = Math.round((totalStatutoryEE + withholdingTax) * 100) / 100;
        const netPay = Math.round((grossPay - employeeTotalDeductions) * 100) / 100;

        totalGross += grossPay;
        totalEEDeductions += employeeTotalDeductions;
        totalERContributions += totalStatutoryER;
        totalNet += netPay;

        return {
          employee_id: emp.id,
          employee_name: emp.full_name,
          employee_id_number: emp.employee_id_number,
          station_role: emp.station_role,
          cost_center_code: emp.cost_center_code,
          daily_rate: dailyRate,
          monthly_basic_rate: monthlyBasic,
          days_worked: daysWorked,
          ot_hours: otHours,
          tardy_minutes: tardyMinutes,
          undertime_minutes: undertimeMinutes,
          awol_days: awolDays,
          basic_pay: basicPay,
          overtime_pay: otPay,
          perfect_attendance_bonus: perfectAttendanceBonus,
          tardiness_deduction: attendance.tardinessDeduction,
          undertime_deduction: attendance.undertimeDeduction,
          awol_deduction: attendance.awolDeduction,
          gross_pay: grossPay,
          sss_ee,
          sss_er,
          philhealth_ee,
          philhealth_er,
          pagibig_ee,
          pagibig_er,
          withholding_tax: withholdingTax,
          total_deductions: employeeTotalDeductions,
          net_pay: netPay
        };
      });

      return new Response(JSON.stringify({
        summary: {
          total_gross: Math.round(totalGross * 100) / 100,
          total_ee_deductions: Math.round(totalEEDeductions * 100) / 100,
          total_er_contributions: Math.round(totalERContributions * 100) / 100,
          total_net: Math.round(totalNet * 100) / 100,
          employee_count: employees.length,
          period_start,
          period_end,
          payout_date
        },
        items: computedItems
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // B. AUTO-POST PAYROLL TO GENERAL LEDGER
    if (action === 'post_to_ledger') {
      const { payrollSummary, items = [], payout_date, run_number, cost_center_code = 'IND-PLANT' } = payload;

      if (!payrollSummary || items.length === 0) {
        return new Response(JSON.stringify({ error: "Cannot post empty payroll summary." }), { status: 400 });
      }

      // Categorize labor into Direct Labor (Production: Baker, Slicer, Wrapper, QA) and Admin Salaries
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

      // Compose compound journal entry lines
      const lines = [];

      // 1. Debits: Direct Labor & Admin Salaries
      if (directLaborTotal > 0) {
        lines.push({
          account_code: '50201', // Direct Labor - Bakers & Dough Handlers
          debit_amount: Math.round(directLaborTotal * 100) / 100,
          credit_amount: 0,
          memo: `Direct labor payroll for plant production crew (${run_number})`
        });
      }

      if (adminSalariesTotal > 0) {
        lines.push({
          account_code: '60101', // Salaries & Wages - Administrative Staff
          debit_amount: Math.round(adminSalariesTotal * 100) / 100,
          credit_amount: 0,
          memo: `Salaries & wages for administrative and store operations (${run_number})`
        });
      }

      // 2. Debits: Employer Contributions Expense
      if (totalSssEr > 0) {
        lines.push({
          account_code: '60102', // Employer Statutory Share - SSS
          debit_amount: Math.round(totalSssEr * 100) / 100,
          credit_amount: 0,
          memo: `Employer SSS statutory share contribution`
        });
      }

      if (totalPhicEr > 0) {
        lines.push({
          account_code: '60103', // Employer Statutory Share - PhilHealth
          debit_amount: Math.round(totalPhicEr * 100) / 100,
          credit_amount: 0,
          memo: `Employer PhilHealth 2.5% premium share`
        });
      }

      if (totalHdmfEr > 0) {
        lines.push({
          account_code: '60104', // Employer Statutory Share - Pag-IBIG
          debit_amount: Math.round(totalHdmfEr * 100) / 100,
          credit_amount: 0,
          memo: `Employer Pag-IBIG statutory share`
        });
      }

      // 3. Credits: Statutory Payables (Combined EE + ER)
      const combinedSss = Math.round((totalSssEe + totalSssEr) * 100) / 100;
      if (combinedSss > 0) {
        lines.push({
          account_code: '20203', // Due to SSS
          debit_amount: 0,
          credit_amount: combinedSss,
          memo: `Mandatory SSS remittance payable (EE: ₱${totalSssEe.toFixed(2)} + ER: ₱${totalSssEr.toFixed(2)})`
        });
      }

      const combinedPhic = Math.round((totalPhicEe + totalPhicEr) * 100) / 100;
      if (combinedPhic > 0) {
        lines.push({
          account_code: '20204', // Due to PhilHealth
          debit_amount: 0,
          credit_amount: combinedPhic,
          memo: `PhilHealth premium remittance payable (EE: ₱${totalPhicEe.toFixed(2)} + ER: ₱${totalPhicEr.toFixed(2)})`
        });
      }

      const combinedHdmf = Math.round((totalHdmfEe + totalHdmfEr) * 100) / 100;
      if (combinedHdmf > 0) {
        lines.push({
          account_code: '20205', // Due to Pag-IBIG
          debit_amount: 0,
          credit_amount: combinedHdmf,
          memo: `Pag-IBIG HDMF remittance payable (EE: ₱${totalHdmfEe.toFixed(2)} + ER: ₱${totalHdmfEr.toFixed(2)})`
        });
      }

      if (totalWTax > 0) {
        lines.push({
          account_code: '20202', // Withholding Tax Payable - BIR Form 1601-C
          debit_amount: 0,
          credit_amount: Math.round(totalWTax * 100) / 100,
          memo: `BIR TRAIN compensation tax withheld`
        });
      }

      // Net Pay Disbursement credit
      lines.push({
        account_code: '10102', // Cash in Bank - BDO Current Account
        debit_amount: 0,
        credit_amount: Math.round(totalNetPay * 100) / 100,
        memo: `Net salary payout to employees via direct bank transfer (${run_number})`
      });

      // Balancing Verification
      const sumD = lines.reduce((acc, l) => acc + (l.debit_amount || 0), 0);
      const sumC = lines.reduce((acc, l) => acc + (l.credit_amount || 0), 0);
      const diff = Math.round(Math.abs(sumD - sumC) * 100) / 100;

      if (diff > 0.05) {
        return new Response(JSON.stringify({
          error: "PRISMER Balance Error in payroll journal generation",
          debits: sumD,
          credits: sumC,
          difference: diff
        }), { status: 422 });
      }

      // If D1 database bound, commit transaction
      let jeId = crypto.randomUUID();
      const dateStr = payout_date || new Date().toISOString().slice(0, 10);
      const yyyymm = dateStr.replace(/-/g, '').slice(0, 6);
      const seq = Math.floor(1000 + Math.random() * 9000);
      const entryNumber = `JE-${yyyymm}-${seq}`;

      if (env && env.DB) {
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO journal_entries (id, entry_number, entry_date, reference_doc, description, status, cost_center_code, payee_vendor, total_amount, created_by, posted_at)
            VALUES (?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, 'Payroll System Auto-Post', CURRENT_TIMESTAMP)
          `).bind(
            jeId,
            entryNumber,
            dateStr,
            run_number,
            `Disbursement of semi-monthly payroll ${run_number} for Jang-Jang Bakeshop`,
            cost_center_code,
            'Employees Payroll Batch',
            sumD
          ),
          ...lines.map((l, idx) => 
            env.DB.prepare(`
              INSERT INTO journal_entry_lines (id, journal_entry_id, account_code, debit_amount, credit_amount, memo, line_order)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
              crypto.randomUUID(),
              jeId,
              l.account_code,
              l.debit_amount,
              l.credit_amount,
              l.memo,
              idx + 1
            )
          )
        ]);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Successfully posted payroll run to General Ledger under ${entryNumber}`,
        journal_entry_id: jeId,
        entry_number: entryNumber,
        lines,
        total_disbursed: totalNetPay
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action." }), { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
