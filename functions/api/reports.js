/**
 * Z-Books Financial Reporting Engine & BIR Tax Analytics
 * Cloudflare Pages Function: /functions/api/reports.js
 * Standard: PFRS for SMEs / Accrual Basis / Philippine National Internal Revenue Code (NIRC)
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'trial_balance';
  const startDate = url.searchParams.get('startDate') || '2025-01-01';
  const endDate = url.searchParams.get('endDate') || '2025-12-31';

  if (!env || !env.DB) {
    // Return sample reporting metadata if DB binding is simulated
    return new Response(JSON.stringify({
      report_type: type,
      period: { startDate, endDate },
      standard: "PFRS for SMEs",
      entity: "Jang-Jang Bakeshop",
      tin: "000-000-000-0000",
      status: "ready"
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Fetch all posted journal lines joined with accounts and entries
    const query = `
      SELECT 
        jel.account_code,
        coa.account_name,
        coa.account_type,
        coa.normal_balance,
        coa.category,
        je.entry_date,
        je.cost_center_code,
        jel.debit_amount,
        jel.credit_amount
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_code = coa.account_code
      WHERE je.status = 'POSTED'
        AND je.entry_date >= ?
        AND je.entry_date <= ?
    `;

    const { results } = await env.DB.prepare(query).bind(startDate, endDate).all();

    // Aggregate balances per account code
    const accountMap = {};
    for (const r of results) {
      if (!accountMap[r.account_code]) {
        accountMap[r.account_code] = {
          account_code: r.account_code,
          account_name: r.account_name,
          account_type: r.account_type,
          normal_balance: r.normal_balance,
          category: r.category,
          total_debit: 0,
          total_credit: 0
        };
      }
      accountMap[r.account_code].total_debit += r.debit_amount;
      accountMap[r.account_code].total_credit += r.credit_amount;
    }

    // 1. TRIAL BALANCE
    if (type === 'trial_balance') {
      const rows = Object.values(accountMap).map((acc) => {
        let debitBal = 0;
        let creditBal = 0;
        if (acc.normal_balance === 'DEBIT') {
          debitBal = Math.max(0, acc.total_debit - acc.total_credit);
        } else {
          creditBal = Math.max(0, acc.total_credit - acc.total_debit);
        }
        return {
          ...acc,
          debit_balance: Math.round(debitBal * 100) / 100,
          credit_balance: Math.round(creditBal * 100) / 100
        };
      });

      const totalDebits = rows.reduce((s, r) => s + r.debit_balance, 0);
      const totalCredits = rows.reduce((s, r) => s + r.credit_balance, 0);
      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.05;

      return new Response(JSON.stringify({
        report: "Trial Balance",
        period: { startDate, endDate },
        is_balanced: isBalanced,
        total_debits: Math.round(totalDebits * 100) / 100,
        total_credits: Math.round(totalCredits * 100) / 100,
        discrepancy: Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100,
        accounts: rows
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. PROFIT AND LOSS (INCOME STATEMENT - MANUFACTURING COGS)
    if (type === 'income_statement') {
      // Revenues
      let grossSales = 0;
      let salesDiscounts = 0;

      // Manufacturing Direct Costs
      let directMaterials = 0;
      let directLabor = 0;
      let factoryOverhead = 0;

      // Operating Expenses
      let adminSalaries = 0;
      let statutoryBenefitsER = 0;
      let rentExpense = 0;
      let utilitiesExpense = 0;
      let deliveryFuel = 0;
      let depreciationExpense = 0;
      let taxesAndPermits = 0;
      let otherOpex = 0;

      for (const acc of Object.values(accountMap)) {
        const netCredit = acc.total_credit - acc.total_debit;
        const netDebit = acc.total_debit - acc.total_credit;

        if (acc.account_type === 'REVENUE') {
          if (acc.account_code === '40103') {
            salesDiscounts += netDebit; // Sales discount is contra revenue
          } else {
            grossSales += netCredit;
          }
        } else if (acc.account_type === 'COGS') {
          if (acc.category === 'Direct Materials') directMaterials += netDebit;
          else if (acc.category === 'Direct Labor') directLabor += netDebit;
          else if (acc.category === 'Factory Overhead') factoryOverhead += netDebit;
          else directMaterials += netDebit;
        } else if (acc.account_type === 'OPEX') {
          if (acc.account_code === '60101') adminSalaries += netDebit;
          else if (['60102', '60103', '60104'].includes(acc.account_code)) statutoryBenefitsER += netDebit;
          else if (acc.account_code === '60201') rentExpense += netDebit;
          else if (acc.account_code === '60203') utilitiesExpense += netDebit;
          else if (acc.account_code === '60202') deliveryFuel += netDebit;
          else if (['60302', '60303'].includes(acc.account_code)) depreciationExpense += netDebit;
          else if (acc.account_code === '60301') taxesAndPermits += netDebit;
          else otherOpex += netDebit;
        }
      }

      const netSales = grossSales - salesDiscounts;
      const cogm = directMaterials + directLabor + factoryOverhead;
      const cogs = cogm; // Assuming inventory absorption matching
      const grossProfit = netSales - cogs;
      const totalOpex = adminSalaries + statutoryBenefitsER + rentExpense + utilitiesExpense + deliveryFuel + depreciationExpense + taxesAndPermits + otherOpex;
      const netOperatingIncome = grossProfit - totalOpex;

      return new Response(JSON.stringify({
        report: "Statement of Comprehensive Income (P&L)",
        period: { startDate, endDate },
        revenue: {
          gross_sales: grossSales,
          sales_discounts: salesDiscounts,
          net_sales: netSales
        },
        cost_of_goods_sold: {
          direct_materials: directMaterials,
          direct_labor: directLabor,
          factory_overhead: factoryOverhead,
          cost_of_goods_manufactured: cogm,
          total_cogs: cogs
        },
        gross_profit: grossProfit,
        gross_margin_percentage: netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(2) : "0.00",
        operating_expenses: {
          admin_salaries: adminSalaries,
          employer_statutory_benefits: statutoryBenefitsER,
          rent: rentExpense,
          utilities: utilitiesExpense,
          delivery_fuel: deliveryFuel,
          depreciation: depreciationExpense,
          taxes_permits: taxesAndPermits,
          other_opex: otherOpex,
          total_opex: totalOpex
        },
        net_operating_income: netOperatingIncome,
        net_profit_margin_percentage: netSales > 0 ? ((netOperatingIncome / netSales) * 100).toFixed(2) : "0.00"
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 3. BIR TAX REPORT PREVIEWS (2550Q, 1701Q, 1601-C)
    if (type === 'bir_tax') {
      const outputVatAcc = accountMap['20201']?.total_credit || 0;
      const inputVatAcc = accountMap['10401']?.total_debit || 0;
      const vatableSales = (accountMap['40101']?.total_credit || 0) + (accountMap['40102']?.total_credit || 0);

      // Form 2550Q (Quarterly VAT)
      const vat2550Q = {
        vatable_sales: vatableSales,
        output_vat_12: outputVatAcc,
        input_vat_claimed: inputVatAcc,
        net_vat_payable: Math.max(0, outputVatAcc - inputVatAcc),
        excess_input_tax: Math.max(0, inputVatAcc - outputVatAcc)
      };

      // Form 1701Q (Quarterly Income Tax)
      const grossRev = vatableSales;
      const osdDeduction = grossRev * 0.40; // 40% OSD option under PH NIRC
      const itemizedDeductions = (accountMap['60101']?.total_debit || 0) + (accountMap['60201']?.total_debit || 0) + (accountMap['60203']?.total_debit || 0);

      const taxableIncomeOSD = Math.max(0, grossRev - osdDeduction);
      const taxableIncomeItemized = Math.max(0, grossRev - itemizedDeductions);

      const incomeTax1701Q = {
        gross_revenue: grossRev,
        osd_option: {
          rate: "40% of Gross Revenue",
          deduction_amount: osdDeduction,
          net_taxable_income: taxableIncomeOSD,
          estimated_tax_due: taxableIncomeOSD * 0.20 // 20% SME baseline bracket
        },
        itemized_option: {
          deduction_amount: itemizedDeductions,
          net_taxable_income: taxableIncomeItemized,
          estimated_tax_due: taxableIncomeItemized * 0.20
        }
      };

      // Form 1601-C (Withholding on Compensation)
      const wtaxCompensation = accountMap['20202']?.total_credit || 0;
      const totalCompensationPaid = (accountMap['50201']?.total_debit || 0) + (accountMap['60101']?.total_debit || 0);

      const withholding1601C = {
        total_compensation: totalCompensationPaid,
        statutory_minimum_wage_exempt: totalCompensationPaid * 0.65, // Approximation of minimum wage earners
        statutory_contributions: (accountMap['20203']?.total_credit || 0) + (accountMap['20204']?.total_credit || 0) + (accountMap['20205']?.total_credit || 0),
        taxable_compensation: Math.max(0, totalCompensationPaid - (totalCompensationPaid * 0.65)),
        total_tax_required_withheld: wtaxCompensation
      };

      return new Response(JSON.stringify({
        entity: "Jang-Jang Bakeshop",
        tin: "000-000-000-0000",
        period: { startDate, endDate },
        form_2550Q: vat2550Q,
        form_1701Q: incomeTax1701Q,
        form_1601C: withholding1601C
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: "Unknown report type." }), { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
