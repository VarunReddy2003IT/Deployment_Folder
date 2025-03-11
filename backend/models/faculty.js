const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: { type: String, required: true },
  collegeId: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String, default: null }, // Use camelCase for consistency
  password: { type: String, required: true },
  SelectedClubs: { 
    type: [String], 
    required: true
  },
  createdAt: { type: Date, default: Date.now }, // Timestamp for account creation
  imageUrl: { type: String, default: null }, // URL for profile picture
  location: { type: String, default: null } // Optional location field
});

module.exports = mongoose.model('Faculty', facultySchema, 'Faculty');