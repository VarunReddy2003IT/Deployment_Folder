import React, { useState, useEffect } from "react";
import Footerbar from '../TechnicalFootBar';
import axios from "axios";
import { Link } from "react-router-dom";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa"; // Import icons

function SEEE() {
  // State variables
  const [isLeadForSEEE, setIsLeadForSEEE] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [error, setError] = useState('');
  const [image, setimage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [documentUploading, setDocumentUploading] = useState(false);
  
  // Club data state variables
  const [clubLogo, setClubLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [labels, setLabels] = useState([{ name: '', value: '' }]);
  const [clubData, setClubData] = useState(null);
  const [clubDescription, setClubDescription] = useState('');
  
  // Edit mode state variables
  const [editingLogo, setEditingLogo] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingLabels, setEditingLabels] = useState(false);

  // Get user info from localStorage
  const userEmail = localStorage.getItem("userEmail");
  const userRole = localStorage.getItem("userRole");
  const userClub = localStorage.getItem("userClub");

  // New state for faculty selected clubs
  const [facultySelectedClubs, setFacultySelectedClubs] = useState([]);

useEffect(() => {
  // Fetch faculty clubs if the user is a faculty member
  const fetchClubDataAndEvents = async () => {
    if (userRole === "faculty") {
      const selectedClubs = await fetchFacultyClubs(userEmail); // Now returns the list
      console.log("Selected Clubs:", selectedClubs); // Debugging log

      if (selectedClubs.includes("SEEE")) {
        setIsLeadForSEEE(true);
      }
    } else if (
      (userRole === "lead" && userClub === "SEEE") ||
      userRole === "admin"
    ) {
      setIsLeadForSEEE(true);
    }

    // Fetch events and club data
    await fetchEvents();
    await fetchClubData();
  };

  // Invoke the function
  fetchClubDataAndEvents();
}, [userRole, userClub, userEmail]);

const fetchFacultyClubs = async (email) => {
  try {
    const response = await axios.post(
      "http://localhost:5000/api/fetching/faculty/clubs",
      { email }
    );
    const selectedClubs = Array.isArray(response.data) ? response.data : [];

    console.log("Faculty Selected Clubs:", selectedClubs); // Debugging log
    setFacultySelectedClubs(selectedClubs);

    return selectedClubs; // Returning clubs to be used in useEffect
  } catch (error) {
    console.error("Failed to fetch faculty selected clubs:", error.message);
    return [];
  }
};

  

  const fetchClubData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/clubs/SEEE");
      if (response.data) {
        setClubData(response.data);
        setClubLogo(response.data.logo || '');
        setClubDescription(response.data.description || '');
        
        if (response.data.labels && response.data.labels.length > 0) {
          setLabels(response.data.labels);
        }
      }
    } catch (error) {
      console.error("Failed to fetch club data:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/events");
      const SEEEEvents = response.data.filter(event => event.club === 'SEEE');
      const today = new Date().toISOString().split("T")[0];
      const upcomingEvents = SEEEEvents.filter(event => event.date >= today);
      const pastEvents = SEEEEvents.filter(event => event.date < today);
      setEvents({ upcoming: upcomingEvents, past: pastEvents });
    } catch (error) {
      setError("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    setError('');

    const formData = new FormData();
    formData.append('logo', file);
    formData.append('clubName', "SEEE"); // Include the club name

    try {
      const response = await axios.post("http://localhost:5000/api/clubs/upload-logo", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.filePath) {
        setClubLogo(response.data.filePath);
      } else {
        throw new Error('Failed to upload logo to server');
      }
    } catch (err) {
      setError('Error uploading logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('email', userEmail); // Example, include email if necessary

    try {
      const response = await axios.post("http://localhost:5000/api/events/upload-image", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.filePath) {
        setimage(response.data.filePath);
        console.log(image);
      } else {
        throw new Error('Failed to upload image to server');
      }
    } catch (err) {
      setError('Error uploading image: ' + err.message);
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
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.documentUrl) {
        alert("Document uploaded successfully!");
        fetchEvents(); // Refresh events after upload
      } else {
        throw new Error('Failed to upload document to server');
      }
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

    try {
      await axios.post("http://localhost:5000/api/events/add", {
        eventname: eventName,
        clubtype: "Technical",
        club: "SEEE",
        date: eventDate,
        description: eventDescription,
        image: image,
        registeredEmails: []
      });

      alert("Event added successfully!");
      setEventName('');
      setEventDate('');
      setEventDescription('');
      setimage('');
      setShowAddEventForm(false);
      setError('');
      fetchEvents();
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

  // Handle adding a new label field
  const handleAddLabel = () => {
    setLabels([...labels, { name: '', value: '' }]);
  };

  // Handle removing a label field
  const handleRemoveLabel = (index) => {
    const newLabels = [...labels];
    newLabels.splice(index, 1);
    setLabels(newLabels);
  };

  // Handle label field changes
  const handleLabelChange = (index, field, value) => {
    const newLabels = [...labels];
    newLabels[index][field] = value;
    setLabels(newLabels);
  };

  // Save club data (logo and labels)
  const handleSaveClubData = async () => {
    try {
      // Filter out empty labels
      const filteredLabels = labels.filter(label => label.name.trim() !== '' || label.value.trim() !== '');
      
      await axios.post("http://localhost:5000/api/clubs/update", {
        clubName: "SEEE",
        logo: clubLogo,
        labels: filteredLabels,
        description: clubDescription
      });
      
      alert("Club information updated successfully!");
      fetchClubData();
      
      // Reset edit states
      setEditingLogo(false);
      setEditingDescription(false);
      setEditingLabels(false);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to update club information.");
    }
  };

  // Cancel all editing
  const handleCancelEdit = () => {
    fetchClubData(); // Revert to original data
    setEditingLogo(false);
    setEditingDescription(false);
    setEditingLabels(false);
  };

  const renderEventCard = (event) => {
    const isExpanded = expandedEventId === event._id;
    const canViewProfiles = userRole === 'admin' || (userRole === 'lead' && userClub === event.club)||isLeadForSEEE;
    const isUpcoming = new Date(event.date) >= new Date();
    const canUploadDocument = !isUpcoming && (userRole === 'admin' || (userRole === 'lead' && userClub === event.club)||isLeadForSEEE);
    
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
          {/* Club Header with Logo and Title */}
          <div className="club-header">
            <div className="logo-container">
              {clubLogo ? (
                <img src={clubLogo} alt="SEEE Logo" className="club-logo" />
              ) : (
                <div className="club-logo-placeholder">No Logo</div>
              )}
              {isLeadForSEEE && (
                <button 
                  className="edit-icon-button" 
                  onClick={() => setEditingLogo(true)}
                  style={{ display: editingLogo ? 'none' : 'flex' }}
                >
                  <FaEdit className="edit-icon" />
                </button>
              )}
            </div>
            <h1 className="page-title">SEEE</h1>
          </div>

          {/* Editing Panels - Only shown when in edit mode */}
          {isLeadForSEEE && (
            <div className="club-edit-panels">
              {/* Logo Edit Panel */}
              {editingLogo && (
                <div className="edit-panel">
                  <h3>Edit Club Logo <FaTimes className="close-icon" onClick={() => setEditingLogo(false)} /></h3>
                  <div className="form-group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                    {uploadingLogo && <p className="upload-status">Uploading logo...</p>}
                    {clubLogo && (
                      <div className="logo-preview">
                        <img src={clubLogo} alt="Club logo preview" style={{ maxWidth: '150px' }} />
                      </div>
                    )}
                    <div className="edit-actions">
                      <button className="save-button" onClick={handleSaveClubData}>
                        <FaSave /> Save Logo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Description Edit Panel */}
              {editingDescription && (
                <div className="edit-panel">
                  <h3>Edit Club Description <FaTimes className="close-icon" onClick={() => setEditingDescription(false)} /></h3>
                  <textarea
                    className="club-description-input"
                    placeholder="Enter a detailed description about the club, its activities, mission, etc."
                    value={clubDescription}
                    onChange={(e) => setClubDescription(e.target.value)}
                    rows={6}
                  />
                  <div className="edit-actions">
                    <button className="save-button" onClick={handleSaveClubData}>
                      <FaSave /> Save Description
                    </button>
                  </div>
                </div>
              )}

              {/* Labels Edit Panel */}
              {editingLabels && (
                <div className="edit-panel">
                  <h3>Edit Club Information <FaTimes className="close-icon" onClick={() => setEditingLabels(false)} /></h3>
                  <div className="labels-container">
                    {labels.map((label, index) => (
                      <div key={index} className="label-row">
                        <input
                          type="text"
                          placeholder="Label Name"
                          value={label.name}
                          onChange={(e) => handleLabelChange(index, 'name', e.target.value)}
                          className="label-input"
                        />
                        <input
                          type="text"
                          placeholder="Label Value"
                          value={label.value}
                          onChange={(e) => handleLabelChange(index, 'value', e.target.value)}
                          className="value-input"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(index)}
                          className="remove-label-button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddLabel}
                      className="add-label-button"
                    >
                      Add New Label
                    </button>
                  </div>
                  <div className="edit-actions">
                    <button className="save-button" onClick={handleSaveClubData}>
                      <FaSave /> Save Labels
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Display club information for all users */}
          <div className="club-info-display">
            <div className="section-header">
              {isLeadForSEEE && (
                <button 
                  className="edit-icon-button" 
                  onClick={() => setEditingDescription(true)}
                  style={{ display: editingDescription ? 'none' : 'flex' }}
                >
                  <FaEdit className="edit-icon" />
                </button>
              )}
            </div>
            
            {/* Display club description if available */}
            {clubDescription ? (
              <div className="club-description">
                <p>{clubDescription}</p>
              </div>
            ) : (
              <div className="club-description">
                <p className="empty-description">No description available. {isLeadForSEEE ? 'Click the edit button to add a description.' : ''}</p>
              </div>
            )}
            
            {/* Display club labels if available */}
            <div className="section-header">
              {isLeadForSEEE && (
                <button 
                  className="edit-icon-button" 
                  onClick={() => setEditingLabels(true)}
                  style={{ display: editingLabels ? 'none' : 'flex' }}
                >
                  <FaEdit className="edit-icon" />
                </button>
              )}
            </div>
            
            {labels && labels.length > 0 && labels.some(label => label.name || label.value) ? (
              <div className="club-labels">
                {labels.filter(label => label.name || label.value).map((label, index) => (
                  <div key={index} className="info-item">
                    <strong>{label.name || 'Label'}:</strong> {label.value || 'Value'}
                  </div>
                ))}
              </div>
            ) : (
              <div className="club-labels">
                <p className="empty-labels">No information available. {isLeadForSEEE ? 'Click the edit button to add information.' : ''}</p>
              </div>
            )}
          </div>

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

          {isLeadForSEEE && (
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
                        {image && (
                          <div className="image-preview">
                            <img src={image} alt="Event poster preview" />
                          </div>
                        )}
                      </div>

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

export default SEEE;