/**
 * Restaurant audio alert synthesizers using native Web Audio API.
 * 100% offline, 0ms latency, zero external network dependency.
 */

class SoundAlerts {
    private ctx: AudioContext | null = null;

    private getContext(): AudioContext | null {
        if (typeof window === "undefined") return null;
        try {
            if (!this.ctx || this.ctx.state === "closed") {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === "suspended") {
                this.ctx.resume().catch(() => {});
            }
            return this.ctx;
        } catch {
            return null;
        }
    }

    /**
     * Kitchen comanda bell chime (Ding-Dong 880Hz -> 587Hz)
     */
    playKitchenChime() {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;

            // Tone 1: High crisp ding (880Hz - A5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(880, now);
            gain1.gain.setValueAtTime(0.35, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.6);

            // Tone 2: Warm harmonious dong (587.33Hz - D5)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(587.33, now + 0.18);
            gain2.gain.setValueAtTime(0.4, now + 0.18);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.18);
            osc2.stop(now + 1.2);
        } catch (e) {
            console.warn("SoundAlerts.playKitchenChime failed:", e);
        }
    }

    /**
     * Web order alert (Upbeat tri-tone: C5 523Hz -> E5 659Hz -> G5 784Hz)
     */
    playOrderAlert() {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            
            notes.forEach((freq, idx) => {
                const noteTime = now + idx * 0.12;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, noteTime);
                gain.gain.setValueAtTime(0.25, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteTime);
                osc.stop(noteTime + 0.35);
            });
        } catch (e) {
            console.warn("SoundAlerts.playOrderAlert failed:", e);
        }
    }

    /**
     * Warning / Low-stock alert (Two warning pulses: 440Hz -> 370Hz)
     */
    playWarningAlert() {
        const ctx = this.getContext();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            [440, 370].forEach((freq, idx) => {
                const pulseTime = now + idx * 0.2;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(freq, pulseTime);
                gain.gain.setValueAtTime(0.18, pulseTime);
                gain.gain.exponentialRampToValueAtTime(0.001, pulseTime + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(pulseTime);
                osc.stop(pulseTime + 0.18);
            });
        } catch (e) {
            console.warn("SoundAlerts.playWarningAlert failed:", e);
        }
    }
}

export const soundAlerts = new SoundAlerts();
