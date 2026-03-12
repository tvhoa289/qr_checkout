import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { statsAPI } from '../api';

const Stats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const topRes = await statsAPI.getTop(20);
      setTopUsers(topRes.data.top_users);
    } catch (err) {
      console.error('Fetch stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const res = await statsAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'top_users_completed.csv');
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
    <div className="stats-container">
      <header className="stats-header">
        <h1>🏆 Bảng Xếp Hạng</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/game')} className="btn-secondary">
            ← Quay lại game
          </button>
        </div>
      </header>

      <section className="stats-section">
        <div className="section-header">
          <h2>Top 20 người chơi</h2>
          {user?.role === 'admin' && (
            <button onClick={exportCSV} className="btn-primary">
              📥 Export CSV
            </button>
          )}
        </div>

        {topUsers.length === 0 ? (
          <p className="no-data">Chưa có người hoàn thành</p>
        ) : (
          <table className="stats-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>User</th>
                <th>Email</th>
                <th>Thời gian hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u) => (
                <tr key={u.id}>
                  <td className="rank">{u.rank}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{u.completed_at ? new Date(u.completed_at).toLocaleString('vi-VN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default Stats;
