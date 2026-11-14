"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CRATE_RARITIES,
  Crate,
  getCrateImageUrl,
  getCrateRarityTier,
} from "@/lib/crates";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export type CrateRevealItem = {
  ID: string;
  itemName: string;
  itemType: string;
  previewImage: string;
  rarity?: string;
  songUrl?: string;
  songPreviewStart?: number | string | null;
};

export type CrateResult = {
  item: CrateRevealItem;
  rarity: string;
  alreadyOwned: boolean;
};

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Tiny Web-Audio synthesiser for the crate-opening sound effects. Everything
 * is generated in the browser, so no audio assets ship with the app.
 */
class CrateSfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private rumbleSource: AudioBufferSourceNode | null = null;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;

    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext;

        if (!AudioCtx) return null;

        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }

      if (this.ctx.state === "suspended") void this.ctx.resume();

      return this.ctx;
    } catch {
      return null;
    }
  }

  setMuted(muted: boolean) {
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  private getNoise(ctx: AudioContext) {
    if (!this.noiseBuffer) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.noiseBuffer = buffer;
    }

    return this.noiseBuffer;
  }

  tick(pitch: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = pitch;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  startRumble() {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const master = this.master;

    this.stopRumble();

    const source = ctx.createBufferSource();
    source.buffer = this.getNoise(ctx);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 140;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();

    this.rumbleSource = source;
  }

  stopRumble() {
    try {
      this.rumbleSource?.stop();
    } catch {}

    this.rumbleSource = null;
  }

  charge(durationMs: number, tierIndex: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    const duration = Math.max(0.2, durationMs / 1000);
    const master = this.master;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      420 + tierIndex * 160,
      ctx.currentTime + duration
    );
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);

    // Epic and above get a shimmering second layer.
    if (tierIndex >= 3) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(180, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(
        900 + tierIndex * 220,
        ctx.currentTime + duration
      );
      gain2.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + duration * 0.9);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc2.connect(gain2);
      gain2.connect(master);
      osc2.start();
      osc2.stop(ctx.currentTime + duration + 0.05);
    }
  }

  burst(tierIndex: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    const master = this.master;

    // Noise sweep.
    const source = ctx.createBufferSource();
    source.buffer = this.getNoise(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(3200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.55);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
    source.stop(ctx.currentTime + 0.7);

    // Sub-bass drop.
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();

    sub.type = "sine";
    sub.frequency.setValueAtTime(150, ctx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.7);
    subGain.gain.setValueAtTime(0.5, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

    sub.connect(subGain);
    subGain.connect(master);
    sub.start();
    sub.stop(ctx.currentTime + 0.85);

    // Legendary and icon pulls add metallic bell partials.
    if (tierIndex >= 4) {
      [880, 1318, 1760, 2637].forEach((freq, index) => {
        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();

        bell.type = "sine";
        bell.frequency.value = freq;

        const start = ctx.currentTime + 0.05 + index * 0.07;

        bellGain.gain.setValueAtTime(0.0001, start);
        bellGain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);

        bell.connect(bellGain);
        bellGain.connect(master);
        bell.start(start);
        bell.stop(start + 1);
      });
    }
  }

  reveal(tierIndex: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    // Pentatonic arpeggio — rarer pulls get more notes.
    const steps = [0, 3, 5, 7, 10, 12, 15, 17];
    const noteCount = Math.min(steps.length, 3 + tierIndex);
    const base = 523.25;
    const master = this.master;

    for (let i = 0; i < noteCount; i++) {
      const semitones = steps[i];
      const freq = base * Math.pow(2, semitones / 12);
      const start = ctx.currentTime + 0.05 + i * 0.095;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);

      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.4);
    }

    // Legendary and icon pulls finish on a chord.
    if (tierIndex >= 4) {
      const chordStart = ctx.currentTime + 0.05 + noteCount * 0.095 + 0.05;

      [0, 7, 12, 19].forEach((semis) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = base * Math.pow(2, semis / 12);

        gain.gain.setValueAtTime(0.0001, chordStart);
        gain.gain.exponentialRampToValueAtTime(0.1, chordStart + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 1.1);

        osc.connect(gain);
        gain.connect(master);
        osc.start(chordStart);
        osc.stop(chordStart + 1.2);
      });
    }
  }

  dispose() {
    this.stopRumble();

    try {
      void this.ctx?.close();
    } catch {}

    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
  }
}

