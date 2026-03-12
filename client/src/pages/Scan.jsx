import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { locationsAPI } from '../api';

const Scan = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/game');
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('Không tìm thấy mã QR hợp lệ');
      return;
    }

    const scanToken = async () => {
      try {
        const res = await locationsAPI.scan(token);
        setStatus('success');
        setMessage(res.data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Quét QR thất bại');
      }
    };

    scanToken();
  }, [token, user]);

  if (status === 'loading') {
    return (
      <div className="scan-result">
        <div className="loading">Đang xử lý...</div>
      </div>
    );
  }

  return (
    <div className="scan-result">
      <div className={`result-card ${status}`}>
        {status === 'success' ? (
          <>
            <div className="result-icon">✓</div>
            <h2>Thành công!</h2>
          </>
        ) : (
          <>
            <div className="result-icon">✗</div>
            <h2>Thất bại</h2>
          </>
        )}
        <p>{message}</p>
        <button onClick={() => navigate('/game')} className="btn-primary">
          Quay lại game
        </button>
      </div>
    </div>
  );
};

export default Scan;
