import React, { useState, useEffect } from "react";
import "./Home.css";

function Home() {
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [displayedEvents, setDisplayedEvents] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const EVENTS_PER_PAGE = 6;

  // Retrieve user role (assuming it's stored in localStorage)
  const userRole = localStorage.getItem("userRole");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);

        // Fetch upcoming events
        const upcomingResponse = await fetch("http://localhost:5000/api/events/upcoming");
        if (!upcomingResponse.ok) {
          throw new Error(`HTTP error! Status: ${upcomingResponse.status}`);
        }
        const upcomingData = await upcomingResponse.json();

        // Fetch past events
        const pastResponse = await fetch("http://localhost:5000/api/events/past");
        if (!pastResponse.ok) {
          throw new Error(`HTTP error! Status: ${pastResponse.status}`);
        }
        const pastData = await pastResponse.json();

        setEvents({
          upcoming: upcomingData,
          past: pastData,
        });

        // Initialize displayed events with first 5 items
        setDisplayedEvents({
          upcoming: upcomingData.slice(0, EVENTS_PER_PAGE),
          past: pastData.slice(0, EVENTS_PER_PAGE),
        });
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events based on search term
  const filterEvents = (eventsList) => {
    if (!searchTerm) return eventsList;
    
    const search = searchTerm.toLowerCase();
    return eventsList.filter(event => 
      event.eventname.toLowerCase().includes(search) ||
      event.clubtype.toLowerCase().includes(search) ||
      event.club.toLowerCase().includes(search)
    );
  };

  // Update displayed events when search term changes
  useEffect(() => {
    const filteredUpcoming = filterEvents(events.upcoming);
    const filteredPast = filterEvents(events.past);
    
    setDisplayedEvents({
      upcoming: filteredUpcoming.slice(0, EVENTS_PER_PAGE),
      past: filteredPast.slice(0, EVENTS_PER_PAGE)
    });
  }, [searchTerm, events]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleExpandEvent = (eventId) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const handleViewMore = (type) => {
    const currentLength = displayedEvents[type].length;
    const filteredEvents = filterEvents(events[type]);
    
    setDisplayedEvents(prev => ({
      ...prev,
      [type]: filteredEvents.slice(0, currentLength + EVENTS_PER_PAGE)
    }));
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      const response = await fetch(`http://localhost:5000/api/events/${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Remove the deleted event from both states
      const updateEvents = (eventList) => eventList.filter((event) => event._id !== eventId);
      
      setEvents(prev => ({
        upcoming: updateEvents(prev.upcoming),
        past: updateEvents(prev.past),
      }));
      
      setDisplayedEvents(prev => ({
        upcoming: updateEvents(prev.upcoming),
        past: updateEvents(prev.past),
      }));

      if (expandedEventId === eventId) {
        setExpandedEventId(null);
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      alert(`Failed to delete event: ${err.message}`);
    }
  };

  const renderEvent = (event) => {
    const isExpanded = expandedEventId === event._id;

    return (
      <div key={event._id} className={`event-card ${isExpanded ? "expanded" : ""}`}>
        <div className="event-card-preview" onClick={() => handleExpandEvent(event._id)}>
          {event.image && (
            <div className="event-image-container">
              <img src={event.image} alt={event.name} className="event-image" />
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
              <strong>Club Type:</strong> {event.clubtype}
            </p>
            <p>
              <strong>Description:</strong> {event.description}
            </p>
            {events.upcoming.some(upcomingEvent => upcomingEvent._id === event._id)&&event.registrationLink && (
              <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className="registration-link">
                Register Now
              </a>
            )}

            {userRole === "admin" && (
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
    <div className="home-container">
      <section className="welcome-section">
        <h2><em>Welcome to GVP CLUB CONNECT</em></h2>
        <p>
          At Gayatri Vidya Parishad College of Engineering, we take pride in our vibrant and diverse club culture. With
          clubs spanning across Social, Cultural, Technical, and Coding, our college offers something for everyone.
        </p>
      </section>

      <div className="search-section">
        <input
          type="text"
          placeholder="Search events by name, club type, or club..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-section">
          <p>Loading events...</p>
        </div>
      ) : error ? (
        <div className="error-section">
          <p>Error loading events: {error}</p>
        </div>
      ) : (
        <>
          {events.upcoming.length > 0 && (
            <section className="event-section upcoming-events">
              <h2>Upcoming Events</h2>
              <div className="events-grid">{displayedEvents.upcoming.map(renderEvent)}</div>
              {displayedEvents.upcoming.length < filterEvents(events.upcoming).length && (
                <button 
                  className="view-more-button"
                  onClick={() => handleViewMore('upcoming')}
                >
                  View More Upcoming Events
                </button>
              )}
            </section>
          )}

          {events.past.length > 0 && (
            <section className="event-section past-events">
              <h2>Past Events</h2>
              <div className="events-grid">{displayedEvents.past.map(renderEvent)}</div>
              {displayedEvents.past.length < filterEvents(events.past).length && (
                <button 
                  className="view-more-button"
                  onClick={() => handleViewMore('past')}
                >
                  View More Past Events
                </button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
