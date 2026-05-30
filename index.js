const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dwyfepshm',
  api_key: '923485741639146',
  api_secret: 'qhyeIsCYlVZnu_08ZnVgxLJXfak',
});

const app = express();
app.use(express.json());

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const rawTitle = (req.body && req.body.title) ? String(req.body.title) : file.originalname;
    const safeTitle = String(rawTitle)
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .slice(0, 180);

    return {
      folder: 'photovault_uploads',
      public_id: `${safeTitle}-${Date.now()}`,
      resource_type: 'auto',
    };
  },
});

const upload = multer({ storage });

app.get('/api/get_photos_api', async (req, res) => {
  try {
    const response = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'photovault_uploads/',
      resource_type: 'auto',
      max_results: 500,
    });

    const items = (response.resources || []).map((resource) => ({
      title: resource.public_id.replace(/^photovault_uploads\//, ''),
      image_url: resource.secure_url,
      resource_type: resource.resource_type,
      format: resource.format,
      bytes: resource.bytes,
    }));

    return res.json({ success: true, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Lỗi khi lấy danh sách file' });
  }
});

app.post('/api/upload_api', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy file để tải lên' });
    }

    const title = (req.body && req.body.title) ? String(req.body.title) : req.file.originalname;
    return res.json({
      success: true,
      data: {
        title,
        image_url: req.file.path,
        public_id: req.file.filename || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Upload thất bại' });
  }
});

app.post('/api/delete_api', async (req, res) => {
  try {
    const imageUrl = req.body?.image_url;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'image_url không hợp lệ' });
    }

    const publicId = cloudinary.utils.public_id(imageUrl);
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'Không thể trích xuất public_id từ URL' });
    }

    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
    return res.json({ success: true, message: 'Xóa thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Xóa file thất bại' });
  }
});

module.exports = app;
