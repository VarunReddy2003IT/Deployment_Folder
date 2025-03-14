import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const Registers = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const userRole = localStorage.getItem('userRole');
  const userClub = localStorage.getItem('userClub');
  const [actionLoading, setActionLoading] = useState(null); // Track which profile is being updated

  useEffect(() => {
    if (eventId) {
      fetchEventAndProfiles();
    }
  }, [eventId]);
  

// Function to download registered profiles as an Excel file
const downloadExcel = () => {
  if (profiles.length === 0) {
    alert("No data available to download.");
    return;
  }

  // Define data structure for Excel
  const worksheetData = profiles.map((profile, index) => ({
    "S.No": index + 1,
    Name: profile.name || "Not available",
    Email: profile.email,
    "Mobile Number": profile.mobilenumber || "Not provided",
    "College ID": profile.collegeId || "N/A",
    "Participation Status": profile.participationStatus || "Not recorded",
  }));

  // Create worksheet and workbook
  const ws = XLSX.utils.json_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Registered Profiles");

  // Generate Excel file and trigger download
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
  saveAs(data, `Registered_Profiles_${event?.eventname || "Event"}.xlsx`);
};


  const fetchEventAndProfiles = async () => {
    try {
      setLoading(true);

      // Fetch event details
      const eventResponse = await axios.get(`http://localhost:5000/api/events`);
      const eventData = eventResponse.data.find(e => e._id === eventId);

      if (!eventData) {
        throw new Error('Event not found');
      }

      // Check if user has permission to view profiles
      if (userRole !== 'admin' && (userRole !== 'lead' || userClub !== eventData.club)&&userRole!=='faculty') {
        throw new Error('You do not have permission to view these profiles');
      }

      setEvent(eventData);

      // Fetch registered profiles - backend now returns profiles with participation status
      const profilesResponse = await axios.get(
        `http://localhost:5000/api/events/registered-profiles/${eventId}`
      );
      setProfiles(profilesResponse.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  };

  const markAsParticipated = async (email) => {
    try {
      if (!event) return;
      setActionLoading(email);
      
      const eventDetails = `${event.eventname}-${event.club}`;
      
      const response = await axios.post(`http://localhost:5000/api/events/mark-participation/${eventId}`, {
        userEmail: email,
        participated: true,
        eventDetails: eventDetails
      });
      
      if (response.data.success) {
        // Update the local state
        setProfiles(profiles.map(profile => 
          profile.email === email 
            ? { ...profile, participationStatus: 'participated' } 
            : profile
        ));
      } else {
        // If the backend indicates the update wasn't successful
        console.warn("Backend reported no updates:", response.data);
        alert(`Note: Profile was found in ${response.data.userFound} collection but participation may not have been recorded properly.`);
      }
    } catch (err) {
      console.error("Failed to mark participation:", err);
      alert(`Failed to mark participation: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  
  const removeRegistration = async (email) => {
    try {
      setActionLoading(email);
      await axios.post(`http://localhost:5000/api/events/remove-registration/${eventId}`, {
        userEmail: email
      });
      
      // Update the local state
      setProfiles(profiles.filter(profile => profile.email !== email));
    } catch (err) {
      console.error("Failed to remove registration:", err);
      alert(`Failed to remove registration: ${err.response?.data?.error || err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProfiles = () => {
    if (!searchTerm) return profiles;
    return profiles.filter(profile =>
      profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (!userRole || (userRole !== 'admin' && userRole !== 'lead'&&userRole!=='faculty')) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#dc3545' }}>Access Denied</h1>
          <p>You don't have permission to view this page.</p>
          <Link to="/" style={{ color: '#007bff' }}>Return to Home</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '20px' }}>Loading profiles...</div>;
  }

  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Registered Profiles for {event?.eventname}
      </h1>

      <div style={{ maxWidth: '600px', margin: '0 auto 30px auto' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 20px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '2px solid #ddd',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            outline: 'none',
          }}
        />
      </div>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={downloadExcel}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          📥 Download Excel
        </button>
      </div>


      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {filteredProfiles().map((profile) => (
          <div
            key={profile.email}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              {profile.imageUrl ? (
                <img
                  src={profile.imageUrl}
                  alt={`${profile.name}'s profile`}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    margin: '0 auto',
                  }}
                />
              ) : (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: '#e0e0e0',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  No Image
                </div>
              )}
            </div>

            <div>
              <strong>Name: </strong>{profile.name || "Not available"}
            </div>

            <div>
              <strong>Email: </strong>{profile.email}
            </div>

            <div>
              <strong>Phone: </strong>{profile.mobilenumber}
            </div>

            <div>
              <strong>ID: </strong>{profile.collegeId}
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              marginTop: '10px', 
              justifyContent: 'center',
              flexWrap: 'wrap' 
            }}>
              {actionLoading === profile.email ? (
                <div style={{ 
                  padding: '8px 15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  Processing...
                </div>
              ) : (
                <>
                  {profile.participationStatus !== 'participated' && profile.participationStatus !== 'not-participated' && (
                    <>
                      <button
                        onClick={() => markAsParticipated(profile.email)}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 15px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '14px',
                        }}
                      >
                        Participated
                      </button>
                    </>
                  )}

                  {profile.participationStatus === 'participated' && (
                    <div style={{ 
                      backgroundColor: '#e8f5e9', 
                      borderRadius: '4px', 
                      padding: '8px 15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>
                      <span>Participated</span>
                    </div>
                  )}

                  {profile.participationStatus === 'not-participated' && (
                    <div style={{ 
                      backgroundColor: '#ffebee', 
                      borderRadius: '4px', 
                      padding: '8px 15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{ color: '#dc3545', fontWeight: 'bold' }}>✕</span>
                      <span>Not Participated</span>
                    </div>
                  )}

                  {profile.participationStatus !== 'participated' && (
                    <button
                      onClick={() => removeRegistration(profile.email)}
                      style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 15px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {profiles.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666' }}>
          No registered profiles found for this event.
        </p>
      )}
    </div>
  );
};

export default Registers;