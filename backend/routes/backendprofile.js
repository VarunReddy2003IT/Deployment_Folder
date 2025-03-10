const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');

// Store OTPs temporarily (consider using Redis or similar for production)
const otpStore = new Map();

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Use multer's req.body after form parsing
        const email = req.body.email ? req.body.email.replace('@', '_at_') : 'default';
        const userDir = path.join(uploadDir, email);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        
        cb(null, userDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype);

        if (isValid) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
         user: 'gvpclubconnect@gmail.com',
        pass: 'dajl xekp dkda glda', // Ideally store in environment variables
    }
});

// Helper function to get the appropriate model based on role
const getModel = (role) => {
    switch (role.toLowerCase()) {
        case 'admin':
            return Admin;
        case 'lead':
            return Lead;
        case 'member':
            return Member;
        default:
            throw new Error('Invalid role provided');
    }
};

// Get user profile route
router.get('/', async (req, res) => {
    const { email, role } = req.query;

    if (!email || !role) {
        return res.status(400).json({ success: false, message: 'Email and role are required.' });
    }

    try {
        const Model = getModel(role);
        const userData = await Model.findOne({ email: email.toLowerCase() }, { name: 1, email: 1, imageUrl: 1, location: 1 });

        if (!userData) {
            return res.status(404).json({ success: false, message: `User not found in ${role} database.` });
        }

        res.status(200).json({ success: true, data: userData });
    } catch (error) {
        console.error('Profile route error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
    }
});

// Upload image route
router.post('/upload-image', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { email, role } = req.body;

    if (!email || !role) {
        fs.unlinkSync(req.file.path); // Remove uploaded file
        return res.status(400).json({ success: false, message: 'Email and role are required.' });
    }

    try {
        const Model = getModel(role);
        const relativePath = 'http://localhost:5000/uploads/default/'+req.file.filename;

        // Update user profile with new image path
        const updatedUser = await Model.findOneAndUpdate(
            { email: email.toLowerCase() },
            { imageUrl: relativePath },
            { new: true }
        );

        if (!updatedUser) {
            fs.unlinkSync(req.file.path); // Clean up if user is not found
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.json({ success: true, message: 'File uploaded successfully.', imagePath: relativePath });
    } catch (error) {
        if (req.file) {
            fs.unlinkSync(req.file.path); // Clean up if file upload fails
        }
        console.error('File upload error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update profile route
router.post('/update-profile', async (req, res) => {
    const { email, role, imageUrl, name, location } = req.body;
    console.log(location);
    if (!email || !role) {
        return res.status(400).json({ success: false, message: 'Email and role are required.' });
    }

    try {
        const Model = getModel(role);
        const updateFields = {};
        
        if (imageUrl) updateFields.imageUrl = imageUrl;
        if (name) updateFields.name = name;
        if (typeof location !== 'undefined') updateFields.location = location;

        const updatedUser = await Model.findOneAndUpdate(
            { email: email.toLowerCase() },
            { $set: updateFields },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: `User not found in ${role} database.` });
        }
        console.log("updated");
        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Error updating user profile.' });
    }
});

// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Request delete OTP route
router.post('/request-delete-otp', async (req, res) => {
    const { email, role } = req.body;

    if (!email || !role) {
        return res.status(400).json({ success: false, message: 'Email and role are required.' });
    }

    try {
        const Model = getModel(role);
        const user = await Model.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const otp = generateOTP();
        otpStore.set(email, { otp, timestamp: Date.now(), attempts: 0 });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Account Deletion OTP',
            text: `Your OTP for account deletion is: ${otp}\nIt will expire in 5 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'OTP sent successfully.' });
    } catch (error) {
        console.error('OTP request error:', error);
        res.status(500).json({ success: false, message: 'Error sending OTP.' });
    }
});

// Delete account route
router.post('/delete-account', async (req, res) => {
    const { email, role, otp } = req.body;

    if (!email || !role || !otp) {
        return res.status(400).json({ success: false, message: 'Email, role, and OTP are required.' });
    }

    const storedOTPData = otpStore.get(email);
    if (!storedOTPData) {
        return res.status(400).json({ success: false, message: 'OTP expired or not requested.' });
    }

    if (Date.now() - storedOTPData.timestamp > 5 * 60 * 1000) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, message: 'OTP expired.' });
    }

    if (storedOTPData.otp !== otp) {
        storedOTPData.attempts += 1;
        if (storedOTPData.attempts >= 3) {
            otpStore.delete(email);
            return res.status(400).json({ success: false, message: 'Too many failed attempts. Request a new OTP.' });
        }
        return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    try {
        const Model = getModel(role);
        const result = await Model.deleteOne({ email: email.toLowerCase() });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        otpStore.delete(email);
        res.status(200).json({ success: true, message: 'Account deleted successfully.' });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ success: false, message: 'Error deleting account.' });
    }
});

module.exports = router;