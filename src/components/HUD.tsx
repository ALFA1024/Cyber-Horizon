import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats, FloatingText } from '../game/types';
import { GameEngine } from '../game/engine';
import { sound } from '../game/audio';
import { Shield, Zap, Crosshair, Volume2, VolumeX, Pause, Flame } from 'lucide-react';

interface HUDProps {
  stats: PlayerStats;
  engine: GameEngine | null;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  floatingTexts: FloatingText[];
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  engine,
  bossActive,
  bossHp,
  bossMaxHp,
  floatingTexts,
  onPause,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Touch Virtual Joystick State
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickOrigin, setJoystickOrigin] = useState({ x: 0, y: 0 });
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  const handleMuteToggle = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Minimap 2D Render Loop
  useEffect(() => {
    let animId: number;
    const renderMinimap = () => {
      if (minimapCanvasRef.current && engine) {
        const ctx = minimapCanvasRef.current.getContext('2d');
        if (ctx) {
          const w = minimapCanvasRef.current.width;
          const h = minimapCanvasRef.current.height;
          const center = w / 2;
          const mapData = engine.getMinimapData();
          const scale = (center - 8) / mapData.arenaRadius;

          ctx.clearRect(0, 0, w, h);

          // Radar background
          ctx.fillStyle = 'rgba(3, 7, 18, 0.75)';
          ctx.beginPath();
          ctx.arc(center, center, center - 2, 0, Math.PI * 2);
          ctx.fill();

          // Radar perimeter ring
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Radar grid lines
          ctx.strokeStyle = 'rgba(14, 116, 144, 0.2)';
          ctx.beginPath();
          ctx.moveTo(center, 4);
          ctx.lineTo(center, w - 4);
          ctx.moveTo(4, center);
          ctx.lineTo(w - 4, center);
          ctx.stroke();

          // Draw Powerups
          for (const pu of mapData.powerups) {
            const px = center + pu.x * scale;
            const py = center + pu.z * scale;
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw Enemies
          for (const e of mapData.enemies) {
            const ex = center + e.x * scale;
            const ey = center + e.z * scale;
            ctx.fillStyle = e.type === 'boss' ? '#fbbf24' : '#f43f5e';
            ctx.beginPath();
            ctx.arc(ex, ey, e.type === 'boss' ? 4.5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Draw Player Arrow
          const plX = center + mapData.player.x * scale;
          const plY = center + mapData.player.z * scale;
          ctx.save();
          ctx.translate(plX, plY);
          ctx.rotate(-mapData.player.rotation);

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(0, -5);
          ctx.lineTo(3.5, 4);
          ctx.lineTo(0, 2);
          ctx.lineTo(-3.5, 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      animId = requestAnimationFrame(renderMinimap);
    };

    animId = requestAnimationFrame(renderMinimap);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Touch Virtual Joystick Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    setJoystickActive(true);
    setJoystickOrigin({ x: touch.clientX, y: touch.clientY });
    setJoystickPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!joystickActive || !engine) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickOrigin.x;
    const dy = touch.clientY - joystickOrigin.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 45;

    const clampedDx = dist > maxRadius ? (dx / dist) * maxRadius : dx;
    const clampedDy = dist > maxRadius ? (dy / dist) * maxRadius : dy;

    setJoystickPos({
      x: joystickOrigin.x + clampedDx,
      y: joystickOrigin.y + clampedDy,
    });

    engine.setVirtualJoystick(true, clampedDx / maxRadius, clampedDy / maxRadius);
  };

  const handleTouchEnd = () => {
    setJoystickActive(false);
    if (engine) {
      engine.setVirtualJoystick(false, 0, 0);
    }
  };

  const empProgress = stats.empCooldown > 0 ? 1 - stats.empCooldown / stats.maxEmpCooldown : 1;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 font-mono text-slate-200">
      {/* Floating Damage & Combat Texts */}
      {floatingTexts.map((ft) => {
        if (!engine) return null;
        const pos = engine.getPlayerScreenPos(ft.x, ft.y, ft.z);
        if (!pos.isVisible) return null;
        return (
          <div
            key={ft.id}
            className="absolute font-black text-sm tracking-wider pointer-events-none drop-shadow-md"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              color: ft.color,
              opacity: ft.opacity,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {ft.text}
          </div>
        );
      })}

      {/* Top Header Cluster: Health, Shield, Wave, Boss, Audio */}
      <div className="w-full p-4 md:p-6 flex justify-between items-start">
        {/* Top-Left: Hull & Shield Bars */}
        <div className="flex flex-col gap-2 bg-slate-950/80 border border-cyan-500/30 rounded-lg p-3 min-w-[210px] shadow-lg shadow-cyan-950/20 pointer-events-auto">
          {/* Hull Integrity */}
          <div>
            <div className="flex justify-between text-xs tracking-wider text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-bold text-rose-400">
                <Flame className="w-3.5 h-3.5" /> HULL
              </span>
              <span className="tabular-nums font-bold text-slate-200">
                {Math.ceil(stats.hp)} / {stats.maxHp}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-sm overflow-hidden border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-150"
                style={{ width: `${Math.max(0, (stats.hp / stats.maxHp) * 100)}%` }}
              />
            </div>
          </div>

          {/* Energy Shield */}
          <div>
            <div className="flex justify-between text-xs tracking-wider text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-bold text-cyan-400">
                <Shield className="w-3.5 h-3.5" /> SHIELD
              </span>
              <span className="tabular-nums font-bold text-slate-200">
                {Math.ceil(stats.shield)} / {stats.maxShield}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-sm overflow-hidden border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 transition-all duration-150"
                style={{ width: `${Math.max(0, (stats.shield / stats.maxShield) * 100)}%` }}
              />
            </div>
          </div>

          {/* Weapon Level / Tier Indicator */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
            <span className="text-cyan-300 flex items-center gap-1">
              <Crosshair className="w-3 h-3" /> CANNON LV.{stats.weaponLevel}
            </span>
            <span className="text-slate-400">KILLS: <strong className="tabular-nums text-slate-200">{stats.kills}</strong></span>
          </div>
        </div>

        {/* Top-Center: Boss Health Gauge when Active */}
        {bossActive && (
          <div className="flex flex-col items-center max-w-sm w-full mx-4 bg-slate-950/85 border border-amber-500/40 rounded-lg p-2.5 shadow-xl shadow-amber-950/20">
            <div className="flex items-center justify-between w-full mb-1 text-xs font-bold tracking-widest text-amber-400">
              <span>⚠ OMEGA BEHEMOTH</span>
              <span className="tabular-nums text-slate-200">{Math.ceil(bossHp)} / {bossMaxHp}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-sm overflow-hidden border border-amber-800/60">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-rose-500 to-amber-400 transition-all duration-150"
                style={{ width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Top-Right: Score, Wave, Controls */}
        <div className="flex items-start gap-3 pointer-events-auto">
          <div className="bg-slate-950/80 border border-cyan-500/30 rounded-lg p-3 text-right shadow-lg shadow-cyan-950/20">
            <div className="text-[10px] tracking-widest text-cyan-400 font-bold uppercase">SCORE</div>
            <div className="text-xl md:text-2xl font-black tabular-nums tracking-wider text-slate-100">
              {stats.score.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              WAVE <strong className="text-cyan-300 text-sm">{stats.wave}</strong> · BEST: <strong className="tabular-nums text-slate-300">{stats.highScore.toLocaleString()}</strong>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleMuteToggle}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-2.5 bg-slate-950/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 rounded-lg transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              onClick={onPause}
              title="Pause Game [Esc]"
              className="p-2.5 bg-slate-950/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 rounded-lg transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Center: Boost & EMP Nova Action Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950/85 border border-cyan-500/30 rounded-xl px-5 py-2.5 pointer-events-auto shadow-2xl shadow-cyan-950/40">
        {/* Boost Gauge */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-slate-300 mb-1">
            <Flame className={`w-3.5 h-3.5 ${stats.isBoosting ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
            <span>BOOST [SHIFT]</span>
          </div>
          <div className="w-28 h-2 bg-slate-900 rounded-sm overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-75 ${
                stats.boost > 20 ? 'bg-gradient-to-r from-amber-500 to-amber-300' : 'bg-rose-500'
              }`}
              style={{ width: `${(stats.boost / stats.maxBoost) * 100}%` }}
            />
          </div>
        </div>

        <div className="w-px h-8 bg-slate-800" />

        {/* EMP Nova Button / Indicator */}
        <button
          onClick={() => engine?.triggerEmpSpecial()}
          disabled={stats.empCooldown > 0}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold tracking-wider transition-all cursor-pointer ${
            stats.empCooldown <= 0
              ? 'bg-purple-950/80 border-purple-500 text-purple-200 hover:bg-purple-900/90 hover:border-purple-400 shadow-md shadow-purple-900/40'
              : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Zap className="w-4 h-4 text-purple-400" />
          <span>EMP NOVA [Q/E]</span>
          {stats.empCooldown > 0 && (
            <span className="tabular-nums text-[10px] text-purple-300/70">
              {stats.empCooldown.toFixed(1)}s
            </span>
          )}
        </button>
      </div>

      {/* Bottom Right: Radar Minimap */}
      <div className="absolute bottom-6 right-6 hidden md:block bg-slate-950/85 border border-cyan-500/40 rounded-xl p-2 shadow-xl shadow-cyan-950/30 pointer-events-auto">
        <canvas
          ref={minimapCanvasRef}
          width={110}
          height={110}
          className="rounded-lg block"
        />
        <div className="text-[9px] tracking-widest text-center text-cyan-400/80 font-bold mt-1">
          TACTICAL RADAR
        </div>
      </div>

      {/* Mobile Touch Controls (Rendered on touch devices) */}
      <div
        className="md:hidden absolute inset-0 pointer-events-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Virtual Joystick Visual Indicator */}
        {joystickActive && (
          <div
            className="absolute rounded-full border-2 border-cyan-400/40 bg-cyan-950/20 pointer-events-none"
            style={{
              width: '90px',
              height: '90px',
              left: `${joystickOrigin.x - 45}px`,
              top: `${joystickOrigin.y - 45}px`,
            }}
          >
            <div
              className="absolute w-8 h-8 rounded-full bg-cyan-400 border border-white shadow-lg shadow-cyan-400/50"
              style={{
                left: `${joystickPos.x - joystickOrigin.x + 45 - 16}px`,
                top: `${joystickPos.y - joystickOrigin.y + 45 - 16}px`,
              }}
            />
          </div>
        )}

        {/* Mobile Action Buttons Right Side */}
        <div className="absolute bottom-20 right-6 flex flex-col gap-3 pointer-events-auto">
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              engine?.triggerBoost(true);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              engine?.triggerBoost(false);
            }}
            className="w-14 h-14 rounded-full bg-amber-600/80 active:bg-amber-500 border border-amber-300 text-white font-bold flex items-center justify-center text-xs shadow-lg"
          >
            BOOST
          </button>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              engine?.triggerEmpSpecial();
            }}
            className="w-14 h-14 rounded-full bg-purple-600/80 active:bg-purple-500 border border-purple-300 text-white font-bold flex items-center justify-center text-xs shadow-lg"
          >
            EMP
          </button>
        </div>
      </div>
    </div>
  );
};
