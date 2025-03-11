const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Event = require('../models/events');
const Member = require('../models/member');
const Lead = require('../models/lead');
const Faculty = require('../models/faculty'); // Add faculty model import
const nodemailer = require('nodemailer'); // Add nodemailer for email functionality

// Configure nodemailer with your email service credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // or any other email service
  auth: {
    user: 'gvpclubconnect@gmail.com',
    pass: 'dajl xekp dkda glda',
  }
});

// Function to send email notification to faculty members
async function notifyFacultyMembers(clubName, eventDetails) {
  try {
    // Find all faculty members who have selected this club
    const facultyMembers = await Faculty.find({ SelectedClubs: clubName });
    
    if (facultyMembers.length === 0) {
      console.log(`No faculty members found for club: ${clubName}`);
      return;
    }
    
    console.log(`Sending notifications to ${facultyMembers.length} faculty members`);
    
    // Format the date for better readability
    const formattedDate = new Date(eventDetails.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Create email content
    const emailSubject = `New Event: ${eventDetails.eventname} by ${clubName}`;
    
    // Send email to each faculty member
    const emailPromises = facultyMembers.map(faculty => {
      const emailBody = `
        <h2>New Event Notification</h2>
        <p>Dear ${faculty.name || 'Faculty Member'},</p>
        <p>A new event has been added to the ${clubName} club that you're following:</p>
        <div style="border-left: 4px solid #0078d4; padding-left: 15px; margin: 20px 0;">
          <h3>${eventDetails.eventname}</h3>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Description:</strong> ${eventDetails.description}</p>
        </div>
        <p>You can log in to the platform to view more details and track registrations.</p>
        <p>Regards,<br>Clubs Management System</p>
      `;
      
      return transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: faculty.email,
        subject: emailSubject,
        html: emailBody
      });
    });
    
    await Promise.all(emailPromises);
    console.log(`Successfully sent notifications to faculty members for ${clubName}`);
    
  } catch (error) {
    console.error('Error sending faculty notifications:', error);
    // Don't throw the error - we don't want event creation to fail if notifications fail
  }
}

// Set up storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // folder to store uploaded images
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // e.g., 1617404742289-504525434.png
  }
});

// Create upload instance
const upload = multer({ storage: storage }).single('image'); // Only allows single file uploads for image

