const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Admin = require('../models/admin');
const Lead = require('../models/lead');
const Member = require('../models/member');

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Use multer's req.body which will be populated after the form is parsed
        const email = req.body.email || 'default';
        const userDir = path.join(uploadDir, email.replace('@', '_at_'));
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

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
}).single('file');

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'varunreddy2new@gmail.com',
        pass: 'bmly geoo gwkg jasu',
    }
});

// Helper function to get the appropriate model
const getModel = (role) => {
    switch (role.toLowerCase()) {
        case 'admin':
            return Admin;
        case 'lead':
            return Lead;
        case 'member':
            return Member;
        default:
            throw new Error('Invalid role');
    }
};

// Get profile route
router.get('/', async (req, res) => {
    try {
        const { email, role } = req.query;

        if (!email || !role) {
            console.log('Missing required fields:', { email, role });
            return res.status(400).json({
                success: false,
                message: 'Email and role are required'
            });
        }

        let Model = getModel(role);

        const userData = await Model.findOne(
            { email: email.toLowerCase() },
            { name: 1, email: 1, imageUrl: 1, club: 1, _id: 0 }
        );

        if (!userData) {
            console.log('User not found:', { email, role });
            return res.status(404).json({
                success: false,
                message: `User not found in ${role} database`
            });
        }

        console.log('User found:', userData);
        res.status(200).json({
            success: true,
            data: userData
        });

    } catch (error) {
        console.error('Profile route error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving user profile'
        });
    }
});

// Upload image route
router.post('/upload-image', (req, res) => {
    upload(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: 'File upload error: ' + err.message
            });
        } else if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error uploading file: ' + err.message
            });
        }
        
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const { email, role } = req.body;
            if (!email || !role) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: 'Email and role are required'
                });
            }

            let Model = getModel(role);
            const relativePath = "http://locathost:5000/"+path.relative(path.join(__dirname, '..'), req.file.path)
                .replace(/\\/g, '/');

            // Update user profile with new image path
            const updatedUser = await Model.findOneAndUpdate(
                { email: email.toLowerCase() },
                { $set: { imageUrl: relativePath } },
                { new: true }
            );

            if (!updatedUser) {
                fs.unlinkSync(req.file.path);
                return res.status(404).json({
                    success: false,
                    message: `User not found in ${role} database`
                });
            }

            res.json({
                success: true,
                message: 'File uploaded successfully',
                imagePath: relativePath
            });

        } catch (error) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            console.error('Upload error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error uploading file'
            });
        }
    });
});

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Request delete OTP route
router.post('/request-delete-otp', async (req, res) => {
    try {
        const { email, role } = req.body;

        if (!email || !role) {
            console.log('Missing required fields:', { email, role });
            return res.status(400).json({
                success: false,
                message: 'Email and role are required'
            });
        }

        let Model = getModel(role);

        const user = await Model.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('User not found:', { email, role });
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const otp = generateOTP();
        otpStore.set(email, {
            otp,
            timestamp: Date.now(),
            attempts: 0
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Account Deletion OTP',
            text: `Your OTP for account deletion is: ${otp}\nThis OTP will expire in 5 minutes.\nIf you did not request this, please ignore this email.`
        };

        await transporter.sendMail(mailOptions);
        console.log('OTP sent successfully to:', email);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully'
        });

    } catch (error) {
        console.error('OTP request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending OTP'
        });
    }
});

// Delete account route
router.post('/delete-account', async (req, res) => {
    try {
        const { email, role, otp } = req.body;

        if (!email || !role || !otp) {
            console.log('Missing required fields:', { email, role, otp });
            return res.status(400).json({
                success: false,
                message: 'Email, role, and OTP are required'
            });
        }

        const storedOTPData = otpStore.get(email);
        if (!storedOTPData) {
            console.log('OTP not found or expired:', email);
            return res.status(400).json({
                success: false,
                message: 'OTP expired or not requested'
            });
        }

        if (Date.now() - storedOTPData.timestamp > 5 * 60 * 1000) {
            console.log('OTP expired:', email);
            otpStore.delete(email);
            return res.status(400).json({
                success: false,
                message: 'OTP expired'
            });
        }

        if (storedOTPData.otp !== otp) {
            storedOTPData.attempts += 1;
            console.log('Invalid OTP attempt:', { email, attempts: storedOTPData.attempts });
            
            if (storedOTPData.attempts >= 3) {
                otpStore.delete(email);
                return res.status(400).json({
                    success: false,
                    message: 'Too many failed attempts. Please request a new OTP'
                });
            }
            
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        let Model = getModel(role);

        // Find user to get image path before deletion
        const user = await Model.findOne({ email: email.toLowerCase() });
        if (user && user.imageUrl) {
            const imagePath = path.join(__dirname, '..', user.imageUrl);
            // Delete user's image file if it exists
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            // Remove user's upload directory
            const userDir = path.dirname(imagePath);
            if (fs.existsSync(userDir)) {
                fs.rmdirSync(userDir, { recursive: true });
            }
        }

        const result = await Model.deleteOne({ email: email.toLowerCase() });
        
        if (result.deletedCount === 0) {
            console.log('User not found for deletion:', { email, role });
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        otpStore.delete(email);
        console.log('Account deleted successfully:', { email, role });

        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting account'
        });
    }
});

// Serve uploaded files statically

module.exports = router;