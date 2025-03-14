const express = require('express');
const multer = require('multer');
const path = require('path');
const Club = require('../models/club'); // Assuming Club is your Mongoose model
const router = express.Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/clublogo/'); // Specify the folder to save uploaded logos
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Save with a unique filename
  }
});

const upload = multer({ storage: storage });

// Create initial club data
router.post('/init', async (req, res) => {
  try {
    const { name, type, description } = req.body;

    // Check if the club already exists
    const existingClub = await Club.findOne({ name });
    if (existingClub) {
      return res.status(400).json({ message: 'Club already exists' });
    }

    // Create new club
    const newClub = new Club({
      name,
      type,
      description: description || '',
      labels: [],
      logo: '' // Initialize logo as empty
    });

    await newClub.save();

    res.status(201).json({
      message: 'Club initialized successfully',
      club: newClub
    });
  } catch (err) {
    console.error('Error initializing club:', err);
    res.status(500).json({ message: 'Error initializing club', error: err });
  }
});

// Get club by name
router.get('/:clubName', async (req, res) => {
  try {
    const clubName = req.params.clubName;
    const club = await Club.findOne({ name: clubName });

    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    res.status(200).json(club);
  } catch (err) {
    console.error('Error fetching club:', err);
    res.status(500).json({ message: 'Error fetching club', error: err });
  }
});

// Update club information
router.post('/update', async (req, res) => {
  try {
    const { clubName, logo, labels, description } = req.body;

    // Find the club
    let club = await Club.findOne({ name: clubName });

    if (!club) {
      // If club doesn't exist, create it (assuming it's a valid club like GCCC)
      club = new Club({
        name: clubName,
        type: 'Cultural', // Default type, can be changed as needed
        logo: logo || '',
        description: description || '',
        labels: labels || []
      });
    } else {
      // Update existing club
      if (logo !== undefined) {
        club.logo = logo;
      }

      if (description !== undefined) {
        club.description = description;
      }

      if (labels !== undefined) {
        club.labels = labels;
      }
    }

    // Save the changes
    await club.save();

    res.status(200).json({
      message: 'Club updated successfully',
      club
    });
  } catch (err) {
    console.error('Error updating club:', err);
    res.status(500).json({ message: 'Error updating club', error: err });
  }
});

// Logo upload endpoint
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get the club name from the request body
    const { clubName } = req.body;
    const logoPath = 'http://localhost:5000'+`/uploads/clublogo/${req.file.filename}`; // Store the path of the logo

    const club = await Club.findOne({ name: clubName });
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Save the logo path in the club document
    club.logo = logoPath;
    await club.save();

    res.status(200).json({ message: 'Logo uploaded successfully', filePath: club.logo });
  } catch (err) {
    console.error('Error uploading logo:', err);
    res.status(500).json({ message: 'Error uploading logo', error: err });
  }
});

// Get all clubs
router.get('/', async (req, res) => {
  try {
    const clubs = await Club.find();
    res.status(200).json(clubs);
  } catch (err) {
    console.error('Error fetching clubs:', err);
    res.status(500).json({ message: 'Error fetching clubs', error: err });
  }
});

module.exports = router;