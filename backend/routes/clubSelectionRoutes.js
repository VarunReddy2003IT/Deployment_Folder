const express = require('express');
const router = express.Router();
const Member = require('../models/member');
const Lead = require('../models/lead');
const Faculty = require('../models/faculty');
const Admin = require('../models/admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'gvpclubconnect@gmail.com',
    pass: 'dajl xekp dkda glda' // Consider using environment variables for sensitive information
  }
});

// Store pending approvals in memory (consider using Redis in production)
const pendingApprovals = new Map();

// Generate secure token for approval links
const generateApprovalToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Cleanup old pending approvals (run periodically)
const cleanupPendingApprovals = () => {
  const EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();

  for (const [token, data] of pendingApprovals.entries()) {
    if (now - data.timestamp > EXPIRY_TIME) {
      pendingApprovals.delete(token);
    }
  }
};

// Run cleanup every 24 hours
setInterval(cleanupPendingApprovals, 24 * 60 * 60 * 1000);

// Route to handle club selection requests
router.post('/select-clubs', async (req, res) => {
  try {
    const { email, role, selectedClub } = req.body;

    // Input validation
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    if (!role || !['member', 'lead', 'faculty'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role (member, lead, or faculty) is required'
      });
    }

    if (!selectedClub || typeof selectedClub !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid club selection is required'
      });
    }

    // Find user based on role
    let user;
    try {
      if (role === 'faculty') {
        user = await Faculty.findOne({ email }).exec();
      } else {
        return res.status(400).json({
          success: false,
          message: 'Only faculty can request to join a club'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `Faculty not found with email ${email}`
        });
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Error finding user in database'
      });
    }

    // Check for existing memberships
    if (user.selectedClubs && user.selectedClubs.includes(selectedClub)) {
      return res.status(400).json({
        success: false,
        message: 'Already a member of this club'
      });
    }

    // Generate approval token and save request
    const approvalToken = generateApprovalToken();
    pendingApprovals.set(approvalToken, {
      email,
      role,
      club: selectedClub,
      timestamp: Date.now()
    });

    // Find admins
    let adminEmails;
    try {
      adminEmails = await Admin.find({}).select('email').exec();
    } catch (adminError) {
      console.error('Error finding admin emails:', adminError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching admin information'
      });
    }

    const emailList = adminEmails.map(admin => admin.email);
    
    // Send email to admins if any exist
    if (emailList.length > 0) {
      try {
        await transporter.sendMail({
          from: 'gvpclubconnect@gmail.com',
          to: emailList,
          subject: `New Faculty Request for ${selectedClub}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
              <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                New Faculty Request
              </h2>
              
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="color: #34495e; margin-bottom: 15px;">User Details:</h3>
                <p style="margin: 5px 0;"><strong>Name:</strong> ${user.name}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #666; margin-bottom: 20px;">
                  This faculty member has requested to join <strong>${selectedClub}</strong>.
                </p>
                
                <div style="margin: 20px 0;">
                  <a href="http://localhost:5000/api/club-selection/approve/${approvalToken}/true" 
                    style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block;">
                    Approve
                  </a>
                  
                  <a href="http://localhost:5000/api/club-selection/approve/${approvalToken}/false" 
                    style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 0 10px; display: inline-block;">
                    Reject
                  </a>
                </div>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the request, but log the error
      }
    }

    return res.status(200).json({
      success: true,
      message: emailList.length > 0 
        ? 'Club request submitted successfully and admins have been notified'
        : 'Club request submitted successfully, but no admins are currently available'
    });
    
  } catch (error) {
    console.error('Club selection error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while processing your request'
    });
  }
});

// Route to handle approval/rejection
router.get('/approve/:token/:approved', async (req, res) => {
  try {
    const { token, approved } = req.params;
    const isApproved = approved === 'true';

    // Check if token exists
    if (!pendingApprovals.has(token)) {
      return res.status(404).send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
          <h1 style="color: #dc3545">Invalid or Expired Link</h1>
          <p>This approval link is no longer valid. The request may have been already processed or expired.</p>
        </div>
      `);
    }

    const { email, role, club } = pendingApprovals.get(token);
    pendingApprovals.delete(token); // Remove from pending approvals

    // Find user
    let user;
    try {
      if (role === 'faculty') {
        user = await Faculty.findOne({ email }).exec();
      }

      if (!user) {
        throw new Error('User not found');
      }
    } catch (error) {
      return res.status(404).send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
          <h1 style="color: #dc3545">User Not Found</h1>
          <p>The user associated with this request could not be found.</p>
        </div>
      `);
    }

    // Process approval
    if (isApproved) {
      // Check if club already exists in selectedClubs
      if (!user.SelectedClubs) {
        user.SelectedClubs = [];
      }

      if (!user.SelectedClubs.includes(club)) {
        user.SelectedClubs.push(club);
      }

      // Send approval email
      try {
        await transporter.sendMail({
          from: 'gvpclubconnect@gmail.com',
          to: email,
          subject: `${club} Club Request Approved!`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
              <h2 style="color: #2c3e50; text-align: center;">Congratulations!</h2>
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p>Your request to join <strong>${club}</strong> has been approved.</p>
                <p>You can now participate in club activities and access club resources.</p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Approval email error:', emailError);
      }
    } else {
      // Send rejection email
      try {
        await transporter.sendMail({
          from: 'gvpclubconnect@gmail.com',
          to: email,
          subject: `Update on ${club} Club Request`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
              <h2 style="color: #2c3e50; text-align: center;">Club Request Update</h2>
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p>We regret to inform you that your request to join <strong>${club}</strong> was not approved at this time.</p>
                <p>You may apply again in the future or consider joining other clubs.</p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Rejection email error:', emailError);
      }
    }

    // Save user changes
    try {
      await user.save();
    } catch (saveError) {
      console.error('Error saving user changes:', saveError);
      return res.status(500).send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
          <h1 style="color: #dc3545">Error</h1>
          <p>An error occurred while processing the request. Please try again.</p>
        </div>
      `);
    }

    // Send success response
    res.send(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
        <h1 style="color: ${isApproved ? '#28a745' : '#dc3545'}">
          Request ${isApproved ? 'Approved' : 'Rejected'}
        </h1>
        <p>The user has been notified via email.</p>
        <p style="margin-top: 20px;">You can close this window now.</p>
      </div>
    `);

  } catch (error) {
    console.error('Approval handling error:', error);
    res.status(500).send(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; text-align: center; padding: 20px;">
        <h1 style="color: #dc3545">Error</h1>
        <p>An unexpected error occurred while processing the request.</p>
      </div>
    `);
  }
});

// Route to get user's clubs
router.get('/selected-clubs/:email/:role', async (req, res) => {
  try {
    const { email, role } = req.params;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    // Find user based on role
    let user;
    try {
      if (role === 'member') {
        user = await Member.findOne({ email }).exec();
      } else if (role === 'lead') {
        user = await Lead.findOne({ email }).exec();
      } else if (role === 'faculty') {
        user = await Faculty.findOne({ email }).exec();
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Error querying database'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      selectedClubs: user.selectedClubs || [],
      // Since we now save directly to selectedClubs, we no longer track pending clubs.
      pendingClubs: [] 
    });

  } catch (error) {
    console.error('Error fetching clubs:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while fetching clubs information'
    });
  }
});

module.exports = router;