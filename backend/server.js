const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/dbconnection');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();

// Enhanced CORS configuration
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Allow credentials if necessary
}));

app.use(express.json());

// ✅ Serve static files from 'uploads' directory
const uploadsPath = path.join(__dirname, 'uploads'); // Ensure correct path
app.use('/uploads', express.static(uploadsPath));

// Database connection
connectDB();

// Error handling for database connection
app.use((err, req, res, next) => {
    console.error('Database connection error:', err);
    res.status(500).json({
        success: false,
        message: 'Database connection error'
    });
});

// ✅ Log requests to help debug file access issues
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/events', require('./routes/backendevents'));
app.use('/api/login', require('./routes/backendlogin'));
app.use('/api/signup', require('./routes/backendsignup'));
app.use('/api/profile', require('./routes/backendprofile'));
app.use('/api/clubs', require('./routes/clubroute'));
app.use('/api', require('./routes/backendadminprofiles'));
app.use('/api/club-selection', require('./routes/clubSelectionRoutes'));

const forgotPasswordRouter = require('./routes/forgotpassword');
app.use('/api', forgotPasswordRouter);

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📂 Serving static files from: http://localhost:${PORT}/uploads/`);
});
