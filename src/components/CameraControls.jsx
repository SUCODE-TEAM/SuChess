import React, { useState } from 'react';
import { Video, Square, Compass } from 'lucide-react';

export const CameraControls = ({ sceneManagerRef }) => {
  const [activeView, setActiveView] = useState('perspective');

  const setView = (mode) => {
    setActiveView(mode);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraView(mode);
    }
  };

  return (
    <div className="camera-dock">
      <span className="camera-dock-label">
        <Video size={13} className="gold-text" /> Kamera
      </span>
      <div className="camera-buttons">
        <button
          className={`cam-btn ${activeView === 'perspective' ? 'active' : ''}`}
          onClick={() => setView('perspective')}
          title="Sudut Pandang Bebas 3D"
        >
          3D
        </button>
        <button
          className={`cam-btn ${activeView === 'white' ? 'active' : ''}`}
          onClick={() => setView('white')}
          title="Sudut Pandang Sisi Putih"
        >
          Putih
        </button>
        <button
          className={`cam-btn ${activeView === 'black' ? 'active' : ''}`}
          onClick={() => setView('black')}
          title="Sudut Pandang Sisi Hitam"
        >
          Hitam
        </button>
        <button
          className={`cam-btn ${activeView === 'top' ? 'active' : ''}`}
          onClick={() => setView('top')}
          title="Tampak Atas (Top-Down 2D)"
        >
          Atas
        </button>
      </div>
    </div>
  );
};
