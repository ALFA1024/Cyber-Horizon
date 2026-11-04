import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import { GamePhase, PlayerStats, FloatingText } from './game/types';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal, GameOverModal, VictoryModal } from './components/Modals';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-level Game UI State
  const [phase, setPhase] = useState<GamePhase>('title');
  const [stats, setStats] = useState<PlayerStats>({
    hp: 100,
    maxHp: 100,
    shield: 100,
    maxShield: 100,
    score: 0,
    highScore: 0,
    wave: 1,
    kills: 0,
    boost: 100,
    maxBoost: 100,
    isBoosting: false,
    empCooldown: 0,
    maxEmpCooldown: 12,
    weaponType: 'plasma',
    weaponLevel: 1,
    powerupTimer: 0,
  });

  const [bossActive, setBossActive] = useState(false);
  const [bossHp, setBossHp] = useState(0);
  const [bossMaxHp, setBossMaxHp] = useState(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // Initialize 60fps Three.js isolated engine
    const engine = new GameEngine(canvasContainerRef.current, {
      onStatsUpdate: (newStats) => {
        setStats(newStats);
      },
      onPhaseChange: (newPhase) => {
        setPhase(newPhase);
      },
      onBossStateChange: (active, hp, maxHp) => {
        setBossActive(active);
        setBossHp(hp);
        setBossMaxHp(maxHp);
      },
      onFloatingText: (texts) => {
        setFloatingTexts(texts);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = () => {
    engineRef.current?.startGame();
  };

  const handlePause = () => {
    engineRef.current?.togglePause();
  };

  const handleResume = () => {
    engineRef.current?.togglePause();
  };

  const handleRestart = () => {
    engineRef.current?.restartGame();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Isolated Three.js WebGL Viewport Container (Decoupled from React render cycles) */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {/* Title Screen Overlay */}
      {phase === 'title' && (
        <TitleScreen
          highScore={stats.highScore}
          onStart={handleStartGame}
        />
      )}

      {/* In-Game Active HUD Overlay */}
      {phase === 'playing' && (
        <HUD
          stats={stats}
          engine={engineRef.current}
          bossActive={bossActive}
          bossHp={bossHp}
          bossMaxHp={bossMaxHp}
          floatingTexts={floatingTexts}
          onPause={handlePause}
        />
      )}

      {/* Paused Modal */}
      {phase === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
        />
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && (
        <GameOverModal
          stats={stats}
          onRestart={handleRestart}
        />
      )}

      {/* Victory Modal */}
      {phase === 'victory' && (
        <VictoryModal
          stats={stats}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