router.patch('/update/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { date } = req.body; // Destructuring date from request body

    // Validate input
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update the event's date
    event.date = date;

    // Determine the event type based on the updated date
    const today = new Date().toISOString().split('T')[0];
    event.type = date >= today ? 'upcoming' : 'past';

    // Save the updated event
    await event.save();

    res.json({ message: 'Event date updated successfully', event });
  } catch (error) {
    console.error('Error updating event date:', error);
    res.status(500).json({ error: 'Failed to update event date' });
  }
});
router.post('/upload-image', upload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get the file path
    const filePath = `http://localhost:5000/${req.file.path}`.replace(/\\/g, '/');

    // You can associate the image with a user if email is provided
    const { email } = req.body;
    if (email) {
      console.log(`Image uploaded by user: ${email}`);
      // Optionally store this information or associate with user
    }

    // Return the file path for client-side use
    res.json({ 
      message: 'Image uploaded successfully',
      filePath: filePath 
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // If there was an error, attempt to remove the uploaded file
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (unlinkError) => {
        if (unlinkError) console.error('Error removing failed upload:', unlinkError);
      });
    }
    
    res.status(500).json({ error: 'Failed to upload image' });
  }
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
router.post('/add', upload, async (req, res) => {
  try {
    const { 
      eventname, 
      clubtype, 
      club, 
      date,
      image, 
      description
    } = req.body;

    console.log('Received event data:', {
      eventname, 
      clubtype, 
      club,
      image, 
      date
    });

    if (!eventname || !clubtype || !club || !date || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['Technical', 'Social', 'Cultural'].includes(clubtype)) {
      return res.status(400).json({ 
        error: 'Invalid clubtype. Must be either Technical, Social, or Cultural' 
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const type = date >= today ? 'upcoming' : 'past';

    const newEvent = new Event({
      eventname,
      clubtype,
      club,
      image,
      date,
      description,
      type,
      registeredEmails: [],
      participatedEmails: []
    });

    const savedEvent = await newEvent.save();
    
    // After successfully saving the event, notify relevant faculty members
    await notifyFacultyMembers(club, {
      eventname,
      date,
      description,
      id: savedEvent._id
    });
    
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Delete an event by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await Event.findByIdAndDelete(id);

    if (!deletedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
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

router.post('/upload-document/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { documentUrl } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.documentUrl = documentUrl;
    await event.save();

    res.json({ message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

router.post('/mark-participation/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userEmail, participated, eventDetails } = req.body;
    console.log('Processing participation request for:', userEmail, 'Participated:', participated);
    
    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if the user is registered
    if (!event.registeredEmails.includes(userEmail)) {
      return res.status(400).json({ error: 'User not registered for this event' });
    }

    let memberUpdated = false;
    let leadUpdated = false;
    let updateResult;

    if (participated && eventDetails) {
      // Update the Event's participatedEmails array if it exists
      if (event.participatedEmails) {
        if (!event.participatedEmails.includes(userEmail)) {
          event.participatedEmails.push(userEmail);
          await event.save();
        }
      }

      // Update Member collection
      updateResult = await Member.findOneAndUpdate(
        { email: userEmail },
        { $addToSet: { participatedevents: eventDetails } },
        { new: true }
      );
      memberUpdated = !!updateResult;
      console.log('Member update result:', memberUpdated ? 'Found and updated' : 'Not found');

      // Update Lead collection if the member was not found
      if (!memberUpdated) {
        updateResult = await Lead.findOneAndUpdate(
          { email: userEmail },
          { $addToSet: { participatedevents: eventDetails } },
          { new: true }
        );
        leadUpdated = !!updateResult;
        console.log('Lead update result:', leadUpdated ? 'Found and updated' : 'Not found');
      }
    } else if (!participated && eventDetails) {
      // Remove from Event's participatedEmails array if it exists
      if (event.participatedEmails) {
        event.participatedEmails = event.participatedEmails.filter(email => email !== userEmail);
        await event.save();
      }

      // Remove from Member's participatedevents
      updateResult = await Member.findOneAndUpdate(
        { email: userEmail },
        { $pull: { participatedevents: eventDetails } },
        { new: true }
      );
      memberUpdated = !!updateResult;
      console.log('Member remove result:', memberUpdated ? 'Found and updated' : 'Not found');

      // Remove from Lead's participatedevents if member was not found
      if (!memberUpdated) {
        updateResult = await Lead.findOneAndUpdate(
          { email: userEmail },
          { $pull: { participatedevents: eventDetails } },
          { new: true }
        );
        leadUpdated = !!updateResult;
        console.log('Lead remove result:', leadUpdated ? 'Found and updated' : 'Not found');
      }
    }

    // Check if any document was updated
    if ((participated && !(memberUpdated || leadUpdated))) {
      console.warn('No user document was updated. User may not exist in either collection.');
    }

    res.json({ 
      message: participated ? 
        'User marked as participated' : 
        'User marked as not participated',
      success: memberUpdated || leadUpdated,
      userFound: memberUpdated ? 'member' : (leadUpdated ? 'lead' : 'none')
    });
  } catch (error) {
    console.error('Error marking participation:', error);
    res.status(500).json({ error: 'Failed to mark participation status' });
  }
});

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
    }).select('name email collegeId mobilenumber imageUrl participatedevents');

    const leadProfiles = await Lead.find({ 
      email: { $in: event.registeredEmails }
    }).select('name email collegeId mobilenumber imageUrl participatedevents');

    // Combine and remove duplicates based on email
    const allProfiles = [...memberProfiles, ...leadProfiles];
    const uniqueProfiles = Array.from(
      new Map(allProfiles.map(profile => [profile.email, profile])).values()
    );

    // Add participation status based on participatedevents array
    const eventIdentifier = `${event.eventname}-${event.club}`;
    const profilesWithStatus = uniqueProfiles.map(profile => {
      const hasParticipated = profile.participatedevents && 
                             profile.participatedevents.includes(eventIdentifier);
      
      // Also check if in event's participatedEmails array as a fallback
      const inParticipatedList = event.participatedEmails && 
                               event.participatedEmails.includes(profile.email);
                               
      return {
        ...profile.toObject(),
        participationStatus: (hasParticipated || inParticipatedList) ? 'participated' : undefined
      };
    });

    res.json(profilesWithStatus);
  } catch (error) {
    console.error('Error fetching registered profiles:', error);
    res.status(500).json({ error: 'Failed to fetch registered profiles' });
  }
});

// New route to remove user registration
router.post('/remove-registration/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userEmail } = req.body;

    // Find and update the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Remove email from registeredEmails array
    event.registeredEmails = event.registeredEmails.filter(email => email !== userEmail);
    
    // Also remove from participatedEmails if present
    if (event.participatedEmails) {
      event.participatedEmails = event.participatedEmails.filter(email => email !== userEmail);
    }
    
    await event.save();

    res.json({ message: 'Registration removed successfully' });
  } catch (error) {
    console.error('Error removing registration:', error);
    res.status(500).json({ error: 'Failed to remove registration' });
  }
});

// Serve static files for uploaded images

module.exports = router;