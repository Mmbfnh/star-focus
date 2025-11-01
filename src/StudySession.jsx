import React, { useState, useEffect } from 'react';

function StudySession({ child, subject, onComplete, onCancel }) {
  const [timeLeft, setTimeLeft] = useState(subject.duration * 60);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, onComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.9)', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      zIndex: 1000 
    }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea, #764ba2)', 
        color: 'white', 
        padding: 30, 
        borderRadius: 12, 
        textAlign: 'center',
        minWidth: 300
      }}>
        <h2>جلسة دراسة: {subject.name}</h2>
        <div style={{ fontSize: 48, fontWeight: 'bold', margin: 20 }}>{formatTime(timeLeft)}</div>
        <div style={{ marginBottom: 20 }}>الطفل: {child.name}</div>
        <button 
          onClick={onCancel}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          إلغاء الجلسة
        </button>
      </div>
    </div>
  );
}

export default StudySession;
