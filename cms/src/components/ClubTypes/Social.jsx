import React, { useState, useEffect } from 'react';
import SocialFooter from '../SocialFooter';
import './events.css'

const Social = () => {
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);
  
  // Retrieve user role from localStorage
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        
        // Fetch upcoming events for social clubtype
        const upcomingResponse = await fetch('http://localhost:5000/api/events/upcoming/Social');
        if (!upcomingResponse.ok) {
          throw new Error(`HTTP error! Status: ${upcomingResponse.status}`);
        }
        const upcomingData = await upcomingResponse.json();

        // Fetch past events for social clubtype
        const pastResponse = await fetch('http://localhost:5000/api/events/past/Social');
        if (!pastResponse.ok) {
          throw new Error(`HTTP error! Status: ${pastResponse.status}`);
        }
        const pastData = await pastResponse.json();

        setEvents({
          upcoming: upcomingData,
          past: pastData,
        });
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleExpandEvent = (eventId) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Remove the deleted event from state
      setEvents({
        upcoming: events.upcoming.filter((event) => event._id !== eventId),
        past: events.past.filter((event) => event._id !== eventId),
      });

      // If the deleted event was expanded, reset expandedEventId
      if (expandedEventId === eventId) {
        setExpandedEventId(null);
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert(`Failed to delete event: ${err.message}`);
    }
  };

  const renderEvent = (event) => {
    const isExpanded = expandedEventId === event._id;

    return (
      <div key={event._id} className={`event-card ${isExpanded ? 'expanded' : ''}`}>
        <div className="event-card-preview" onClick={() => handleExpandEvent(event._id)}>
          {event.image && (
            <div className="event-image-container">
              <img src={event.image} alt={event.eventname} className="event-image" />
            </div>
          )}
          <div className="event-preview-details">
            <h3>{event.eventname}</h3>
            <p className="event-club">{event.club}</p>
          </div>
        </div>

        {isExpanded && (
          <div className="event-expanded-details">
            <p>
              <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
            </p>
            <p>
              <strong>Description:</strong> {event.description}
            </p>
            
          {events.upcoming.some(upcomingEvent => upcomingEvent._id === event._id)&&event.registrationLink && (
              <a href={event.registrationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="registration-link"
              >
                Register Now
              </a>
            )}

            {/* Show Delete button only if user is admin */}
            {userRole === 'admin' && (
              <button
                className="delete-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteEvent(event._id);
                }}
              >
                Delete Event
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="social-container">
      <SocialFooter />
      <header className="social-header">
        <h1 className="text-3xl font-bold text-center text-gray-800">Social Events</h1>
      </header>

      <main className="events-section">
        {loading ? (
          <div className="loading-section">
            <p className="text-gray-600">Loading events...</p>
          </div>
        ) : error ? (
          <div className="error-section">
            <p className="text-red-500">Error: {error}</p>
          </div>
        ) : (
          <>
            {/* Upcoming Events */}
            {events.upcoming.length > 0 && (
              <section className="event-section upcoming-events">
                <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
                <div className="events-grid">
                  {events.upcoming.map(renderEvent)}
                </div>
              </section>
            )}

            {/* Past Events */}
            {events.past.length > 0 && (
              <section className="event-section past-events">
                <h2 className="text-xl font-semibold mb-4">Past Events</h2>
                <div className="events-grid">
                  {events.past.map(renderEvent)}
                </div>
              </section>
            )}

            {/* No events available */}
            {events.upcoming.length === 0 && events.past.length === 0 && (
              <div className="no-events">
                <p className="text-gray-600">No social events available at the moment.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Social;
