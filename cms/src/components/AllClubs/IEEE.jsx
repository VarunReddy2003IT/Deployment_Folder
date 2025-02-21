import React, { useState, useEffect } from "react";
import Footerbar from '../TechnicalFootBar';
import axios from "axios";
import { Link } from "react-router-dom";

function IEEE() {
  // State variables
  const [isLeadForIEEE, setIsLeadForIEEE] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);

  // Get user info from localStorage
  const userEmail = localStorage.getItem("userEmail");
  const userRole = localStorage.getItem("userRole");
  const userClub = localStorage.getItem("userClub");

  useEffect(() => {
    if ((userRole === 'lead' && userClub === 'IEEE') || userRole === 'admin') {
      setIsLeadForIEEE(true);
    }
    fetchEvents();
  }, [userRole, userClub]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/events");
      const IEEEEvents = response.data.filter(event => event.club === 'IEEE');
      const today = new Date().toISOString().split("T")[0];
      const upcomingEvents = IEEEEvents.filter(event => event.date >= today);
      const pastEvents = IEEEEvents.filter(event => event.date < today);
      setEvents({ upcoming: upcomingEvents, past: pastEvents });
    } catch (error) {
      setError("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('poster', file);

    try {
      // Note: We're not making a complete event submission here
      // Instead, we'll just preview the image locally
      const imageUrl = URL.createObjectURL(file);
      setImageUrl(imageUrl);
    } catch (err) {
      setError('Error handling image: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleQRUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // Similarly, just preview the QR code locally
      const qrUrl = URL.createObjectURL(file);
      setQrImageUrl(qrUrl);
    } catch (err) {
      setError('Error handling QR code: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentUpload = async (event, eventId) => {
    const file = event.target.files[0];
    if (!file) return;

    setDocumentUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await axios.post(`http://localhost:5000/api/events/upload-document/${eventId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert("Document uploaded successfully!");
      fetchEvents();
    } catch (err) {
      setError('Error uploading document: ' + err.message);
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!eventName || !eventDate || !eventDescription) {
      setError("Please fill in all fields.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const isUpcoming = eventDate >= today;

    if (isUpcoming && paymentRequired && !qrImageUrl) {
      setError("Payment QR code is required when payment is enabled.");
      return;
    }

    const formData = new FormData();
    formData.append('eventname', eventName);
    formData.append('clubtype', "Technical");
    formData.append('club', "IEEE");
    formData.append('date', eventDate);
    formData.append('description', eventDescription);
    formData.append('paymentRequired', paymentRequired);
    
    // Get the files from the preview URLs
    if (imageUrl) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      formData.append('poster', blob, 'event-poster.jpg');
    }
    
    if (paymentRequired && qrImageUrl) {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      formData.append('paymentQR', blob, 'payment-qr.jpg');
    }

    try {
      const response = await axios.post("http://localhost:5000/api/events/add", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data) {
        alert("Event added successfully!");
        setEventName('');
        setEventDate('');
        setEventDescription('');
        setPaymentRequired(false);
        setQrImageUrl('');
        setImageUrl('');
        setShowAddEventForm(false);
        setError('');
        fetchEvents();
      }
    } catch (error) {
      setError(error.response?.data?.error || "Failed to add event. Please try again.");
    }
  };

  const handleRegistration = async (eventId) => {
    try {
      await axios.post(`http://localhost:5000/api/events/register/${eventId}`, {
        userEmail
      });
      alert("Registration successful!");
      fetchEvents();
    } catch (error) {
      setError(error.response?.data?.error || "Failed to register for event");
    }
  };

  const renderEventCard = (event) => {
    const isExpanded = expandedEventId === event._id;
    const canViewProfiles = userRole === 'admin' || (userRole === 'lead' && userClub === event.club);
    const isUpcoming = new Date(event.date) >= new Date();
    const canUploadDocument = !isUpcoming && (userRole === 'admin' || (userRole === 'lead' && userClub === event.club));
    
    return (
      <div key={event._id} className={`event-card ${isExpanded ? 'expanded' : ''}`}>
        <div className="event-card-preview" onClick={() => setExpandedEventId(isExpanded ? null : event._id)}>
          <div className="event-image-container">
            <img src={event.image || '/placeholder-event.jpg'} alt={event.eventname} className="event-image" />
          </div>
          <div className="event-preview-details">
            <h3>{event.eventname}</h3>
            <p className="event-date">{new Date(event.date).toLocaleDateString()}</p>
          </div>
        </div>
        
        {isExpanded && (
          <div className="event-expanded-details">
            <p><strong>Description:</strong> {event.description}</p>
            {isUpcoming ? (
              <div className="event-actions">
                {event.paymentRequired && (
                  <div className="qr-code-container">
                    <img src={event.paymentQR} alt="Payment QR Code" className="qr-code" />
                  </div>
                )}
                <button
                  onClick={() => handleRegistration(event._id)}
                  className="register-button"
                  disabled={event.registeredEmails?.includes(userEmail)}
                >
                  {event.registeredEmails?.includes(userEmail) ? 'Registered' : 'Register'}
                </button>
                {canViewProfiles && (
                  <Link
                    to={`/registers/${event._id}`}
                    className="view-profiles-link"
                  >
                    View All Profiles
                  </Link>
                )}
              </div>
            ) : (
              <div className="event-actions">
                {canUploadDocument && !event.documentUrl && (
                  <div className="upload-document">
                    <label className="upload-document-label">
                      Upload Document
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleDocumentUpload(e, event._id)}
                        disabled={documentUploading}
                        className="upload-document-input"
                      />
                    </label>
                    {documentUploading && <p className="upload-status">Uploading document...</p>}
                  </div>
                )}
                
                {event.documentUrl && (
                  <a
                    href={event.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-document-button"
                  >
                    View Document
                  </a>
                )}
                
                {canViewProfiles && (
                  <Link
                    to={`/registers/${event._id}`}
                    className="view-profiles-link"
                  >
                    View All Profiles
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="footer">
        <Footerbar />
      </div>
      <div className="content">
        <div className="page-content">
          <h1 className="page-title">IEEE Club</h1>

          <div className="events-container">
            <div className="event-section">
              <h2>Upcoming Events</h2>
              {loading ? (
                <div className="loading-section">Loading events...</div>
              ) : error ? (
                <div className="error-section">{error}</div>
              ) : events.upcoming.length > 0 ? (
                <div className="events-grid">
                  {events.upcoming.map(renderEventCard)}
                </div>
              ) : (
                <p>No upcoming events</p>
              )}
            </div>

            <div className="event-section">
              <h2>Past Events</h2>
              {loading ? (
                <div className="loading-section">Loading events...</div>
              ) : error ? (
                <div className="error-section">{error}</div>
              ) : events.past.length > 0 ? (
                <div className="events-grid">
                  {events.past.map(renderEventCard)}
                </div>
              ) : (
                <p>No past events</p>
              )}
            </div>
          </div>

          {isLeadForIEEE && (
            <div className="form-container">
              <button 
                onClick={() => setShowAddEventForm(!showAddEventForm)}
                className="toggle-button"
              >
                {showAddEventForm ? "Cancel" : "Add Event"}
              </button>
              
              {showAddEventForm && (
                <div className="event-form">
                  <div className="form-content">
                    <h3 className="form-title">Add New Event</h3>
                    
                    <div className="form-fields">
                      <div className="form-group">
                        <label>Event Name</label>
                        <input
                          type="text"
                          placeholder="Enter event name"
                          value={eventName}
                          onChange={(e) => setEventName(e.target.value)}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Event Date</label>
                        <input
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Event Description</label>
                        <textarea
                          placeholder="Enter event description"
                          value={eventDescription}
                          onChange={(e) => setEventDescription(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Event Poster</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                        {uploading && <p className="upload-status">Uploading...</p>}
                        {imageUrl && (
                          <div className="image-preview">
                            <img src={imageUrl} alt="Event poster preview" />
                          </div>
                        )}
                      </div>

                      {eventDate && new Date(eventDate) >= new Date() && (
                        <>
                          <div className="form-group">
                            <label>Payment Required</label>
                            <select
                              value={paymentRequired}
                              onChange={(e) => setPaymentRequired(e.target.value === 'true')}
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>

                          {paymentRequired && (
                            <div className="form-group">
                              <label>Payment QR Code</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleQRUpload}
                                disabled={uploading}
                              />
                              {uploading && <p className="upload-status">Uploading QR code...</p>}
                              {qrImageUrl && (
                                <div className="qr-preview">
                                  <img src={qrImageUrl} alt="Payment QR code preview" />
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {error && (
                        <div className="error-message">
                          {error}
                        </div>
                      )}
                      <button 
                        onClick={handleAddEvent}
                        className="submit-button"
                      >
                        Submit Event
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IEEE;