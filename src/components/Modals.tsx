import React, { useState } from 'react';
import { PlayerStats } from '../game/types';
import { sound } from '../game/audio';
import { RotateCcw, Play, Volume2, VolumeX, Award, ShieldAlert, Trophy } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart }) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const handleMuteToggle = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-none p-4 font-mono select-none">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl shadow-cyan-950/50 flex flex-col items-center text-center">
        <div className="text-xs font-bold tracking-widest text-cyan-400 mb-1">
          SYSTEMS STANDBY
        </div>
        <h2 className="text-2xl font-black tracking-wider text-slate-100 mb-6">
          TACTICAL PAUSE
        </h2>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3 mb-6">
          <button
            onClick={onResume}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-slate-950 font-black tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-900/30"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RESUME MISSION [ESC]</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500/50 text-slate-200 font-bold tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>RESTART SIMULATION</span>
          </button>

          <button
            onClick={handleMuteToggle}
            className="w-full py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
          </button>
        </div>

        {/* Controls Quick Reference */}
        <div className="w-full pt-4 border-t border-slate-800 text-[11px] text-slate-400 text-left space-y-1.5">
          <div className="font-bold text-slate-300 text-center mb-2">TELEMETRY CONTROLS</div>
          <div className="flex justify-between">
            <span className="text-slate-500">Maneuver:</span>
            <span className="text-cyan-300 font-semibold">WASD / Arrow Keys</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Plasma Cannons:</span>
            <span className="text-cyan-300 font-semibold">Spacebar / Left Mouse</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Afterburners:</span>
            <span className="text-amber-300 font-semibold">Shift Key</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">EMP Shockwave:</span>
            <span className="text-purple-300 font-semibold">Q or E Key</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  stats: PlayerStats;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, onRestart }) => {
  const isNewHighScore = stats.score > 0 && stats.score >= stats.highScore;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 backdrop-blur-none p-4 font-mono select-none">
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl shadow-rose-950/50 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6 text-rose-400" />
        </div>

        <div className="text-xs font-bold tracking-widest text-rose-400 mb-1">
          SIGNAL TERMINATED // HULL BREACH
        </div>
        <h2 className="text-3xl font-black tracking-wider text-white mb-2">
          MISSION FAILED
        </h2>

        {isNewHighScore && (
          <div className="inline-flex items-center gap-1.5 bg-amber-950/60 border border-amber-500/50 px-3 py-1 rounded-full text-xs font-bold text-amber-300 mb-4 animate-bounce">
            <Award className="w-3.5 h-3.5" />
            <span>NEW ALL-TIME HIGH SCORE!</span>
          </div>
        )}

        {/* Stats Summary Grid */}
        <div className="w-full grid grid-cols-2 gap-3 my-5">
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-left">
            <div className="text-[10px] text-slate-400 font-bold">FINAL SCORE</div>
            <div className="text-xl font-black tabular-nums text-cyan-300">
              {stats.score.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-left">
            <div className="text-[10px] text-slate-400 font-bold">WAVE REACHED</div>
            <div className="text-xl font-black tabular-nums text-amber-400">
              {stats.wave}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-left">
            <div className="text-[10px] text-slate-400 font-bold">HOSTILES ELIMINATED</div>
            <div className="text-xl font-black tabular-nums text-slate-200">
              {stats.kills}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-left">
            <div className="text-[10px] text-slate-400 font-bold">BEST RECORD</div>
            <div className="text-xl font-black tabular-nums text-slate-200">
              {stats.highScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Restart CTA */}
        <button
          onClick={onRestart}
          className="w-full py-4 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-slate-950 font-black tracking-widest text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-900/40"
        >
          <RotateCcw className="w-4 h-4 fill-slate-950" />
          <span>REDEPLOY INTERCEPTOR [SPACE / ENTER]</span>
        </button>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  stats: PlayerStats;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ stats, onRestart }) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 backdrop-blur-none p-4 font-mono select-none">
      <div className="bg-slate-900 border border-cyan-400/50 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl shadow-cyan-950/50 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center mb-3">
          <Trophy className="w-6 h-6 text-cyan-300" />
        </div>

        <div className="text-xs font-bold tracking-widest text-cyan-400 mb-1">
          THREAT NEUTRALIZED // SECTOR SECURED
        </div>
        <h2 className="text-3xl font-black tracking-wider text-white mb-2">
          VICTORY ACHIEVED
        </h2>
        <p className="text-xs text-slate-300 mb-4 max-w-xs">
          The Omega Behemoth dreadnought has been vanquished. Void airspace has been reclaimed!
        </p>

        {/* Stats Summary Grid */}
        <div className="w-full grid grid-cols-2 gap-3 my-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-left">
            <div className="text-[10px] text-slate-400 font-bold">TOTAL SCORE</div>
            <div className="text-xl font-black tabular-nums text-cyan-300">
              {stats.score.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-left">
            <div className="text-[10px] text-slate-400 font-bold">WAVES SURVIVED</div>
            <div className="text-xl font-black tabular-nums text-amber-400">
              {stats.wave}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-left">
            <div className="text-[10px] text-slate-400 font-bold">ENEMIES PURGED</div>
            <div className="text-xl font-black tabular-nums text-slate-200">
              {stats.kills}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-left">
            <div className="text-[10px] text-slate-400 font-bold">HIGH SCORE</div>
            <div className="text-xl font-black tabular-nums text-slate-200">
              {stats.highScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Play Again CTA */}
        <button
          onClick={onRestart}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black tracking-widest text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-900/40"
        >
          <RotateCcw className="w-4 h-4 fill-slate-950" />
          <span>ENGAGE NEXT CAMPAIGN [SPACE / ENTER]</span>
        </button>
      </div>
    </div>
  );
};
