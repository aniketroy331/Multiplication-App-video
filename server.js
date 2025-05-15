require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect('mongodb+srv://aniketroy:multiplication_server@cluster0.wd5jkso.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/videos', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));
// model creation for video 
const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  videoUrl: { type: String },
  filename: { type: String },
  createdAt: { type: Date, default: Date.now }
});
// collection for video 
const Video = mongoose.model('Video', VideoSchema);
// storage configuration 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
// file type selection 
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, WebM, Ogg, and QuickTime videos are allowed.'), false);
  }
};
// upload by multer max 500mb 
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }
});
// API for videos 
app.post('/api/videos', upload.single('video'), async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required' });
    }

    const videoData = {
      title,
      description,
      filename: req.file.filename,
      videoUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    };

    const newVideo = await Video.create(videoData);
    res.status(201).json(newVideo);

  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, err => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    console.error('Upload error:', error);
    const message = error.code === 'LIMIT_FILE_SIZE' 
      ? 'File size exceeds 500MB limit' 
      : error.message || 'Server error during upload';
    res.status(500).json({ message });
  }
});

app.get('/api/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching videos' });
  }
});
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      message: err.code === 'LIMIT_FILE_SIZE' 
        ? 'File too large' 
        : 'File upload error' 
    });
  }
  res.status(500).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
