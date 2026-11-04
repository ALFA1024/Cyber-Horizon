import React, { useState } from 'react';
import { sound } from '../game/audio';
import { Volume2, VolumeX, Play, ShieldAlert, Award } from 'lucide-react';

interface TitleScreenProps {
  highScore: number;
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ highScore, onStart }) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const handleMuteToggle = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-12 font-mono select-none">
      {/* Top Header Row */}
      <div className="flex justify-between items-center w-full">
        {/* Systems Status Badge */}
        <div className="flex items-center gap-2 bg-slate-950/75 border border-cyan-500/40 px-3.5 py-1.5 rounded-full text-xs text-cyan-300 font-bold tracking-widest shadow-lg shadow-cyan-950/30">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-300" />
          <span>CYBER HORIZON // OS V4.8</span>
        </div>

        {/* Audio Mute & Record Cluster */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {highScore > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950/75 border border-amber-500/40 px-3 py-1.5 rounded-full text-xs text-amber-300 font-bold tracking-wider">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>RECORD: <strong className="tabular-nums text-white">{highScore.toLocaleString()}</strong></span>
            </div>
          )}

          <button
            onClick={handleMuteToggle}
            className="p-2.5 bg-slate-950/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 rounded-full transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Center Negative Space (30-40% preserved for 3D live hero interceptor showcase) */}
      <div className="my-auto max-w-2xl mx-auto text-center flex flex-col items-center">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="w-full max-w-lg mb-4 drop-shadow-2xl">
          <svg viewBox="0 0 600 120" className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Cyber Brackets */}
            <path
              d="M 40 20 L 15 20 L 15 100 L 40 100"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeOpacity="0.4"
            />
            <path
              d="M 560 20 L 585 20 L 585 100 L 560 100"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeOpacity="0.4"
            />

            {/* Sub-header text */}
            <text
              x="300"
              y="38"
              textAnchor="middle"
              fill="url(#amberGrad)"
              fontSize="13"
              letterSpacing="8"
              fontWeight="900"
              fontFamily="monospace"
            >
              COMBAT SIMULATOR // INTERCEPTOR PROTOCOL
            </text>

            {/* Main Title Typography */}
            <text
              x="300"
              y="85"
              textAnchor="middle"
              fill="url(#cyberGrad)"
              filter="url(#cyanGlow)"
              fontSize="48"
              fontWeight="900"
              letterSpacing="6"
              fontFamily="system-ui, sans-serif"
            >
              VOID STRIKER
            </text>

            {/* Tech Underline Accent */}
            <line x1="160" y1="98" x2="440" y2="98" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.8" />
            <circle cx="300" cy="98" r="3.5" fill="#38bdf8" />
          </svg>
        </div>

        <p className="text-slate-400 text-xs md:text-sm max-w-md mb-8 leading-relaxed">
          High-performance tactical interceptor combat. Neutralize hostile drone swarms, dodge artillery mortars, and vanquish the Omega Behemoth.
        </p>

        {/* Primary Start CTA Button */}
        <button
          onClick={onStart}
          className="pointer-events-auto group relative px-8 py-4 bg-gradient-to-r from-cyan-600 via-cyan-500 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-slate-950 font-black text-sm md:text-base tracking-widest uppercase rounded-lg transition-all duration-200 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-3 border border-cyan-200"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>LAUNCH MISSION</span>
          <span className="hidden sm:inline-block text-xs bg-cyan-900/40 text-cyan-950 px-2 py-0.5 rounded font-mono font-bold ml-1 border border-cyan-950/20">
            SPACE / ENTER
          </span>
        </button>
      </div>

      {/* Bottom Flat Control-Hint Line per game craft requirements */}
      <div className="w-full text-center flex flex-col items-center gap-2">
        <div className="bg-slate-950/80 border border-slate-800 px-5 py-2 rounded-full text-[11px] md:text-xs text-slate-400 tracking-wider font-semibold shadow-md">
          <span className="text-cyan-400 font-bold">WASD / Arrows</span> Move ·{' '}
          <span className="text-cyan-400 font-bold">Space / Click</span> Fire ·{' '}
          <span className="text-amber-400 font-bold">Shift</span> Boost ·{' '}
          <span className="text-purple-400 font-bold">Q / E</span> EMP Nova ·{' '}
          <span className="text-slate-300 font-bold">Esc</span> Pause
        </div>
      </div>
    </div>
  );
};
