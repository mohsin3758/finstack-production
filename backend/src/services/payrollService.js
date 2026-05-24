'use strict';
// ============================================================
// India Payroll Calculation Engine
// PF: EPF 3.67% + EPS 8.33% (employee 12%, employer 12%)
// ESI: Employee 0.75%, Employer 3.25% (applicable ≤₹21,000 gross)
// PT:  State-wise slab (Karnataka: ₹200/month for >₹15,000)
// TDS: Section 192
// ============================================================

// PF constants
const PF_EMP_RATE  = 0.12;    // 12% employee
const PF_EMPR_RATE = 0.12;    // 12% employer (3.67% EPF + 8.33% EPS)
const EPF_RATE     = 0.0367;
const EPS_RATE     = 0.0833;
const PF_CEILING   = 15000;   // PF on max ₹15,000 basic

// ESI constants
const ESI_EMP_RATE  = 0.0075;
const ESI_EMPR_RATE = 0.0325;
const ESI_CEILING   = 21000;  // ESI only if gross ≤ ₹21,000

// PT slabs by state
const PT_SLABS = {
  default:       [{ min: 0,     max: 15000,      pt: 0   }, { min: 15001, max: Infinity, pt: 200 }],
  karnataka:     [{ min: 0,     max: 15000,      pt: 0   }, { min: 15001, max: Infinity, pt: 200 }],
  maharashtra:   [{ min: 0,     max: 7500,       pt: 0   }, { min: 7501, max: 10000, pt: 175 }, { min: 10001, max: Infinity, pt: 200 }],
  'andhra pradesh': [{ min: 0, max: 15000,       pt: 0   }, { min: 15001, max: 20000, pt: 150 }, { min: 20001, max: Infinity, pt: 200 }],
  telangana:     [{ min: 0,     max: 15000,      pt: 0   }, { min: 15001, max: 20000, pt: 150 }, { min: 20001, max: Infinity, pt: 200 }],
  'west bengal': [{ min: 0,     max: 8500,       pt: 0   }, { min: 8501,  max: 10000, pt: 90 }, { min: 10001, max: 15000, pt: 110 }, { min: 15001, max: 25000, pt: 130 }, { min: 25001, max: 40000, pt: 150 }, { min: 40001, max: Infinity, pt: 200 }],
};

function getPT(gross, state = 'karnataka') {
  const slabs = PT_SLABS[state.toLowerCase()] || PT_SLABS.default;
  for(const s of slabs) {
    if(gross >= s.min && gross <= s.max) return s.pt;
  }
  return 200;
}

// ── Main payroll calculator ────────────────────────────────────────────────
function calculatePayroll(employee, params = {}) {
  const {
    present_days    = 26,
    working_days    = 26,
    calendar_days   = 30,
    advance         = 0,
    other_deduction = 0,
    other_allowance = 0,
  } = params;

  const basic      = parseFloat(employee.basic)        || 0;
  const hra        = parseFloat(employee.hra)          || Math.round(basic * 0.40);
  const da         = parseFloat(employee.da)           || 0;
  const specialAlw = parseFloat(employee.special_allow)|| 0;
  const lta        = parseFloat(employee.lta)          || 0;
  const state      = (employee.state || 'Karnataka').toLowerCase();

  // Prorate by attendance
  const ratio       = working_days > 0 ? Math.min(1, present_days / working_days) : 1;
  const basicEarned = Math.round(basic      * ratio);
  const hraEarned   = Math.round(hra        * ratio);
  const daEarned    = Math.round(da         * ratio);
  const spEarned    = Math.round(specialAlw * ratio);
  const ltaEarned   = Math.round(lta        * ratio);
  const otherEarned = Math.round((parseFloat(other_allowance)||0) * ratio);
  const gross       = basicEarned + hraEarned + daEarned + spEarned + ltaEarned + otherEarned;

  // PF — on min(basic_earned, PF_CEILING)
  let pfEmployee = 0, pfEmployer = 0, epfEmployee = 0, epsEmployer = 0, epfEmployer = 0;
  if(parseInt(employee.pf_enrolled)) {
    const pfBase  = Math.min(basicEarned, PF_CEILING);
    pfEmployee    = Math.round(pfBase * PF_EMP_RATE);
    epsEmployer   = Math.round(pfBase * EPS_RATE);
    epfEmployer   = Math.round(pfBase * EPF_RATE);
    pfEmployer    = epsEmployer + epfEmployer;
    epfEmployee   = Math.round(pfBase * (PF_EMP_RATE - EPS_RATE));
  }

  // ESI
  let esiEmployee = 0, esiEmployer = 0;
  if(parseInt(employee.esi_enrolled) && gross <= ESI_CEILING) {
    esiEmployee = Math.round(gross * ESI_EMP_RATE);
    esiEmployer = Math.round(gross * ESI_EMPR_RATE);
  }

  // PT
  const pt = parseInt(employee.pt_enrolled) ? getPT(gross, state) : 0;

  // TDS (simplified — use tds_rate % of gross)
  const tdsRate = parseFloat(employee.tds_rate) || 0;
  const tds     = Math.round(gross * tdsRate / 100);

  // Totals
  const totalDeduction = pfEmployee + esiEmployee + pt + tds +
    Math.round(parseFloat(advance)||0) + Math.round(parseFloat(other_deduction)||0);
  const netPay         = Math.max(0, gross - totalDeduction);

  return {
    calendar_days, working_days, present_days,
    leave_days:    Math.max(0, working_days - present_days),
    basic_earned:  basicEarned,
    hra_earned:    hraEarned,
    da_earned:     daEarned,
    special_earned:spEarned,
    lta_earned:    ltaEarned,
    other_allow:   otherEarned,
    gross,
    pf_employee:   pfEmployee,
    pf_employer:   pfEmployer,
    epf_employee:  epfEmployee,
    eps_employer:  epsEmployer,
    epf_employer:  epfEmployer,
    esi_employee:  esiEmployee,
    esi_employer:  esiEmployer,
    pt,
    tds,
    advance:       Math.round(parseFloat(advance)||0),
    other_deduction: Math.round(parseFloat(other_deduction)||0),
    total_deduction: totalDeduction,
    net_pay:         netPay,
    ctc_monthly:     gross + pfEmployer + esiEmployer,
    ctc_annual:      (gross + pfEmployer + esiEmployer) * 12,
  };
}

