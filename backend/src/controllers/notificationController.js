'use strict';
const { Notification } = require('../models');

async function list(req, res, next) {
  try {
    const where = { company_id: req.company_id };
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      where.user_id = req.user.id;
    }
    const rows = await Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    const unread = rows.filter(n => !n.read).length;
    res.json({ success: true, data: rows, unread });
  } catch (e) { next(e); }
}

async function markRead(req, res, next) {
  try {
    await Notification.update(
      { read: true, read_at: new Date() },
      { where: { id: req.params.id, company_id: req.company_id } }
    );
    res.json({ success: true });
  } catch (e) { next(e); }
}

async function markAllRead(req, res, next) {
  try {
    await Notification.update(
      { read: true, read_at: new Date() },
      { where: { company_id: req.company_id, user_id: req.user.id, read: false } }
    );
    res.json({ success: true });
  } catch (e) { next(e); }
}

module.exports = { list, markRead, markAllRead };