type Phase = "shake" | "charge" | "burst" | "reveal";

export default function CrateOpeningOverlay({
  crate,
  result,
  coinsLeft,
  canOpenAnother,
  isBusy,
  onOpenAnother,
  onClose,
}: {
  crate: Crate;
  result: CrateResult;
  coinsLeft: number | null;
  canOpenAnother: boolean;
  isBusy: boolean;
  onOpenAnother: () => void;
  onClose: () => void;
}) {
  const tier = getCrateRarityTier(result.rarity);
  const tierIndex = CRATE_RARITIES.findIndex((t) => t.key === tier.key);
  const [phase, setPhase] = useState<Phase>("shake");
  const [muted, setMuted] = useState(false);
  const [songPlaying, setSongPlaying] = useState(false);

  const sfxRef = useRef<CrateSfx | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playerRef = useRef<any>(null);

  const isSongResult =
    String(result.item.itemType || "").toLowerCase() === "song" &&
    Boolean(getYouTubeId(String(result.item.songUrl || "")));

  const particles = useMemo(() => {
    const colors = tier.rainbow
      ? [
          `hsl(${Math.floor(Math.random() * 360)}, 90%, 62%)`,
          "#ffffff",
          tier.color,
        ]
      : [tier.color, "#ffffff", hexToRgba(tier.color, 0.7)];

    return Array.from({ length: tier.particles }, (_, i) => {
      const angle = (i / tier.particles) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 90 + Math.random() * 170;

      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: 4 + Math.random() * 7,
        delay: Math.random() * 0.22,
        color: colors[i % colors.length],
        confetti:
          (tier.rainbow || tier.key === "legendary") && i % 3 === 0,
      };
    });
  }, [tier]);

  // Audio engine lives exactly as long as the overlay.
  useEffect(() => {
    sfxRef.current = new CrateSfx();

    return () => {
      sfxRef.current?.dispose();
      sfxRef.current = null;
    };
  }, []);

  // Opening timeline: shake -> charge -> burst -> reveal. Rarer pulls run
  // longer because the tier's phase durations scale with rarity.
  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    timersRef.current.push(setTimeout(() => setPhase("charge"), tier.shakeMs));
    timersRef.current.push(
      setTimeout(() => setPhase("burst"), tier.shakeMs + tier.chargeMs)
    );
    timersRef.current.push(
      setTimeout(
        () => setPhase("reveal"),
        tier.shakeMs + tier.chargeMs + tier.burstMs
      )
    );

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [tier]);

  // Phase sound effects.
  useEffect(() => {
    const sfx = sfxRef.current;
    if (!sfx) return;

    let tickTimer: ReturnType<typeof setInterval> | null = null;
    let tickStop: ReturnType<typeof setTimeout> | null = null;

    if (phase === "shake") {
      sfx.startRumble();

      const startedAt = Date.now();

      tickTimer = setInterval(() => {
        const progress = Math.min(
          1,
          (Date.now() - startedAt) / Math.max(1, tier.shakeMs)
        );

        sfx.tick(520 + progress * 760);
      }, 130);

      tickStop = setTimeout(
        () => {
          if (tickTimer) clearInterval(tickTimer);
        },
        tier.shakeMs
      );
    } else if (phase === "charge") {
      sfx.charge(tier.chargeMs, tierIndex);
    } else if (phase === "burst") {
      sfx.stopRumble();
      sfx.burst(tierIndex);
    } else {
      sfx.stopRumble();
      sfx.reveal(tierIndex);
    }

    return () => {
      if (tickTimer) clearInterval(tickTimer);
      if (tickStop) clearTimeout(tickStop);
    };
  }, [phase, tier, tierIndex]);

  // Song rewards play a snippet of the track at reveal time. The start
  // offset comes from the shop item's "Song Preview Start" when the admin
  // set one; otherwise it aims for roughly a third into the track, where
  // choruses usually sit.
  useEffect(() => {
    if (phase !== "reveal" || !isSongResult) return;

    const videoId = getYouTubeId(String(result.item.songUrl || ""));
    if (!videoId) return;

    let destroyed = false;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;

    const startSnippet = (player: any) => {
      if (destroyed) return;

      try {
        const configured = Number(result.item.songPreviewStart);
        const hasConfigured =
          Number.isFinite(configured) && configured > 0;
        const duration = Number(player.getDuration?.() || 0);

        let startSeconds = hasConfigured ? configured : 0;

        if (!hasConfigured) {
          startSeconds =
            duration > 40 ? Math.floor(duration * 0.35) : 15;
          startSeconds = Math.min(
            startSeconds,
            Math.max(0, duration - 31)
          );
        }

        player.loadVideoById({ videoId, startSeconds });
        player.setVolume?.(80);
        setSongPlaying(true);

        stopTimer = setTimeout(() => {
          try {
            player.stopVideo?.();
          } catch {}

          setSongPlaying(false);
        }, 30000);
      } catch {
        setSongPlaying(false);
      }
    };

    const attach = () => {
      if (destroyed) return;

      playerRef.current = new window.YT.Player("crate-reveal-song-player", {
        height: "0",
        width: "0",
        videoId,
        playerVars: { controls: 0, modestbranding: 1, rel: 0 },
        events: {
          onReady: (event: any) => startSnippet(event.target),
          onError: () => setSongPlaying(false),
        },
      });
    };

    if (window.YT && window.YT.Player) {
      attach();
    } else {
      window.onYouTubeIframeAPIReady = attach;

      if (
        !document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        )
      ) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];

        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
    }

    return () => {
      destroyed = true;

      if (stopTimer) clearTimeout(stopTimer);

      try {
        playerRef.current?.destroy?.();
      } catch {}

      playerRef.current = null;
    };
  }, [phase, isSongResult, result]);

  // Escape closes the overlay once the item has been revealed.
  useEffect(() => {
    if (phase !== "reveal") return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onClose]);

  const skip = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase("reveal");
  };

  const toggleMute = () => {
    const next = !muted;

    setMuted(next);
    sfxRef.current?.setMuted(next);

    try {
      if (next) playerRef.current?.mute?.();
      else playerRef.current?.unMute?.();
    } catch {}
  };

  const crateImage = getCrateImageUrl(crate.image);
  const itemImage = getCrateImageUrl(result.item.previewImage);

  return (
    <div
      className={`crate-overlay${tier.screenShake && phase !== "reveal" ? " is-shaking" : ""}`}
      style={
        {
          "--rc": tier.color,
          "--rc-glow": hexToRgba(tier.color, 0.45),
          "--rc-soft": hexToRgba(tier.color, 0.16),
          "--amp": `${tier.shakeAmp}px`,
          "--shake-dur": `${tier.shakeMs}ms`,
          "--charge-dur": `${tier.chargeMs}ms`,
          "--burst-dur": `${tier.burstMs}ms`,
        } as any
      }
    >
      <div className="crate-overlay-backdrop" />

      <div className="crate-stage">
        {phase !== "reveal" && (
          <div className={`crate-box crate-box--${phase}`}>
            {(phase === "charge" || phase === "burst") && (
              <div className="crate-glow" />
            )}

            {tier.rays && phase === "charge" && <div className="crate-rays" />}

            <div
              className={`crate-image${tier.rainbow ? " crate-rainbow" : ""}`}
            >
              {crateImage ? (
                <img src={crateImage} alt={crate.name || "Crate"} />
              ) : (
                <span className="crate-image-emoji">📦</span>
              )}
            </div>
          </div>
        )}

        {phase === "burst" && (
          <>
            <div className="crate-flash" />

            {Array.from({ length: tier.rings }).map((_, i) => (
              <span
                key={`ring-${i}`}
                className="crate-ring"
                style={{ animationDelay: `${i * 90}ms` }}
              />
            ))}

            {tier.beam && <div className="crate-beam" />}

            {particles.map((particle, i) => (
              <span
                key={`particle-${i}`}
                className={
                  particle.confetti
                    ? "crate-particle crate-particle--confetti"
                    : "crate-particle"
                }
                style={
                  {
                    "--p-dx": `${particle.dx}px`,
                    "--p-dy": `${particle.dy}px`,
                    "--p-size": `${particle.size}px`,
                    "--p-color": particle.color,
                    animationDelay: `${particle.delay}s`,
                  } as any
                }
              />
            ))}
          </>
        )}

        {phase === "reveal" && (
          <div
            className={`crate-reveal${tier.rainbow ? " crate-rainbow" : ""}`}
          >
            <div className="crate-reveal-chip">{tier.label}</div>

            <div className="crate-reveal-art">
              {tier.rays && (
                <div className="crate-rays crate-rays--reveal" />
              )}
              {tier.beam && (
                <div className="crate-beam crate-beam--reveal" />
              )}

              <div className="crate-item-card">
                {itemImage ? (
                  <img src={itemImage} alt={result.item.itemName} />
                ) : (
                  <span className="crate-item-fallback">
                    {(result.item.itemName || "?").slice(0, 1)}
                  </span>
                )}
              </div>
            </div>

            <div className="crate-reveal-name">
              {result.item.itemName || "Shop item"}
            </div>

            <div className="crate-reveal-type">
              {String(result.item.itemType || "item").toUpperCase()}
              {result.alreadyOwned
                ? " · DUPLICATE"
                : " · added to your inventory"}
            </div>

            {isSongResult && (
              <div className="crate-song-note">
                {songPlaying
                  ? "♪ Playing track…"
                  : "♪ Song reward"}
              </div>
            )}

            <div className="crate-hype">{tier.hype}</div>

            <div className="crate-reveal-actions">
              <button
                type="button"
                className="crate-btn crate-btn-primary"
                onClick={onOpenAnother}
                disabled={!canOpenAnother || isBusy}
              >
                {isBusy
                  ? "Opening..."
                  : canOpenAnother
                  ? `Open Another · ${Number(
                      crate.price || 0
                    ).toLocaleString()} Coins`
                  : "Not enough coins"}
              </button>

              <button
                type="button"
                className="crate-btn crate-btn-secondary"
                onClick={onClose}
              >
                Done
              </button>
            </div>

            <div className="crate-reveal-coins">
              Balance:{" "}
              {coinsLeft === null ? "—" : coinsLeft.toLocaleString()} Coins
            </div>
          </div>
        )}

        {phase !== "reveal" && (
          <>
            <div className="crate-caption">
              Opening {crate.name || "crate"}…
            </div>

            <button
              type="button"
              className="crate-skip"
              onClick={skip}
            >
              Skip ▸
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        className="crate-mute"
        onClick={toggleMute}
        aria-label={muted ? "Unmute sounds" : "Mute sounds"}
        title={muted ? "Unmute sounds" : "Mute sounds"}
      >
        {muted ? "🔇" : "🔊"}
      </button>

      {isSongResult && (
        <div
          id="crate-reveal-song-player"
          style={{
            width: "1px",
            height: "1px",
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
            position: "absolute",
          }}
        />
      )}
      
      <style jsx>{`
        .crate-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crate-overlay.is-shaking {
          animation: crate-screen-shake 0.3s linear infinite;
        }

        .crate-overlay-backdrop {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 50% 42%,
            rgba(15, 23, 42, 0.82),
            rgba(2, 6, 23, 0.97)
          );
          animation: crate-fade-in 0.25s ease both;
        }

        .crate-stage {
          position: relative;
          width: min(92vw, 560px);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1rem 2.5rem;
        }

        .crate-box {
          position: relative;
          width: 190px;
          height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crate-box--shake {
          animation: crate-shake var(--shake-dur) cubic-bezier(0.36, 0.07, 0.19, 0.97)
            both;
        }

        .crate-box--charge {
          animation: crate-shake-fast 0.16s linear infinite,
            crate-grow var(--charge-dur) ease-in both;
        }

        .crate-box--burst {
          animation: crate-explode var(--burst-dur) ease-out both;
        }

        .crate-image {
          width: 100%;
          height: 100%;
          border-radius: 22px;
          overflow: hidden;
          border: 2px solid var(--rc);
          background: linear-gradient(160deg, var(--rc-soft), rgba(255, 255, 255, 0.02)),
            #10131c;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55), 0 0 34px var(--rc-glow);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .crate-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .crate-image-emoji {
          font-size: 5rem;
          line-height: 1;
        }

        .crate-glow {
          position: absolute;
          inset: -34%;
          border-radius: 999px;
          background: radial-gradient(circle, var(--rc-glow) 0%, transparent 65%);
          opacity: 0;
          animation: crate-glow-in var(--charge-dur) ease-in both;
          pointer-events: none;
        }

        .crate-reveal-art {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
        }

        /* Light beams: a conic sunburst with a radial mask, so the beams
           fade in from behind the crate and dissolve at their tips — no
           hard circle silhouette. */
        .crate-rays {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 540px;
          height: 540px;
          margin: -270px 0 0 -270px;
          border-radius: 999px;
          background: repeating-conic-gradient(
            from 0deg,
            var(--rc-glow) 0deg 4deg,
            transparent 4deg 26deg
          );
          -webkit-mask-image: radial-gradient(
            circle,
            transparent 20%,
            rgba(0, 0, 0, 0.9) 38%,
            rgba(0, 0, 0, 0.9) 58%,
            transparent 82%
          );
          mask-image: radial-gradient(
            circle,
            transparent 20%,
            rgba(0, 0, 0, 0.9) 38%,
            rgba(0, 0, 0, 0.9) 58%,
            transparent 82%
          );
          animation: crate-spin 9s linear infinite,
            crate-rays-breathe 2.4s ease-in-out infinite;
          pointer-events: none;
        }

        .crate-rays--reveal {
          width: 620px;
          height: 620px;
          margin: -310px 0 0 -310px;
          animation: crate-spin 16s linear infinite,
            crate-rays-breathe 2.8s ease-in-out infinite;
        }

        .crate-flash {
          position: fixed;
          inset: 0;
          background: #fff;
          opacity: 0;
          animation: crate-flash var(--burst-dur) ease-out both;
          pointer-events: none;
        }

        .crate-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 130px;
          height: 130px;
          margin: -65px 0 0 -65px;
          border: 3px solid var(--rc);
          border-radius: 999px;
          opacity: 0;
          animation: crate-ring var(--burst-dur) ease-out both;
          pointer-events: none;
        }

        .crate-particle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: var(--p-size);
          height: var(--p-size);
          margin: calc(var(--p-size) / -2) 0 0 calc(var(--p-size) / -2);
          border-radius: 999px;
          background: var(--p-color);
          opacity: 0;
          animation: crate-particle var(--burst-dur) cubic-bezier(0.17, 0.67, 0.35, 1)
            both;
          pointer-events: none;
        }

        .crate-particle--confetti {
          border-radius: 2px;
          animation-name: crate-confetti;
        }

        .crate-beam {
          position: absolute;
          top: -38vh;
          left: 50%;
          width: 190px;
          height: 58vh;
          background: linear-gradient(
            to bottom,
            transparent,
            var(--rc-glow),
            transparent
          );
          filter: blur(6px);
          transform: translateX(-50%);
          animation: crate-beam var(--burst-dur) ease-out both;
          pointer-events: none;
        }

        .crate-beam--reveal {
          animation: crate-beam 2.4s ease-out both;
        }

        .crate-rainbow {
          animation: crate-hue 2.6s linear infinite;
        }

        .crate-reveal {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: crate-reveal-in 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) both;
        }

        /* All reveal text stays above the rays/beam light effects. */
        .crate-reveal-chip,
        .crate-reveal-name,
        .crate-reveal-type,
        .crate-song-note,
        .crate-hype,
        .crate-reveal-actions,
        .crate-reveal-coins {
          position: relative;
          z-index: 2;
        }

        .crate-reveal-chip {
          margin-bottom: 1.1rem;
          padding: 0.3rem 0.8rem;
          border-radius: 999px;
          border: 1px solid var(--rc);
          background: var(--rc-soft);
          color: var(--rc);
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1.4px;
        }

        .crate-item-card {
          position: relative;
          z-index: 1;
          width: 210px;
          height: 210px;
          border-radius: 24px;
          overflow: hidden;
          border: 3px solid var(--rc);
          background: radial-gradient(circle at 30% 20%, var(--rc-glow), transparent 60%),
            #0e111a;
          box-shadow: 0 0 60px var(--rc-glow), 0 24px 60px rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crate-item-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .crate-item-fallback {
          font-size: 4rem;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.25);
        }

        .crate-reveal-name {
          margin-top: 1.1rem;
          font-size: 1.35rem;
          font-weight: 900;
          color: #fff;
          max-width: 100%;
        }

        .crate-reveal-type {
          margin-top: 0.3rem;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-muted, #94a3b8);
        }

        .crate-song-note {
          margin-top: 0.55rem;
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--rc);
        }

        .crate-hype {
          margin-top: 0.65rem;
          font-size: 1.25rem;
          font-weight: 900;
          color: #fff;
          text-shadow: 0 0 24px var(--rc-glow);
        }

        .crate-reveal-actions {
          margin-top: 1.4rem;
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .crate-btn {
          padding: 0.75rem 1.1rem;
          border-radius: 12px;
          border: none;
          font-weight: 900;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .crate-btn-primary {
          background: var(--blue, #0347f4);
          color: #fff;
        }

        .crate-btn-primary:disabled {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted, #94a3b8);
          cursor: not-allowed;
        }

        .crate-btn-secondary {
          background: transparent;
          border: 1px solid var(--border, rgba(255, 255, 255, 0.14));
          color: var(--text-muted, #94a3b8);
        }

        .crate-reveal-coins {
          margin-top: 0.9rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted, #94a3b8);
        }

        .crate-caption {
          margin-top: 1.6rem;
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--text-muted, #94a3b8);
          letter-spacing: 0.4px;
        }

        .crate-skip {
          margin-top: 1.2rem;
          background: transparent;
          border: 1px solid var(--border, rgba(255, 255, 255, 0.14));
          color: var(--text-muted, #94a3b8);
          border-radius: 999px;
          padding: "0.4rem 1rem";
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
        }

        .crate-mute {
          position: fixed;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.14));
          border-radius: 999px;
          width: 42px;
          height: 42px;
          font-size: 1.05rem;
          cursor: pointer;
          z-index: 2;
        }

        @keyframes crate-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes crate-screen-shake {
          0%,
          100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(3px, -2px);
          }
          50% {
            transform: translate(-3px, 2px);
          }
          75% {
            transform: translate(2px, 3px);
          }
        }

        @keyframes crate-shake {
          10%,
          90% {
            transform: translate(calc(var(--amp) * -1), 0) rotate(-2deg);
          }
          20%,
          80% {
            transform: translate(var(--amp), 0) rotate(2deg);
          }
          30%,
          50%,
          70% {
            transform: translate(calc(var(--amp) * -1), calc(var(--amp) * -0.6))
              rotate(-3deg);
          }
          40%,
          60% {
            transform: translate(var(--amp), calc(var(--amp) * 0.6)) rotate(3deg);
          }
        }

        @keyframes crate-shake-fast {
          0% {
            transform: translate(-2px, 1px) rotate(-1.5deg);
          }
          25% {
            transform: translate(2px, -1px) rotate(1.5deg);
          }
          50% {
            transform: translate(-2px, -1px) rotate(-1deg);
          }
          75% {
            transform: translate(2px, 1px) rotate(1deg);
          }
          100% {
            transform: translate(-1px, 0) rotate(-0.5deg);
          }
        }

        @keyframes crate-grow {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.14);
          }
        }

        @keyframes crate-explode {
          0% {
            transform: scale(1.14);
            opacity: 1;
            filter: brightness(1);
          }
          35% {
            transform: scale(1.3);
            opacity: 1;
            filter: brightness(2.2);
          }
          100% {
            transform: scale(1.75);
            opacity: 0;
            filter: brightness(3);
          }
        }

        @keyframes crate-glow-in {
          from {
            opacity: 0;
            transform: scale(0.7);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes crate-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes crate-rays-breathe {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 0.75;
          }
        }

        @keyframes crate-flash {
          0% {
            opacity: 0.95;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes crate-ring {
          0% {
            transform: scale(0.4);
            opacity: 0.9;
            border-width: 6px;
          }
          100% {
            transform: scale(4.2);
            opacity: 0;
            border-width: 1px;
          }
        }

        @keyframes crate-particle {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--p-dx), var(--p-dy)) scale(0.15);
            opacity: 0;
          }
        }

        @keyframes crate-confetti {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--p-dx), var(--p-dy)) rotate(540deg)
              scale(0.4);
            opacity: 0;
          }
        }

        @keyframes crate-beam {
          0% {
            opacity: 0;
            transform: translateX(-50%) scaleY(0.2);
          }
          30% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) scaleY(1);
          }
        }

        @keyframes crate-hue {
          to {
            filter: hue-rotate(360deg);
          }
        }

        @keyframes crate-reveal-in {
          from {
            transform: scale(0.5) translateY(24px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
