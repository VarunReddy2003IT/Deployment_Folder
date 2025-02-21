const express = require('express');
const router = express.Router();
const Event = require('../models/events');
const Member = require('../models/member'); // Add this import
const Lead = require('../models/lead');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      // Create base uploads directory if it doesn't exist
      const baseUploadDir = path.join(__dirname, '..', 'uploads', 'events');
      if (!fs.existsSync(baseUploadDir)) {
          fs.mkdirSync(baseUploadDir, { recursive: true });
      }
      
      // Create subdirectory based on file type (posters or documents)
      const fileType = file.fieldname === 'poster' ? 'posters' : 'documents';
      const uploadDir = path.join(baseUploadDir, fileType);
      if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
      // Create unique filename with timestamp and random number
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure file filters
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'poster') {
      // Allow only images for posters
      const allowedTypes = /jpeg|jpg|png|gif|jfif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (extname && mimetype) {
          cb(null, true);
      } else {
          cb(new Error('Only image files are allowed for posters!'));
      }
  } else if (file.fieldname === 'document') {
      
      const allowedTypes = /pdf|doc|docx|ppt|pptx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      
      if (extname) {
          cb(null, true);
      } else {
          cb(new Error('Only PDF and DOC files are allowed for documents!'));
      }
  } else {
      cb(new Error('Invalid field name'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});
// Fetch all events sorted by date
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create a new event
router.post('/add', upload.single('poster'), async (req, res) => {
  try {
      const { 
          eventname, 
          clubtype, 
          club, 
          date, 
          description,
          paymentRequired,
          paymentLink 
      } = req.body;

      if (!eventname || !clubtype || !club || !date || !description) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: 'Missing required fields' });
      }

      const today = new Date().toISOString().split('T')[0];
      const type = date >= today ? 'upcoming' : 'past';

      // Create image URL
      const posterUrl = req.file ? 
          `http://localhost:5000/${path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/')}` : 
          '';

      const newEvent = new Event({
          eventname,
          clubtype,
          club,
          image: posterUrl,
          date,
          description,
          type,
          paymentRequired: paymentRequired || false,
          paymentLink: paymentRequired ? paymentLink : undefined
      });

      const savedEvent = await newEvent.save();
      res.status(201).json(savedEvent);
  } catch (error) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.error('Error creating event:', error);
      res.status(500).json({ error: 'Failed to create event' });
  }
});

// Delete an event by ID
router.delete('/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const event = await Event.findById(id);

      if (!event) {
          return res.status(404).json({ error: 'Event not found' });
      }

      // Delete poster file if it exists
      if (event.image) {
          const posterPath = path.join(__dirname, '..', event.image.replace('http://localhost:5000/', ''));
          if (fs.existsSync(posterPath)) {
              fs.unlinkSync(posterPath);
          }
      }

      // Delete document file if it exists
      if (event.documentUrl) {
          const documentPath = path.join(__dirname, '..', event.documentUrl.replace('http://localhost:5000/', ''));
          if (fs.existsSync(documentPath)) {
              fs.unlinkSync(documentPath);
          }
      }

      await Event.findByIdAndDelete(id);
      res.json({ message: 'Event and associated files deleted successfully' });
  } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Fetch events for a specific club
router.get('/club/:clubName', async (req, res) => {
  try {
    const { clubName } = req.params;
    const events = await Event.find({ club: clubName }).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching club events:', error);
    res.status(500).json({ error: 'Failed to fetch club events' });
  }
});

// Fetch upcoming events by clubtype
router.get('/upcoming/:clubtype?', async (req, res) => {
  try {
    const { clubtype } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const query = { date: { $gte: today } };

    if (clubtype) {
      query.clubtype = clubtype;
    }
    
    const events = await Event.find(query).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
});

// Fetch past events by clubtype
router.get('/past/:clubtype?', async (req, res) => {
  try {
    const { clubtype } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const query = { date: { $lt: today } };

    if (clubtype) {
      query.clubtype = clubtype;
    }
    
    const events = await Event.find(query).sort({ date: -1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching past events:', error);
    res.status(500).json({ error: 'Failed to fetch past events' });
  }
});

// Fetch all events by clubtype
router.get('/clubtype/:clubtype', async (req, res) => {
  try {
    const { clubtype } = req.params;
    const events = await Event.find({ clubtype }).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events by clubtype:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.post('/register/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userEmail } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if already registered
    if (event.registeredEmails.includes(userEmail)) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Add email to registered list
    event.registeredEmails.push(userEmail);
    await event.save();

    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// Get registered members' profiles
router.get('/registered-profiles/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Fetch profiles from both Member and Lead collections
    const memberProfiles = await Member.find({ 
      email: { $in: event.registeredEmails }
    }).select('name email collegeId mobilenumber imageUrl');

    const leadProfiles = await Lead.find({ 
      email: { $in: event.registeredEmails }
    }).select('name email collegeId mobilenumber imageUrl');

    // Combine and remove duplicates based on email
    const allProfiles = [...memberProfiles, ...leadProfiles];
    const uniqueProfiles = Array.from(
      new Map(allProfiles.map(profile => [profile.email, profile])).values()
    );

    res.json(uniqueProfiles);
  } catch (error) {
    console.error('Error fetching registered profiles:', error);
    res.status(500).json({ error: 'Failed to fetch registered profiles' });
  }
});

router.post('/upload-document/:eventId', upload.single('document'), async (req, res) => {
  try {
      const { eventId } = req.params;
      
      const event = await Event.findById(eventId);
      if (!event) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(404).json({ error: 'Event not found' });
      }

      // Delete old document if it exists
      if (event.documentUrl) {
          const oldPath = path.join(__dirname, '..', event.documentUrl.replace('http://localhost:5000/', ''));
          if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
          }
      }

      // Create document URL
      const documentUrl = `http://localhost:5000/${path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/')}`;
      
      event.documentUrl = documentUrl;
      await event.save();

      res.json({ 
          message: 'Document uploaded successfully',
          documentUrl: documentUrl
      });
  } catch (error) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
  }
});

module.exports = router;