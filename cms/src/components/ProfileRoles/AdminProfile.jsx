import React, { useState, useEffect } from 'react';

function AdminProfiles() {
  const [members, setMembers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clubs] = useState([
    'YES', 'NSS1', 'NSS2', 'YouthForSeva', 'YFS', 'WeAreForHelp',
    'HOH', 'Vidyadaan', 'Rotract', 'GCCC', 'IEEE', 'CSI', 'AlgoRhythm', 
    'OpenForge', 'VLSID', 'SEEE', 'Sports'
  ]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [membersResponse, leadsResponse] = await Promise.all([
        fetch('http://localhost:5000/api/all-members'),
        fetch('http://localhost:5000/api/all-leads')
      ]);

      const membersData = await membersResponse.json();
      const leadsData = await leadsResponse.json();

      if (!membersData.success || !leadsData.success) {
        throw new Error('Failed to fetch users');
      }

      setMembers(membersData.data);
      setLeads(leadsData.data);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email, role) => {
    if (!window.confirm(`Are you sure you want to delete this ${role}?`)) {
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to delete user');
      }

      if (role === 'member') {
        setMembers(members.filter(member => member.email !== email));
      } else if (role === 'lead') {
        setLeads(leads.filter(lead => lead.email !== email));
      }

      alert(`${role} deleted successfully`);
    } catch (err) {
      setError(err.message || 'Error deleting user');
      alert(`Error deleting ${role}: ${err.message}`);
    }
  };

  const handlePromote = async (email) => {
    const club = prompt("Select a club from the following: " + clubs.join(", "));
    if (!clubs.includes(club)) {
      alert("Invalid club. Promotion canceled.");
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/promote-member', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, club }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to promote user');
      }

      setMembers(members.filter(member => member.email !== email));
      setLeads([...leads, { email, name: result.name, club }]); // Optionally include other properties
      alert(`Member promoted to lead successfully`);
    } catch (err) {
      setError(err.message || 'Error promoting user');
      alert(`Error promoting member: ${err.message}`);
    }
  };

  const handleDePromote = async (email) => {
    try {
      const response = await fetch('http://localhost:5000/api/depromote-lead', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to de-promote user');
      }

      setLeads(leads.filter(lead => lead.email !== email));
      setMembers([...members, { email, name: result.name }]); // Optionally include other properties
      alert(`Lead de-promoted to member successfully`);
    } catch (err) {
      setError(err.message || 'Error de-promoting user');
      alert(`Error de-promoting lead: ${err.message}`);
    }
  };

  const filteredUsers = () => {
    const activeUsers = activeTab === 'members' ? members : leads;
    if (!searchTerm) return activeUsers;

    const searchTermLower = searchTerm.toLowerCase();
    return activeUsers.filter(user => 
      (user.name?.toLowerCase().includes(searchTermLower) || 
       user.email.toLowerCase().includes(searchTermLower)
    ));
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '20px' }}>Loading users...</div>;
  }

  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Tab Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <button onClick={() => setActiveTab('members')} style={{
          padding: '10px 20px',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: activeTab === 'members' ? '#007bff' : '#e0e0e0',
          color: activeTab === 'members' ? 'white' : 'black',
          cursor: 'pointer',
          fontSize: '16px'
        }}>
          Members ({members.length})
        </button>
        <button onClick={() => setActiveTab('leads')} style={{
          padding: '10px 20px',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: activeTab === 'leads' ? '#007bff' : '#e0e0e0',
          color: activeTab === 'leads' ? 'white' : 'black',
          cursor: 'pointer',
          fontSize: '16px'
        }}>
          Leads ({leads.length})
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto 30px auto' 
      }}>
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

      <h1 style={{ 
        textAlign: 'center', 
        color: '#333', 
        marginBottom: '30px' 
      }}>
        {activeTab === 'members' ? 'All Members' : 'All Leads'}
      </h1>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '20px', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        {filteredUsers().map((user) => (
          <div key={user.email} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Image Section */}
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              {user.imageUrl ? (
                <img 
                  src={user.imageUrl} 
                  alt={`${user.name}'s profile`} 
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '50%', 
                    objectFit: 'cover' 
                  }} 
                  onError={(e) => {
                    e.target.style.display = 'none'; // Hide broken image
                    e.target.nextSibling.style.display = 'flex'; // Show placeholder
                  }}
                />
              ) : (
                <div 
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '50%', 
                    backgroundColor: '#e0e0e0',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontWeight: 'bold',
                    border: '2px solid #ccc' // Circular border
                  }}
                >
                  No Image
                </div>
              )}
              {/* Fallback for broken images */}
              {user.imageUrl && (
                <div 
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '50%', 
                    backgroundColor: '#e0e0e0',
                    margin: '0 auto',
                    display: 'none', // Hidden by default
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontWeight: 'bold',
                    border: '2px solid #ccc' // Circular border
                  }}
                >
                  No Image
                </div>
              )}
            </div>

            {/* User Details */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#666' }}>Name:</label>
              <div>{user.name || 'Not available'}</div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold', color: '#666' }}>Email:</label>
              <div>{user.email}</div>
            </div>

            {activeTab === 'leads' && user.club && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontWeight: 'bold', color: '#666' }}>Club:</label>
                <div>{user.club}</div>
              </div>
            )}

            {/* Button Container */}
            <div style={{ 
              display: 'flex', 
              gap: '10px', // Space between buttons
              marginTop: '15px'
            }}>
              {activeTab === 'members' && (
                <button
                  onClick={() => handlePromote(user.email)}
                  style={{
                    flex: 1, // Equal width for both buttons
                    backgroundColor: '#007bff',
                    color: 'white',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                >
                  Promote
                </button>
              )}

              {activeTab === 'leads' && (
                <button
                  onClick={() => handleDePromote(user.email)}
                  style={{
                    flex: 1, // Equal width for both buttons
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    fontSize: '14px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                >
                  Demote
                </button>
              )}

              <button
                onClick={() => handleDelete(user.email, activeTab === 'members' ? 'member' : 'lead')}
                style={{
                  flex: 1, // Equal width for both buttons
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
              >
                Delete {activeTab === 'members' ? 'Member' : 'Lead'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminProfiles;