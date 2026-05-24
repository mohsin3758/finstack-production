'use strict';
const multer   = require('multer');
const path     = require('path');
const crypto   = require('crypto');
const { AppError } = require('../middlewares/errorHandler');

const ALLOWED_MIME = [
  'image/jpeg','image/png','image/gif','image/webp',
  'application/pdf',
  'text/csv','application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${name}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
  else cb(new AppError(`File type ${file.mimetype} not allowed`, 400, 'INVALID_FILE_TYPE'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

async function handleUpload(req, res, next) {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE');
    res.json({
      success:  true,
      data: {
        filename:      req.file.filename,
        original_name: req.file.originalname,
        size:          req.file.size,
        mime_type:     req.file.mimetype,
        path:          `/uploads/${req.file.filename}`,
      },
    });
  } catch (e) { next(e); }
}

async function parseTimesheet(req, res, next) {
  try {
    if (!req.file) throw new AppError('No timesheet uploaded', 400, 'NO_FILE');
    const { invoiceQueue } = require('../jobs/queues');
    const job = await invoiceQueue.add('parse_timesheet', {
      filename:    req.file.filename,
      filepath:    req.file.path,
      company_id:  req.company_id,
      uploaded_by: req.user.id,
    }, { priority: 3 });
    res.json({
      success: true,
      message: 'Timesheet queued for processing',
      data:    { filename: req.file.filename, job_id: job.id },
    });
  } catch (e) { next(e); }
}

module.exports = { upload, handleUpload, parseTimesheet };
