import React, { useState, useEffect } from "react";

function LeadsProfile() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const leadClub = localStorage.getItem("userClub");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/members-by-club?clubName=${leadClub}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error("Failed to fetch members");
      }
      setMembers(data.data);
    } catch (err) {
      setError(err.message || "Error fetching members");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClub = async (email, clubName) => {
    try {
      const response = await fetch("http://localhost:5000/api/remove-club", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, clubName })
      });

      const data = await response.json();

      if (data.success) {
        setMembers((prevMembers) =>
          prevMembers.map((member) =>
            member.email === email
              ? { ...member, selectedClubs: member.selectedClubs.filter(club => club !== clubName) }
              : member
          )
        );
      } else {
        throw new Error(data.message || "Error removing club");
      }
    } catch (err) {
      setError(err.message || "Error removing club");
    }
  };

  const filteredUsers = () => {
    if (!searchTerm) return members;
    return members.filter((user) =>
      (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "20px" }}>Loading members...</div>;
  }

  if (error) {
    return <div style={{ color: "red", textAlign: "center", marginTop: "20px" }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ textAlign: "center", color: "#333", marginBottom: "20px", fontSize: "24px", fontWeight: "bold" }}>
        Members of {leadClub}
      </h1>

      <div style={{ maxWidth: "600px", margin: "0 auto 30px auto" }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 20px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "2px solid #ddd",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            outline: "none",
          }}
        />
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}>
        {filteredUsers().map((user) => (
          <div
            key={user.email}
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "15px" }}>
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={`${user.name}'s profile`}
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    margin: "0 auto",
                  }}
                />
              ) : (
                <div style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  backgroundColor: "#e0e0e0",
                  margin: "0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  No Image
                </div>
              )}
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "bold", color: "#666" }}>Name:</label>
              <div>{user.name || "Not available"}</div>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "bold", color: "#666" }}>Email:</label>
              <div>{user.email}</div>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "bold", color: "#666" }}>Selected Clubs:</label>
              <div style={{ marginTop: "5px" }}>
                {user.selectedClubs.length > 0 ? (
                  <ul style={{ paddingLeft: "20px", listStyleType: "disc" }}>
                    {user.selectedClubs.map((club, index) => (
                      <li key={index}>{club}</li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: "#666" }}>No selected clubs</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "bold", color: "#666" }}>Pending Clubs:</label>
              <div style={{ marginTop: "5px" }}>
                {user.pendingClubs.length > 0 ? (
                  <ul style={{ paddingLeft: "20px", listStyleType: "disc" }}>
                    {user.pendingClubs.map((club, index) => (
                      <li key={index}>{club}</li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: "#666" }}>No pending clubs</span>
                )}
              </div>
            </div>

            {user.selectedClubs.includes(leadClub) && (
              <button
                onClick={() => handleDeleteClub(user.email, leadClub)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginTop: "10px",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#c82333"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#dc3545"}
              >
                Remove from Club
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LeadsProfile;