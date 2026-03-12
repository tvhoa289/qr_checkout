import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { locationsAPI, statsAPI, authAPI } from '../api';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [qrcodes, setQrcodes] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('locations');
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState('desc');
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/game');
      return;
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, userSearch, userSort]);

  const fetchData = async () => {
    try {
      const [locRes, qrRes, overviewRes] = await Promise.all([
        locationsAPI.getAllLocations(),
        locationsAPI.getAllQR(),
        statsAPI.getOverview()
      ]);
      setLocations(locRes.data.locations);
      setQrcodes(qrRes.data.locations);
      setOverview(overviewRes.data.overview);
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await authAPI.getUsers(userSearch, userSort);
      setUsers(res.data.users);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    
    if (locations.length >= 13) {
      alert('Đã đạt tối đa 13 location!');
      return;
    }

    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      x_position: parseInt(formData.get('x_position')) || 0,
      y_position: parseInt(formData.get('y_position')) || 0
    };

    try {
      await locationsAPI.createLocation(data);
      e.target.reset();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Create failed');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa location này?')) return;
    
    try {
      await locationsAPI.deleteLocation(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleResetIds = async () => {
    if (!confirm('Đánh số lại tất cả location từ 1?')) return;
    
    try {
      const res = await locationsAPI.resetIds();
      alert(res.data.message);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed');
    }
  };

  const handleResetPassword = async (userId, username) => {
    const confirmed = confirm(`Reset password của ${username} về welcome@2026?`);
    
    if (!confirmed) return;
    
    try {
      await authAPI.resetPassword(userId);
      alert(`Đã reset password của ${username} thành công!`);
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed');
    }
  };

  const downloadQR = (qrCode, name) => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `qr-${name || 'location'}.png`;
    link.click();
  };

  const exportUsersCSV = async () => {
    try {
      const res = await statsAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'danh_sach_user.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export CSV error:', err);
      alert('Export failed');
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Quản trị</h1>
        <button onClick={() => navigate('/game')} className="btn-secondary">
          ← Quay lại game
        </button>
      </header>

      {overview && (
        <div className="overview-cards">
          <div className="overview-card">
            <h3>Tổng người chơi</h3>
            <div className="number">{overview.total_users}</div>
          </div>
          <div className="overview-card">
            <h3>Hoàn thành game</h3>
            <div className="number">{overview.completed_users}</div>
          </div>
          <div className="overview-card">
            <h3>Tổng location</h3>
            <div className="number">{overview.total_locations}</div>
          </div>
          <div className="overview-card">
            <h3>Tổng lượt unlock</h3>
            <div className="number">{overview.total_unlocks}</div>
          </div>
        </div>
      )}

      <div className="admin-tabs">
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          Quản lý User
        </button>
        <button 
          className={activeTab === 'locations' ? 'active' : ''} 
          onClick={() => setActiveTab('locations')}
        >
          Quản lý Location
        </button>
        <button 
          className={activeTab === 'qrcodes' ? 'active' : ''} 
          onClick={() => setActiveTab('qrcodes')}
        >
          Tạo QR Code
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="user-filters">
            <input 
              type="text" 
              placeholder="Tìm username hoặc email..." 
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="search-input"
            />
            <select 
              value={userSort} 
              onChange={(e) => setUserSort(e.target.value)}
              className="sort-select"
            >
              <option value="desc">Nhiều location nhất</option>
              <option value="asc">Ít location nhất</option>
            </select>
            <button onClick={exportUsersCSV} className="btn-primary">
              📥 Export CSV
            </button>
          </div>
          
          {usersLoading ? (
            <p>Đang tải...</p>
          ) : users.length === 0 ? (
            <p className="no-data">Chưa có user nào</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>Location</th>
                  <th>Hoàn thành lúc</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || '-'}</td>
                    <td>{u.unlocked_count}/13</td>
                    <td>{u.completed_at ? new Date(u.completed_at).toLocaleString('vi-VN') : '-'}</td>
                    <td style={{ position: 'relative', zIndex: 10 }}>
                      <button 
                        type="button"
                        onClick={() => handleResetPassword(u.id, u.username)}
                        className="btn-warning"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', position: 'relative', zIndex: 100, cursor: 'pointer' }}
                      >
                        Reset Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'locations' && (
        <div className="tab-content">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên</th>
                <th>Token</th>
                <th>Vị trí (X, Y)</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id}>
                  <td>{loc.id}</td>
                  <td>{loc.name || '-'}</td>
                  <td className="token">{loc.token}</td>
                  <td>({loc.x_position}, {loc.y_position})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'qrcodes' && (
        <div className="tab-content">
          <p className="info-text">Click vào QR để tải về</p>
          <div className="qr-grid">
            {qrcodes.map((qr) => (
              <div key={qr.id} className="qr-card">
                <img 
                  src={qr.qr_code} 
                  alt={`QR ${qr.name || qr.id}`}
                  onClick={() => downloadQR(qr.qr_code, qr.name || qr.id)}
                  className="qr-image"
                />
                <p>{qr.name || `Location ${qr.id}`}</p>
                <code>{qr.scan_url}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
