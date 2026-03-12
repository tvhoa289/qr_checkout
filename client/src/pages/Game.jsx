import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { locationsAPI, authAPI } from '../api';
import { Html5Qrcode } from 'html5-qrcode';

const Game = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0, is_completed: false });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(null);
  const mapRef = useRef(null);
  const [manualToken, setManualToken] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showVictory, setShowVictory] = useState(false);
  const [victoryTime, setVictoryTime] = useState(null);
  const [gameStartTime] = useState(() => new Date());
  const scannerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (showVictory && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Autoplay blocked:', e));
    }
  }, [showVictory]);

  useEffect(() => {
    fetchLocations();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await locationsAPI.getAll();
      setLocations(res.data.locations);
      setProgress(res.data.progress);
      
      if (res.data.progress.is_completed && !showVictory) {
        console.log('Showing victory!');
        const endTime = new Date();
        setVictoryTime({ hours: 0, minutes: 0, seconds: 0, completedAt: endTime });
        setShowVictory(true);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().then(() => {
              console.log('Audio playing');
            }).catch(e => console.log('Audio play error:', e));
          }
        }, 500);
      }
      
      await refreshUser();
    } catch (err) {
      console.error('Fetch locations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (token) => {
    try {
      const res = await locationsAPI.scan(token);
      const unlockedId = res.data.location.id;
      
      setMessage({
        type: 'success',
        text: res.data.message,
        location: res.data.location
      });
      setProgress(res.data.progress);
      setJustUnlocked(unlockedId);
      
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      
      setTimeout(() => setJustUnlocked(null), 2000);
      
      fetchLocations();
      
      if (res.data.progress.is_completed) {
        const endTime = new Date();
        const timeDiff = Math.floor((endTime - gameStartTime) / 1000);
        const hours = Math.floor(timeDiff / 3600);
        const minutes = Math.floor((timeDiff % 3600) / 60);
        const seconds = timeDiff % 60;
        
        setVictoryTime({ hours, minutes, seconds, completedAt: endTime });
        setShowVictory(true);
        
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Scan failed'
      });
    }
  };

  const startScanner = async () => {
    setShowScanner(true);
    setScanning(true);
    
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          scanner.stop();
          setScanning(false);
          setShowScanner(false);
          let token = decodedText;
          try {
            const url = new URL(decodedText);
            token = url.searchParams.get('token') || decodedText;
          } catch {}
          handleScan(token);
        },
        () => {}
      );
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể mở camera. Nhập token thủ công bên dưới.' });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScanning(false);
    setShowScanner(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      handleScan(manualToken.trim());
      setManualToken('');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }
    try {
      await authAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.new });
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setShowChangePassword(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Đổi mật khẩu thất bại' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="game-container">
      <header className="game-header">
        <div className="user-info">
          <span>Xin chào, <strong>{user?.username}</strong></span>
          {progress.is_completed && <span className="badge-complete">✓ Đã hoàn thành</span>}
        </div>
        <div className="header-actions">
          <button onClick={() => setShowChangePassword(true)} className="btn-secondary">Đổi mật khẩu</button>
          <button onClick={() => navigate('/stats')} className="btn-secondary">🏆 Bảng Xếp Hạng</button>
          {user?.role === 'admin' && <button onClick={() => navigate('/admin')} className="btn-secondary">Admin</button>}
          <button onClick={handleLogout} className="btn-danger">Đăng xuất</button>
        </div>
      </header>

      <div className="title-section">
        <div className="title-icon"><img src="/icon.png" alt="icon" /></div>
        <h1>WELCOME TO GREY</h1>
        <p className="title-dimension">DIMENSION</p>
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div className="progress-icon">📍</div>
          <div className="progress-info">
            <div className="progress-text">
              <span>Tiến độ: {progress.completed}/{progress.total}</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(progress.completed / progress.total) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="story-section">
        <div className="story-card">
          <p>Chào mừng bạn đến với Grey D! Hãy khám phá 13 địa điểm trên bản đồ. Mỗi khi đến một địa điểm, hãy quét mã QR để mở khóa. Hoàn thành tất cả để chiến thắng!</p>
        </div>
      </div>

      <div className="map-grid-section" ref={mapRef}>
        <div className="map-container">
          <img src="/khungmap.png" alt="Bản đồ Checkout" className="map-frame-image" />
          <div className="puzzle-overlay">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className={`puzzle-piece ${loc.unlocked ? 'unlocked' : ''} ${justUnlocked === loc.id ? 'just-unlocked' : ''}`}
              >
                <span className="piece-number">{loc.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="old-map-section">
        <div className="old-map-card">
          <img src="/map.png" alt="Map" />
        </div>
      </div>

      <div className="scan-section">
        {!showScanner ? (
          <button onClick={startScanner} className="btn-primary btn-scan">📷 Quét QR Code</button>
        ) : (
          <div className="scanner-container">
            <button onClick={stopScanner} className="btn-danger" style={{ marginBottom: 16 }}>Đóng Scanner</button>
            <div id="qr-reader"></div>
            <form onSubmit={handleManualSubmit} style={{ marginTop: 16 }}>
              <p style={{ marginBottom: 8, color: '#666' }}>Hoặc nhập mã token:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Token..." style={{ flex: 1, padding: 12, border: '2px solid #444', borderRadius: 8, background: '#333', color: '#fff' }} />
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Xác nhận</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          <p>{message.text}</p>
          {message.location && <p className="location-name">{message.location.name}</p>}
          <button onClick={() => setMessage(null)} className="btn-close">Đóng</button>
        </div>
      )}

      {showChangePassword && (
        <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Đổi mật khẩu</h2>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Mật khẩu hiện tại</label>
                <input type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Xác nhận mật khẩu</label>
                <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} required />
              </div>
              <div className="btn-row">
                <button type="button" onClick={() => setShowChangePassword(false)} className="btn-secondary">Hủy</button>
                <button type="submit" className="btn-primary">Đổi mật khẩu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVictory && (
        <div className="victory-overlay">
          <div className="victory-modal">
            <audio ref={audioRef} src="/win.mp3" />
            <h2>🎉 CHÚC MỪNG! 🎉</h2>
            <p className="victory-title">BẠN ĐÃ CHIẾN THẮNG!</p>
            <p className="victory-subtitle">Hoàn thành tất cả 13 địa điểm</p>
            
            {victoryTime && (
              <div className="victory-time">
                <div 
                  className="vinyl-record"
                  onClick={() => audioRef.current?.play()}
                  title="Click để phát nhạc"
                >
                  💿
                </div>
                <p className="victory-date">
                  {victoryTime.completedAt.toLocaleString('vi-VN', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            )}
            
            <button onClick={() => setShowVictory(false)} className="btn-primary">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
