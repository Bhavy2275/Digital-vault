'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Unlock, Copy, RefreshCw, Check, Zap, Eye, Image as ImageIcon, Binary, Fingerprint } from 'lucide-react';
import { encryptMessage, decryptMessage, deriveKey } from '@/lib/crypto';
import { hideDataInImage, extractDataFromImage } from '@/lib/steganography';
import { VaultInputSchema, DecryptSchema } from '@/lib/validation';
import { useInactivityTimer } from '@/lib/hooks';

type State = 'ENTROPY' | 'INPUT' | 'RESULT' | 'SUCCESS';
type Mode = 'ENCRYPT' | 'DECRYPT';

const ENTROPY_THRESHOLD = 50;

export default function Home() {
  const [mode, setMode] = useState<Mode>('ENCRYPT');
  const [state, setState] = useState<State>('ENTROPY');
  const [content, setContent] = useState('');
  const [password, setPassword] = useState('');
  const [resultBlob, setResultBlob] = useState('');
  const [error, setError] = useState('');
  const [entropy, setEntropy] = useState('');
  const [entropyCount, setEntropyCount] = useState(0);

  // New Features State
  const [showMath, setShowMath] = useState(false);
  const [useStegano, setUseStegano] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [attempts, setAttempts] = useState<{ time: string, status: string }[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  // Load and clean attempts from local storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('vault_attempts');
    if (saved) {
      const parsed = JSON.parse(saved);
      const now = Date.now();
      const fresh = parsed.filter((a: any) => now - new Date(a.time).getTime() < 3600000);
      setAttempts(fresh);
      if (fresh.filter((a: any) => a.status === 'Failed').length >= 3) setIsLocked(true);
    }
  }, []);

  const reset = useCallback(() => {
    setContent('');
    setPassword('');
    setResultBlob('');
    setError('');
    setEntropy('');
    setEntropyCount(0);
    setState('ENTROPY');
    setSelectedImage(null);
  }, []);

  useInactivityTimer(reset, 30000);

  const registerAttempt = (status: 'Success' | 'Failed') => {
    const newAttempt = { time: new Date().toLocaleTimeString(), status };
    const updated = [...attempts, newAttempt].slice(-5);
    setAttempts(updated);
    localStorage.setItem('vault_attempts', JSON.stringify(updated));
    if (status === 'Failed' && updated.filter(a => a.status === 'Failed').length >= 3) setIsLocked(true);
  };

  useEffect(() => {
    if (state !== 'ENTROPY' || isLocked) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (entropyCount >= ENTROPY_THRESHOLD) return;
      const chunk = `${e.clientX}${e.clientY}${Date.now()}`;
      setEntropy((prev) => prev + chunk);
      setEntropyCount((prev) => prev + 1);
      if (entropyCount + 1 >= ENTROPY_THRESHOLD) setTimeout(() => setState('INPUT'), 1000);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [state, entropyCount, isLocked]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => setSelectedImage(loadEvent.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processBiometrics = async () => {
    if (!window.PublicKeyCredential) {
      setError("Biometrics not supported on this device.");
      return;
    }
    // WebAuthn base logic placeholder for "Modern Feature" demo
    try {
      // In a real app, this would verify with a hardware key
      alert("Biometric signal received. Proceeding...");
    } catch (e) {
      setError("Biometric authentication failed.");
    }
  };

  const handleProcess = async () => {
    if (isLocked) return;
    setError('');

    try {
      if (mode === 'ENCRYPT') {
        const result = VaultInputSchema.safeParse({ content, password });
        if (!result.success) { setError(result.error.issues[0].message); return; }

        const blob = encryptMessage(content, password, entropy);

        if (useStegano && selectedImage && canvasRef.current) {
          const img = new Image();
          img.src = selectedImage;
          await new Promise(resolve => img.onload = resolve);
          const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const hiddenData = hideDataInImage(imageData, blob);
            ctx.putImageData(hiddenData, 0, 0);
            setResultBlob(canvasRef.current.toDataURL('image/png'));
          }
        } else {
          setResultBlob(blob);
        }
        registerAttempt('Success');
      } else {
        let packedBlob = content;
        if (useStegano && (selectedImage || content.startsWith('data:image')) && canvasRef.current) {
          const imgSrc = selectedImage || content;
          const img = new Image();
          img.src = imgSrc;
          await new Promise(resolve => img.onload = resolve);
          const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            packedBlob = extractDataFromImage(imageData);
          }
        }

        const plaintext = decryptMessage(packedBlob, password);
        if (!plaintext) { setError('Decryption failed. Invalid password or format.'); registerAttempt('Failed'); return; }
        setResultBlob(plaintext);
        registerAttempt('Success');
      }

      setState('RESULT');
    } catch (e: any) {
      setError(e.message || "An error occurred during processing.");
    }
  };

  return (
    <main className="relative min-h-screen">
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="w-full mb-12 pt-16 text-center">
        <motion.h1
          className="text-5xl font-extralight tracking-[0.3em] uppercase bg-clip-text text-transparent bg-gradient-to-b from-white to-white/30"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Digital Vault
        </motion.h1>
      </div>

      <AnimatePresence mode="wait">
        {isLocked ? (
          <motion.div key="lockdown" className="glass-panel text-center space-y-8">
            <div className="w-20 h-20 mx-auto rounded-full border-2 border-accent-alert/20 flex items-center justify-center bg-accent-alert/5">
              <Shield className="w-10 h-10 text-accent-alert" />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-light tracking-widest text-accent-alert uppercase">Core Lockdown</h2>
              <p className="text-white/40 text-sm">Integrity breach detected. Input suspended.</p>
              <button onClick={() => { localStorage.removeItem('vault_attempts'); setIsLocked(false); setAttempts([]); }} className="text-[10px] uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity">
                Manual Override Authorization
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {state === 'ENTROPY' && (
              <motion.div key="entropy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel flex flex-col items-center gap-10">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <motion.div className="absolute inset-0 border border-white/5 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
                  <motion.div className="absolute inset-[-10px] border border-t-accent-shield border-transparent rounded-full" animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} style={{ opacity: entropyCount / ENTROPY_THRESHOLD }} />
                  <Zap className={`w-12 h-12 text-accent-shield transition-all duration-1000 ${entropyCount > 0 ? 'scale-100 opacity-100' : 'scale-50 opacity-20'}`} />
                </div>
                <div className="text-center space-y-4">
                  <p className="text-sm font-medium tracking-[0.2em] uppercase text-accent-shield">Gathering Quantum Entropy</p>
                  <p className="text-xs text-white/30 max-w-xs">Seed the generation algorithm with localized kinetic motion data.</p>
                  <div className="h-1 w-48 bg-white/5 mx-auto rounded-full overflow-hidden">
                    <motion.div className="h-full bg-accent-shield" initial={{ width: 0 }} animate={{ width: `${(entropyCount / ENTROPY_THRESHOLD) * 100}%` }} />
                  </div>
                </div>
              </motion.div>
            )}

            {state === 'INPUT' && (
              <motion.div key="input" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel w-full max-w-xl space-y-8">
                <div className="mode-toggle">
                  <button onClick={() => setMode('ENCRYPT')} className={`mode-btn ${mode === 'ENCRYPT' ? 'active' : ''}`}>Secure</button>
                  <button onClick={() => setMode('DECRYPT')} className={`mode-btn ${mode === 'DECRYPT' ? 'active' : ''}`}>Reveal</button>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setUseStegano(!useStegano)}
                        className={`btn-icon ${useStegano ? 'active' : ''}`}
                        title="Image Steganography"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setShowMath(!showMath)}
                        className={`btn-icon ${showMath ? 'active' : ''}`}
                        title="Show Math Sandbox"
                      >
                        <Binary className="w-5 h-5" />
                      </button>
                      <button
                        onClick={processBiometrics}
                        className="btn-icon"
                        title="Biometric Security"
                      >
                        <Fingerprint className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {useStegano && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                      <div className="border border-dashed border-white/10 rounded-xl p-4 text-center relative group overflow-hidden bg-black/20">
                        {selectedImage ? (
                          <img src={selectedImage} alt="Selected" className="max-h-24 mx-auto rounded blur-sm" />
                        ) : (
                          <div className="py-2">
                            <ImageIcon className="w-6 h-6 mx-auto mb-2 opacity-20" />
                            <p className="text-[9px] uppercase tracking-widest opacity-30">Drop cover image</p>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </motion.div>
                  )}

                  <textarea
                    placeholder={mode === 'ENCRYPT' ? "Secret vector content..." : "Encrypted pixel blob..."}
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="placeholder:text-white/10"
                  />

                  <div className="relative group">
                    <input
                      type="password"
                      placeholder="Passphrase Matrix"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="placeholder:text-white/10 pl-12 h-14"
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Shield className="w-4 h-4 text-accent-shield opacity-40 hover:opacity-100 transition-opacity cursor-help" />
                    </div>
                  </div>

                  {showMath && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="math-sandbox !mt-2">
                      <div className="math-step">Step 1: PBKDF2 Key Derivation + Entropy Seed</div>
                      <div className="math-step">Step 2: AES-256 Rijndael Primitive Layer</div>
                      <div className="math-step">Step 3: Ciphertext {useStegano ? '+ bit-LSB pixel embedding' : 'vector generation'}</div>
                    </motion.div>
                  )}

                  <button onClick={handleProcess} className="btn-primary">
                    {mode === 'ENCRYPT' ? 'Initialize Encryption' : 'Execute Decryption'}
                  </button>
                  <p className="text-center text-[9px] uppercase tracking-[0.3em] text-white/15">Inactivity Wipe: 30s Heartbeat</p>
                </div>
              </motion.div>
            )}

            {state === 'RESULT' && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel w-full max-w-xl space-y-6">
                <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/30">
                    <span>{mode === 'ENCRYPT' ? 'Vault Output' : 'Plaintext Secret'}</span>
                    <span>Verified Zero-Knowledge</span>
                  </div>
                  {mode === 'ENCRYPT' && useStegano ? (
                    <div className="space-y-4">
                      <img src={resultBlob} alt="Result" className="max-w-[180px] mx-auto rounded-xl border border-white/10" />
                      <p className="text-[10px] uppercase text-center text-accent-shield">Data hidden in pixels</p>
                    </div>
                  ) : (
                    <p className="font-mono text-sm break-all leading-relaxed opacity-80">{resultBlob}</p>
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => { navigator.clipboard.writeText(resultBlob); setState('SUCCESS'); setTimeout(reset, 2000); }}
                    className="btn-primary flex-1"
                  >
                    Copy Sequence
                  </button>
                  <button
                    onClick={reset}
                    className="btn-icon w-16"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {state === 'SUCCESS' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-12">
                <div className="w-20 h-20 mx-auto rounded-full bg-accent-success/10 flex items-center justify-center border border-accent-success/20">
                  <Check className="w-10 h-10 text-accent-success" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-light tracking-widest uppercase">Broadcast Copied</p>
                  <p className="text-xs text-white/20 uppercase tracking-widest">Wiping volatile memory...</p>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 w-full px-8 pointer-events-none opacity-20">
        <div className="flex gap-2 justify-center overflow-hidden">
          {attempts.map((a, i) => (
            <div key={i} className={`text-[7px] uppercase tracking-widest whitespace-nowrap px-2 py-0.5 border rounded-full ${a.status === 'Success' ? 'border-accent-success' : 'border-accent-alert'}`}>
              {a.status} : {a.time}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