// ── Contractor billing calculator ─────────────────────────────────────────
function calculateContractorBilling(contractor, params = {}) {
  const {
    worked_days   = contractor.calendar_days || 30,
    calendar_days = contractor.calendar_days || 30,
    client_gst_pct= 18,
  } = params;

  const poValue  = parseFloat(contractor.po_value)       || 0;
  const salary   = parseFloat(contractor.monthly_salary) || 0;
  const tdsPct   = parseFloat(contractor.tds_pct)        || 0;
  const extraExp = parseFloat(contractor.extra_expense)  || 0;
  const contrGst = !!contractor.contractor_gst;

  const perDay      = calendar_days > 0 ? poValue / calendar_days : 0;
  const billProrated= Math.round(perDay * worked_days);
  const clientGstAmt= Math.round(billProrated * client_gst_pct / 100);
  const invoiceTotal= billProrated + clientGstAmt;

  const basicEarned  = calendar_days > 0 ? Math.round(salary / calendar_days * worked_days) : salary;
  const contrGstAmt  = contrGst ? Math.round(basicEarned * 0.18) : 0;
  const tdsAmt       = Math.round(basicEarned * tdsPct / 100);
  const netPay       = basicEarned + contrGstAmt - tdsAmt;
  const profit       = billProrated - netPay - tdsAmt - extraExp;
  const margin       = billProrated > 0 ? +(profit / billProrated * 100).toFixed(1) : 0;

  return {
    po_value: poValue, calendar_days, worked_days,
    per_day: Math.round(perDay),
    bill_prorated: billProrated, client_gst_pct,
    client_gst_amt: clientGstAmt, invoice_total: invoiceTotal,
    monthly_salary: salary, basic_earned: basicEarned,
    contractor_gst: contrGst, contractor_gst_amt: contrGstAmt,
    tds_pct: tdsPct, tds_amt: tdsAmt,
    extra_expense: extraExp,
    gross_pay: basicEarned, net_pay: netPay,
    profit, margin,
    net_pay_ex_gst: netPay - contrGstAmt,
  };
}

// ── GST calculator ─────────────────────────────────────────────────────────
function calculateGST(taxable, rate, supplyType) {
  const gstAmt = Math.round(parseFloat(taxable) * parseFloat(rate) / 100);
  if(supplyType === 'intra') {
    const half = Math.round(gstAmt / 2);
    return { cgst: half, sgst: gstAmt - half, igst: 0, total_gst: gstAmt };
  }
  return { cgst: 0, sgst: 0, igst: gstAmt, total_gst: gstAmt };
}

// ── Amount in words (Indian system) ───────────────────────────────────────
function amountInWords(amount) {
  const n = Math.round(parseFloat(amount) || 0);
  if(n === 0) return 'Zero Rupees Only';

  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function toWords(num) {
    if(num === 0) return '';
    if(num < 20)  return ones[num] + ' ';
    if(num < 100) return tens[Math.floor(num/10)] + ' ' + (num%10 ? ones[num%10]+' ' : '');
    if(num < 1000)    return ones[Math.floor(num/100)] + ' Hundred ' + toWords(num % 100);
    if(num < 100000)  return toWords(Math.floor(num/1000))  + 'Thousand '  + toWords(num % 1000);
    if(num < 10000000)return toWords(Math.floor(num/100000))+ 'Lakh '      + toWords(num % 100000);
    return                     toWords(Math.floor(num/10000000))+'Crore '    + toWords(num % 10000000);
  }

  const str = String(n.toFixed(2));
  const [intPart, decPart] = str.split('.');
  let result = toWords(parseInt(intPart)).trim() + ' Rupees';
  if(decPart && parseInt(decPart) > 0) {
    result += ' And ' + toWords(parseInt(decPart)).trim() + ' Paise';
  }
  return result + ' Only';
}

module.exports = { calculatePayroll, calculateContractorBilling, calculateGST, amountInWords };
