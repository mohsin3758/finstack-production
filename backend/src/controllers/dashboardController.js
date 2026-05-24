'use strict';
const { Op, fn, col, literal } = require('sequelize');
const dayjs = require('dayjs');
const { Invoice, Employee, PayrollRecord, Transaction, Client, LeaveRequest } = require('../models');
const { getCache, setCache, cacheKey, TTL } = require('../config/redis');

async function summary(req, res, next) {
  try {
    const cid  = req.company_id;
    const cKey = cacheKey(cid, 'dashboard', 'summary');
    const cached = await getCache(cKey);
    if(cached) return res.json({ success: true, data: cached, from_cache: true });

    const now   = dayjs();
    const mFrom = now.startOf('month').format('YYYY-MM-DD');
    const mTo   = now.endOf('month').format('YYYY-MM-DD');
    const pmFrom= now.subtract(1,'month').startOf('month').format('YYYY-MM-DD');
    const pmTo  = now.subtract(1,'month').endOf('month').format('YYYY-MM-DD');
    const yFrom = now.startOf('year').format('YYYY-MM-DD');

    const [invStats, prevInv, empCount, clientCount, monthExp, recentInvs, overdueInvs, monthlyTrend, pendingLeaves] =
      await Promise.all([
        Invoice.findOne({
          where: { company_id: cid, inv_date:{ [Op.between]:[mFrom,mTo] }, status:{ [Op.not]:'cancelled' } },
          attributes: [
            [fn('COUNT',   col('id')),        'count'],
            [fn('COALESCE',fn('SUM',col('total')),       0), 'total'],
            [fn('COALESCE',fn('SUM',col('received')),    0), 'received'],
            [fn('COALESCE',fn('SUM',col('outstanding')), 0), 'outstanding'],
          ], raw: true
        }),
        Invoice.findOne({
          where: { company_id: cid, inv_date:{ [Op.between]:[pmFrom,pmTo] }, status:{ [Op.not]:'cancelled' } },
          attributes: [[fn('COALESCE',fn('SUM',col('total')),0),'total']], raw: true
        }),
        Employee.count({ where: { company_id: cid, status:'active' } }),
        Client.count({ where: { company_id: cid, active: true } }),
        Transaction.findOne({
          where: { company_id: cid, txn_type:'expense', date:{ [Op.between]:[mFrom,mTo] } },
          attributes: [[fn('COALESCE',fn('SUM',col('amount')),0),'total']], raw: true
        }),
        Invoice.findAll({
          where: { company_id: cid },
          order: [['inv_date','DESC']], limit: 10,
          attributes: ['id','inv_no','client_name','total','status','inv_date','due_date','outstanding'],
        }),
        Invoice.findAll({
          where: { company_id: cid, status:'overdue' },
          order: [['due_date','ASC']], limit: 5,
          attributes: ['id','inv_no','client_name','outstanding','due_date'],
        }),
        Invoice.findAll({
          where: {
            company_id: cid,
            inv_date: { [Op.gte]: now.subtract(5,'month').startOf('month').format('YYYY-MM-DD') },
            status:   { [Op.not]: 'cancelled' },
          },
          attributes: [
            [fn('to_char', col('inv_date'), 'YYYY-MM'), 'month'],
            [fn('COALESCE',fn('SUM',col('total')),    0), 'revenue'],
            [fn('COALESCE',fn('SUM',col('received')), 0), 'collected'],
          ],
          group: [fn('to_char', col('inv_date'), 'YYYY-MM')],
          order: [[fn('to_char', col('inv_date'), 'YYYY-MM'),'ASC']],
          raw: true
        }),
        LeaveRequest.count({ where: { company_id: cid, status:'pending' } }),
      ]);

    const rev   = parseFloat(invStats?.total    || 0);
    const prev  = parseFloat(prevInv?.total     || 0);
    const exp   = parseFloat(monthExp?.total    || 0);
    const growth= prev > 0 ? +((rev-prev)/prev*100).toFixed(1) : 0;

    const data = {
      kpis: {
        revenue:       { value: rev,           prev, growth_pct: growth },
        collected:     { value: parseFloat(invStats?.received    || 0) },
        outstanding:   { value: parseFloat(invStats?.outstanding || 0) },
        invoices_count:{ value: parseInt(invStats?.count         || 0) },
        expenses:      { value: exp },
        profit:        { value: rev - exp },
        employees:     { value: empCount },
        clients:       { value: clientCount },
        pending_leaves:{ value: pendingLeaves },
      },
      charts: { monthly_revenue: monthlyTrend },
      recent_invoices:  recentInvs,
      overdue_invoices: overdueInvs,
      as_of: new Date().toISOString(),
    };

    await setCache(cKey, data, TTL.SHORT);
    res.json({ success: true, data });
  } catch(e) { next(e); }
}

module.exports = { summary };
