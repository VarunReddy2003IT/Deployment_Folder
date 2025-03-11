import React, { useState } from 'react';
import axios from 'axios';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './Signup.css';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    collegeId: '',
    email: '',
    mobilenumber: '',
    password: '',
    role: 'member',
    club: '',
    clubs: [], // For faculty role
  });
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const clubs = [
    'YES', 'NSS1', 'NSS2', 'YouthForSeva', 'YFS', 'WeAreForHelp', 'HOH', 'Vidyadaan', 'Rotract',
    'GCCC', 'IEEE', 'CSI', 'AlgoRhythm', 'OpenForge', 'VLSID', 'SEEE', 'Sports'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClubCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      if (checked) {
        return { ...prev, clubs: [...prev.clubs, value] };
      } else {
        return { ...prev, clubs: prev.clubs.filter(club => club !== value) };
      }
    });
  };

  const validateForm = () => {
    if (!formData.name.trim() || !formData.collegeId.trim() ||
        !formData.email.trim() || !formData.password.trim() || !formData.mobilenumber.trim()) {
      setError('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gvpce\.ac\.in$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email in the format: username@gvpce.ac.in');
      return false;
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.mobilenumber)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return false;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must be at least 8 characters long and contain a number and a special character');
      return false;
    }

    if (formData.role === 'lead' && !formData.club) {
      setError('Please select a club if you are signing up as a Lead');
      return false;
    }

    if (formData.role === 'faculty' && formData.clubs.length === 0) {
      setError('Please select at least one club if you are signing up as Faculty');
      return false;
    }

    return true;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/signup/send-otp', {
        email: formData.email
      });
      
      setShowOtpInput(true);
      alert(response.data.message);
    } catch (error) {
      setError(error.response?.data.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/signup/send-otp', {
        email: formData.email
      });
      
      alert(response.data.message);
    } catch (error) {
      setError(error.response?.data.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let signupData = { ...formData, otp };

      // Prepare data based on role
      if (formData.role === 'lead') {
        signupData.clubs = undefined; // No clubs array for lead
      } else if (formData.role === 'faculty') {
        signupData.club = undefined; // No single club for faculty
      } else {
        // For member or admin
        signupData.club = undefined;
        signupData.clubs = undefined;
      }

      const response = await axios.post('http://localhost:5000/api/signup/verify', signupData);

      alert(response.data.message);
      // Reset form
      setFormData({
        name: '',
        collegeId: '',
        email: '',
        mobilenumber: '',
        password: '',
        role: 'member',
        club: '',
        clubs: []
      });
      setOtp('');
      setShowOtpInput(false);
    } catch (error) {
      setError(error.response?.data.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="overall">
      <h3>Signup</h3>
      <form onSubmit={showOtpInput ? handleVerifyAndSignup : handleSendOtp}>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter your name"
          disabled={loading || showOtpInput}
        />

        <input
          type="text"
          name="collegeId"
          value={formData.collegeId}
          onChange={handleInputChange}
          placeholder="Enter your College ID"
          disabled={loading || showOtpInput}
        />

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter your email"
          disabled={loading || showOtpInput}
        />

        <input
          type="tel"
          name="mobilenumber"
          value={formData.mobilenumber}
          onChange={handleInputChange}
          placeholder="Enter your mobile number"
          disabled={loading || showOtpInput}
          maxLength="10"
        />

        <div className="password-container">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            disabled={loading || showOtpInput}
          />
          <span className="eye-icon" onClick={togglePasswordVisibility}>
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <select 
          name="role" 
          value={formData.role} 
          onChange={handleInputChange} 
          disabled={loading || showOtpInput}
        >
          <option value="admin">Admin</option>
          <option value="faculty">Faculty</option> {/* New role */}
          <option value="lead">Lead</option>
          <option value="member">Member</option>
        </select>

        {formData.role === 'lead' && (
          <select 
            name="club" 
            value={formData.club} 
            onChange={handleInputChange} 
            disabled={loading || showOtpInput}
          >
            <option value="">Select a Club</option>
            {clubs.map((clubName) => (
              <option key={clubName} value={clubName}>
                {clubName}
              </option>
            ))}
          </select>
        )}

        {formData.role === 'faculty' && (
          <div className="clubs-checkbox-container">
            <p className="checkbox-label">Select Clubs (Choose at least one):</p>
            <div className="clubs-grid">
              {clubs.map((clubName) => (
                <div key={clubName} className="club-checkbox">
                  <input
                    type="checkbox"
                    id={`club-${clubName}`}
                    value={clubName}
                    checked={formData.clubs.includes(clubName)}
                    onChange={handleClubCheckboxChange}
                    disabled={loading || showOtpInput}
                  />
                  <label htmlFor={`club-${clubName}`}>{clubName}</label>
                </div>
              ))}
            </div>
          </div>
        )}

        {showOtpInput && (
          <div className="otp-container">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              disabled={loading}
            />
            <button 
              type="button" 
              className="resend-otp-btn" 
              onClick={handleResendOtp}
              disabled={resendLoading}
            >
              {resendLoading ? 'Resending...' : 'Resend OTP'}
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="button-container">
          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : showOtpInput ? 'Verify & Signup' : 'Send OTP'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Signup;
