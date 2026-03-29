import React, { useEffect, useState, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../src/firebase/config';

const TAG_COLORS: Record<string, string> = {
  Beast: '#22c55e', Fire: '#ef4444', Weather: '#60a5fa',
  Leader: '#c9a227', Weapon: '#9ca3af', Land: '#854d0e',
  Wild: '#a855f7', Flood: '#0ea5e9', Army: '#6366f1',
  Artifact: '#d97706', Wizard: '#7c3aed', Undead: '#4a5568',
};

interface CardDef {
  id: string;
  name: string;
  tags: string[];
  baseValue: number;
  flavor?: string;
  rarity?: string;
  art?: string;
  scoringEffects?: { description: string; effectId: string; params: Record<string, unknown> }[];
}

interface CardArtState {
  card: CardDef;
  prompt: string;
  status: 'idle' | 'generating' | 'done' | 'error' | 'uploading' | 'uploaded';
  imageData?: string; // base64
  imageUrl?: string; // Firebase Storage URL
  error?: string;
}

/* ══════════════════════════════════════════
   Prompt Generator — creates an image prompt from card data
   ══════════════════════════════════════════ */
function generatePrompt(card: CardDef): string {
  const tag = card.tags[0] || 'Fantasy';
  const secondTag = card.tags[1] || '';

  // Base style
  const style = 'Fantasy card game illustration, digital painting, vibrant colors, detailed, dramatic lighting, no text, no letters, no words, no UI elements, centered subject, dark atmospheric background';

  // Tag-specific atmosphere + dominant color palette
  const tagAtmosphere: Record<string, string> = {
    Beast: 'wild creature, mythical beast, natural environment, primal energy. Dominant color palette: rich greens, earthy browns, and forest tones',
    Fire: 'flames, inferno, burning embers, orange and red glow, volcanic heat. Dominant color palette: fiery reds, deep oranges, bright yellows, and molten gold',
    Weather: 'storm clouds, atmospheric phenomenon, dramatic sky, wind and rain. Dominant color palette: electric blues, silver-gray clouds, and cool white lightning',
    Leader: 'regal figure, royal armor, commanding presence, throne room or battlefield. Dominant color palette: royal gold, deep amber, warm bronze, and rich crimson accents',
    Weapon: 'legendary weapon, magical glow, intricate craftsmanship, battle-ready. Dominant color palette: steel gray, silver metallic, cold blue edges, and iron tones',
    Land: 'epic landscape, ancient terrain, mystical geography, atmospheric depth. Dominant color palette: warm earthy browns, deep ochre, amber, and sandstone hues',
    Wild: 'chaotic energy, shapeshifting, magical aura, ethereal and mysterious. Dominant color palette: vibrant purples, mystical violet, magenta swirls, and iridescent highlights',
    Flood: 'rushing water, ocean waves, submerged ruins, blue-green depths. Dominant color palette: deep ocean blue, aqua cyan, turquoise, and sea-foam teal',
    Army: 'military formation, soldiers, banners, warfare, organized ranks. Dominant color palette: indigo blue, deep navy, royal purple, and steel blue armor',
    Artifact: 'magical object, glowing runes, ancient power, ornate treasure. Dominant color palette: warm amber, glowing gold, antique bronze, and honey-yellow magical light',
    Wizard: 'spellcaster, magical energy, arcane symbols, mystical robes. Dominant color palette: deep violet, arcane purple, midnight blue, and bright magical sparks',
    Undead: 'dark necromancy, skeletal, ghostly, eerie green glow, death magic. Dominant color palette: sickly gray-green, ghostly pale, dark charcoal, and toxic green accents',
  };

  // Card-specific subject
  const subject = card.name;
  const atmosphere = tagAtmosphere[tag] || 'fantasy, magical';
  const secondAtmo = secondTag && tagAtmosphere[secondTag] ? `, ${tagAtmosphere[secondTag]}` : '';

  // Use flavor text for additional context
  const flavorHint = card.flavor ? `, inspired by: "${card.flavor}"` : '';

  return `${style}. Subject: "${subject}", a ${tag.toLowerCase()}${secondTag ? `/${secondTag.toLowerCase()}` : ''} themed fantasy card. ${atmosphere}${secondAtmo}${flavorHint}. Square composition, painterly style.`;
}

const DEFAULT_GLOBAL_PREFIX = 'Generate a full illustration that fills the entire image. No borders, no frames, no card borders, no decorative edges. The artwork must extend to all edges of the image with no margins or padding.';

/* ══════════════════════════════════════════
   Main Page Component
   ══════════════════════════════════════════ */
export default function ArtGeneratorPage() {
  const [cards, setCards] = useState<CardDef[]>([]);
  const [artStates, setArtStates] = useState<Map<string, CardArtState>>(new Map());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [globalPrefix, setGlobalPrefix] = useState(DEFAULT_GLOBAL_PREFIX);
  const [filter, setFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const abortRef = useRef(false);
  const [provider, setProvider] = useState<'pollinations' | 'gemini'>(() => (localStorage.getItem('art_provider') as 'pollinations' | 'gemini') || 'pollinations');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gemini_api_key') ?? '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const switchProvider = useCallback((p: 'pollinations' | 'gemini') => {
    setProvider(p);
    localStorage.setItem('art_provider', p);
  }, []);

  const saveGeminiKey = useCallback((key: string) => {
    setGeminiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowKeyInput(false);
  }, []);

  // Load cards
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'gameData', 'cards'));
      if (snap.exists()) {
        const items = snap.data().items as CardDef[];
        setCards(items);
        const states = new Map<string, CardArtState>();
        for (const card of items) {
          states.set(card.id, {
            card,
            prompt: generatePrompt(card),
            status: 'idle',
          });
        }
        setArtStates(states);
      }
    })();
  }, []);

  // Check existing art — use card.art field first (already loaded), then Firestore as fallback
  useEffect(() => {
    if (cards.length === 0) return;
    const newStates = new Map(artStates);
    const missingIds: string[] = [];

    for (const card of cards) {
      const state = newStates.get(card.id);
      if (!state) continue;
      if (card.art && card.art.startsWith('http')) {
        // Card already has art URL from the cards data — instant, no Firestore fetch needed
        newStates.set(card.id, { ...state, status: 'uploaded', imageUrl: card.art });
      } else {
        missingIds.push(card.id);
      }
    }

    setArtStates(new Map(newStates));

    // For cards without art field, check Firestore cardArt collection (batch)
    if (missingIds.length > 0) {
      (async () => {
        const batchStates = new Map(newStates);
        for (const id of missingIds) {
          try {
            const artDoc = await getDoc(doc(db, 'cardArt', id));
            if (artDoc.exists()) {
              const data = artDoc.data();
              const url = data.url || data.dataUrl;
              const state = batchStates.get(id);
              if (state && url && !url.startsWith('data:')) {
                batchStates.set(id, { ...state, status: 'uploaded', imageUrl: url });
              }
            }
          } catch { /* ignore */ }
        }
        setArtStates(new Map(batchStates));
      })();
    }
  }, [cards.length]);

  const updateState = useCallback((id: string, update: Partial<CardArtState>) => {
    setArtStates(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(id);
      if (existing) newMap.set(id, { ...existing, ...update });
      return newMap;
    });
  }, []);

  // Generate via Pollinations (free, no key needed)
  const generateViaPollinations = useCallback(async (prompt: string): Promise<string> => {
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;

    // Retry on 429 with backoff
    let response: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await fetch(url);
      if (response.status !== 429) break;
      await new Promise(r => setTimeout(r, (attempt + 1) * 10_000));
    }

    if (!response || !response.ok) {
      throw new Error(`Pollinations ${response?.status}: ${response?.statusText}`);
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }, []);

  // Generate via Gemini (requires API key)
  const generateViaGemini = useCallback(async (prompt: string, id: string): Promise<string> => {
    if (!geminiKey) throw new Error('No Gemini API key — click "Set API Key" first');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    // Retry on 429 with backoff
    let response: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (response.status !== 429) break;
      const wait = (attempt + 1) * 15_000;
      updateState(id, { status: 'generating', error: `Rate limited, retrying in ${wait / 1000}s...` });
      await new Promise(r => setTimeout(r, wait));
    }

    if (!response || !response.ok) {
      const err = response ? await response.text() : 'No response';
      throw new Error(`API ${response?.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: Record<string, unknown>) => p.inlineData);
    if (!imagePart?.inlineData?.data) throw new Error('No image in response');
    return imagePart.inlineData.data;
  }, [geminiKey, updateState]);

  // Generate image for a single card (dispatches to active provider)
  const generateImage = useCallback(async (id: string) => {
    const state = artStates.get(id);
    if (!state) return;

    updateState(id, { status: 'generating', error: undefined });

    try {
      const fullPrompt = globalPrefix ? `${globalPrefix}\n\n${state.prompt}` : state.prompt;
      const imageData = provider === 'pollinations'
        ? await generateViaPollinations(fullPrompt)
        : await generateViaGemini(fullPrompt, id);

      updateState(id, { status: 'done', imageData });
    } catch (err: unknown) {
      updateState(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [artStates, updateState, globalPrefix, provider, generateViaPollinations, generateViaGemini]);

  // Upload image to Firebase Storage
  const uploadImage = useCallback(async (id: string) => {
    const state = artStates.get(id);
    if (!state?.imageData) return;

    updateState(id, { status: 'uploading' });

    try {
      // Convert base64 to blob
      const byteString = atob(state.imageData);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/png' });

      const storage = getStorage();
      const storageRef = ref(storage, `card-art/${id}.png`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      // Save the URL reference in Firestore cardArt collection
      await setDoc(doc(db, 'cardArt', id), {
        url,
        updatedAt: new Date().toISOString(),
      });

      // Also update the card's art field in the cards collection
      try {
        const cardsDoc = await getDoc(doc(db, 'gameData', 'cards'));
        if (cardsDoc.exists()) {
          const items = cardsDoc.data().items as Record<string, unknown>[];
          const updated = items.map(c => (c as { id: string }).id === id ? { ...c, art: url } : c);
          await setDoc(doc(db, 'gameData', 'cards'), { items: updated });
        }
      } catch (e) {
        console.warn('Failed to update card art field:', e);
      }

      // Clear the art URL cache so the game picks up new art on next boot
      try { localStorage.removeItem('fr_card_art_urls'); } catch { /* ignore */ }

      updateState(id, { status: 'uploaded', imageUrl: url });
    } catch (err: unknown) {
      updateState(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }, [artStates, updateState]);

  // Generate all selected (batch: generate + auto-upload)
  const generateSelected = useCallback(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;

    setIsGenerating(true);
    abortRef.current = false;
    setProgress({ done: 0, total: ids.length });

    for (let i = 0; i < ids.length; i++) {
      if (abortRef.current) break;

      // Generate
      await generateImage(ids[i]);
      setProgress({ done: i + 1, total: ids.length });

      // Auto-upload if generation succeeded
      const state = artStates.get(ids[i]);
      if (state?.imageData) {
        try {
          await uploadImage(ids[i]);
        } catch {
          // Upload failed (CORS?), keep as generated
        }
      }

      // Rate limit: wait 10s between requests (free tier is ~2-10 RPM for image gen)
      if (i < ids.length - 1) await new Promise(r => setTimeout(r, 10_000));
    }

    setIsGenerating(false);
  }, [selected, generateImage, uploadImage, artStates]);

  // Generate all missing art (cards without uploaded art)
  const generateMissing = useCallback(async () => {
    const missingIds = [...artStates.entries()]
      .filter(([, s]) => s.status !== 'uploaded')
      .map(([id]) => id);

    if (missingIds.length === 0) return;

    setSelected(new Set(missingIds));
    setIsGenerating(true);
    abortRef.current = false;
    setProgress({ done: 0, total: missingIds.length });

    for (let i = 0; i < missingIds.length; i++) {
      if (abortRef.current) break;
      await generateImage(missingIds[i]);
      setProgress({ done: i + 1, total: missingIds.length });

      // Auto-upload after generation
      const state = artStates.get(missingIds[i]);
      if (state?.imageData) {
        try { await uploadImage(missingIds[i]); } catch { /* ignore */ }
      }

      if (i < missingIds.length - 1) await new Promise(r => setTimeout(r, 3000));
    }

    setIsGenerating(false);
  }, [artStates, generateImage, uploadImage]);

  // Upload all generated
  const uploadAllGenerated = useCallback(async () => {
    const generated = [...artStates.entries()]
      .filter(([, s]) => s.status === 'done' && s.imageData)
      .map(([id]) => id);

    for (const id of generated) {
      await uploadImage(id);
      await new Promise(r => setTimeout(r, 500));
    }
  }, [artStates, uploadImage]);

  // Download single image as file
  const downloadImage = useCallback((id: string) => {
    const state = artStates.get(id);
    if (!state?.imageData) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${state.imageData}`;
    link.download = `${id}.png`;
    link.click();
  }, [artStates]);

  // Download all generated as individual files
  const downloadAllGenerated = useCallback(() => {
    const generated = [...artStates.entries()]
      .filter(([, s]) => s.status === 'done' && s.imageData);

    generated.forEach(([id], i) => {
      setTimeout(() => downloadImage(id), i * 200);
    });
  }, [artStates, downloadImage]);

  // Filter cards
  const filteredCards = cards.filter(card => {
    const state = artStates.get(card.id);
    if (filter === 'missing' && state?.status === 'uploaded') return false;
    if (filter === 'generated' && state?.status !== 'done') return false;
    if (filter === 'uploaded' && state?.status !== 'uploaded') return false;
    if (tagFilter && !card.tags.includes(tagFilter)) return false;
    if (searchQuery && !card.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const selectAll = () => setSelected(new Set(filteredCards.map(c => c.id)));
  const selectNone = () => setSelected(new Set());
  const selectMissing = () => {
    const missing = filteredCards.filter(c => {
      const s = artStates.get(c.id);
      return !s || s.status === 'idle' || s.status === 'error';
    });
    setSelected(new Set(missing.map(c => c.id)));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generatedCount = [...artStates.values()].filter(s => s.status === 'done').length;
  const uploadedCount = [...artStates.values()].filter(s => s.status === 'uploaded').length;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>🎨 Art Generator</h2>
        <div style={{ display: 'flex', gap: 2, background: '#e5e7eb', borderRadius: 6, padding: 2 }}>
          {(['pollinations', 'gemini'] as const).map(p => (
            <button
              key={p}
              onClick={() => switchProvider(p)}
              style={{
                padding: '3px 10px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer',
                background: provider === p ? '#fff' : 'transparent',
                color: provider === p ? '#111' : '#888',
                boxShadow: provider === p ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >{p === 'pollinations' ? '🌸 Pollinations (Free)' : '✨ Gemini'}</button>
          ))}
        </div>
        {provider === 'gemini' && (
          geminiKey && !showKeyInput ? (
            <span
              style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => setShowKeyInput(true)}
              title="Click to change API key"
            >✓ API Key Set</span>
          ) : (
            <form style={{ display: 'flex', alignItems: 'center', gap: 6 }} onSubmit={e => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input') as HTMLInputElement;
              if (input.value.trim()) saveGeminiKey(input.value.trim());
            }}>
              <input
                type="password"
                placeholder="Gemini API Key"
                defaultValue={geminiKey}
                style={{ padding: '3px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, width: 220 }}
                autoFocus
              />
              <button type="submit" style={{ padding: '3px 10px', fontSize: 12, background: '#4285F4', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save</button>
              {geminiKey && <button type="button" onClick={() => setShowKeyInput(false)} style={{ padding: '3px 8px', fontSize: 12, background: '#e5e7eb', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>}
            </form>
          )
        )}
      </div>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
        Generate card artwork using {provider === 'pollinations' ? 'Pollinations AI (FLUX, free & unlimited)' : 'Gemini AI'}. Select cards, review prompts, generate images, then upload to Firebase Storage.
      </p>

      {/* Global prompt prefix */}
      <div style={{ marginBottom: 16, background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Global Prompt Prefix</label>
          <span style={{ fontSize: 10, color: '#999' }}>Added to all generation prompts</span>
          <button
            style={{ marginLeft: 'auto', fontSize: 10, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setGlobalPrefix(DEFAULT_GLOBAL_PREFIX)}
          >
            Reset to default
          </button>
        </div>
        <textarea
          style={{
            width: '100%', minHeight: 50, padding: 8, border: '1px solid #d1d5db',
            borderRadius: 6, fontSize: 12, fontFamily: 'monospace', resize: 'vertical',
          }}
          value={globalPrefix}
          onChange={e => setGlobalPrefix(e.target.value)}
        />
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Stat label="Total Cards" value={cards.length} color="#333" />
        <Stat label="With Art" value={uploadedCount} color="#22c55e" />
        <Stat label="Generated" value={generatedCount} color="#3b82f6" />
        <Stat label="Missing" value={cards.length - uploadedCount} color="#ef4444" />
        <Stat label="Selected" value={selected.size} color="#a855f7" />
      </div>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <input
          style={S.searchInput}
          placeholder="Search cards..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select style={S.select} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="missing">Missing Art</option>
          <option value="generated">Generated (not uploaded)</option>
          <option value="uploaded">Uploaded</option>
        </select>
        <select style={S.select} value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
          <option value="">All Tags</option>
          {Object.keys(TAG_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button style={S.btnSmall} onClick={selectAll}>Select All ({filteredCards.length})</button>
        <button style={S.btnSmall} onClick={selectMissing}>Select Missing</button>
        <button style={S.btnSmall} onClick={selectNone}>Deselect All</button>
      </div>

      {/* Action bar */}
      <div style={S.actionBar}>
        <button
          style={{ ...S.btn, background: isGenerating ? '#9ca3af' : '#7c3aed' }}
          onClick={isGenerating ? () => { abortRef.current = true; } : generateSelected}
          disabled={selected.size === 0 && !isGenerating}
        >
          {isGenerating ? `⏸ Stop (${progress.done}/${progress.total})` : `🎨 Generate ${selected.size} Selected`}
        </button>
        <button
          style={{ ...S.btn, background: '#ef4444' }}
          onClick={generateMissing}
          disabled={isGenerating || (cards.length - uploadedCount) === 0}
        >
          🎨 Generate All Missing ({cards.length - uploadedCount})
        </button>
        <button
          style={{ ...S.btn, background: '#22c55e' }}
          onClick={uploadAllGenerated}
          disabled={generatedCount === 0}
        >
          ☁️ Upload {generatedCount} Generated
        </button>
        <button
          style={{ ...S.btn, background: '#3b82f6' }}
          onClick={downloadAllGenerated}
          disabled={generatedCount === 0}
        >
          💾 Download {generatedCount} Generated
        </button>
      </div>

      {/* Progress bar */}
      {isGenerating && (
        <div style={S.progressBar}>
          <div style={{ ...S.progressFill, width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      )}

      {/* Card grid */}
      <div style={S.grid}>
        {filteredCards.map(card => {
          const state = artStates.get(card.id);
          if (!state) return null;
          return (
            <ArtCard
              key={card.id}
              state={state}
              isSelected={selected.has(card.id)}
              onToggle={() => toggleSelect(card.id)}
              onGenerate={() => generateImage(card.id)}
              onUpload={() => uploadImage(card.id)}
              onDownload={() => downloadImage(card.id)}
              onPromptChange={(p) => updateState(card.id, { prompt: p })}
              onRegenPrompt={() => updateState(card.id, { prompt: generatePrompt(card) })}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Individual Card Art Component
   ══════════════════════════════════════════ */
function ArtCard({
  state, isSelected, onToggle, onGenerate, onUpload, onDownload, onPromptChange, onRegenPrompt,
}: {
  state: CardArtState;
  isSelected: boolean;
  onToggle: () => void;
  onGenerate: () => void;
  onUpload: () => void;
  onDownload: () => void;
  onPromptChange: (p: string) => void;
  onRegenPrompt: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const { card } = state;
  const tagColor = TAG_COLORS[card.tags[0]] || '#666';

  const statusBadge = {
    idle: { text: 'No Art', bg: '#f3f4f6', color: '#666' },
    generating: { text: 'Generating...', bg: '#dbeafe', color: '#2563eb' },
    done: { text: 'Generated ✓', bg: '#dcfce7', color: '#16a34a' },
    error: { text: 'Error', bg: '#fee2e2', color: '#dc2626' },
    uploading: { text: 'Uploading...', bg: '#fef3c7', color: '#d97706' },
    uploaded: { text: 'Uploaded ✓', bg: '#d1fae5', color: '#059669' },
  }[state.status];

  const imageSrc = state.imageData
    ? `data:image/png;base64,${state.imageData}`
    : state.imageUrl || null;

  return (
    <div style={{
      ...S.card,
      borderColor: isSelected ? '#7c3aed' : '#e5e7eb',
      boxShadow: isSelected ? '0 0 0 2px #7c3aed40' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <input type="checkbox" checked={isSelected} onChange={onToggle} />
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: tagColor, flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.name}
        </span>
        <span style={{
          fontSize: 9, padding: '1px 6px', borderRadius: 8,
          background: statusBadge.bg, color: statusBadge.color,
          fontWeight: 600,
        }}>
          {statusBadge.text}
        </span>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
        {card.tags.map(t => (
          <span key={t} style={{
            fontSize: 9, padding: '0 5px', borderRadius: 4,
            background: TAG_COLORS[t] || '#ccc', color: '#fff',
            fontWeight: 600,
          }}>
            {t}
          </span>
        ))}
        <span style={{ fontSize: 9, color: '#999' }}>Value: {card.baseValue}</span>
        {card.rarity && (
          <span style={{
            fontSize: 9, padding: '0 5px', borderRadius: 4,
            background: card.rarity === 'epic' ? '#f59e0b' : card.rarity === 'rare' ? '#3b82f6' : card.rarity === 'common' ? '#22c55e' : '#9ca3af',
            color: '#fff', fontWeight: 600,
          }}>
            {card.rarity}
          </span>
        )}
      </div>

      {/* Image preview */}
      <div style={S.imageContainer}>
        {imageSrc ? (
          <img src={imageSrc} alt={card.name} style={S.image} />
        ) : (
          <div style={S.imagePlaceholder}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>🎨</span>
          </div>
        )}
        {state.status === 'generating' && (
          <div style={S.loadingOverlay}>
            <div style={S.spinner} />
          </div>
        )}
      </div>

      {/* Error message */}
      {state.error && (
        <div style={{ fontSize: 10, color: '#dc2626', background: '#fee2e2', padding: 4, borderRadius: 4, marginTop: 4 }}>
          {state.error}
        </div>
      )}

      {/* Prompt toggle */}
      <button
        style={{ ...S.btnTiny, marginTop: 6, width: '100%' }}
        onClick={() => setShowPrompt(!showPrompt)}
      >
        {showPrompt ? '▲ Hide Prompt' : '▼ Edit Prompt'}
      </button>

      {showPrompt && (
        <div style={{ marginTop: 4 }}>
          <textarea
            style={S.promptTextarea}
            value={state.prompt}
            onChange={e => onPromptChange(e.target.value)}
            rows={4}
          />
          <button style={S.btnTiny} onClick={onRegenPrompt}>🔄 Reset Prompt</button>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <button
          style={{ ...S.btnAction, background: '#7c3aed', flex: 1 }}
          onClick={onGenerate}
          disabled={state.status === 'generating'}
        >
          {state.status === 'generating' ? '...' : '🎨 Generate'}
        </button>
        {state.imageData && (
          <>
            <button
              style={{ ...S.btnAction, background: '#3b82f6' }}
              onClick={onDownload}
              title="Download image"
            >
              💾
            </button>
            {state.status !== 'uploaded' && (
              <button
                style={{ ...S.btnAction, background: '#22c55e', flex: 1 }}
                onClick={onUpload}
                disabled={state.status === 'uploading'}
              >
                ☁️ Upload
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Stat Badge
   ══════════════════════════════════════════ */
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '6px 14px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#888' }}>{label}</div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Styles
   ══════════════════════════════════════════ */
const S: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center',
  },
  searchInput: {
    padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 13, width: 200, outline: 'none',
  },
  select: {
    padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 12, outline: 'none', background: '#fff',
  },
  btnSmall: {
    padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 11, cursor: 'pointer', background: '#f9fafb', fontWeight: 600,
  },
  actionBar: {
    display: 'flex', gap: 8, marginBottom: 12,
  },
  btn: {
    padding: '8px 16px', border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  progressBar: {
    height: 4, background: '#e5e7eb', borderRadius: 2, marginBottom: 12, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: '#7c3aed', borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  card: {
    background: '#fff', border: '2px solid #e5e7eb', borderRadius: 10,
    padding: 10, transition: 'all 0.15s',
  },
  imageContainer: {
    width: '100%', aspectRatio: '1', borderRadius: 6, overflow: 'hidden',
    background: '#f3f4f6', position: 'relative' as const,
  },
  image: {
    width: '100%', height: '100%', objectFit: 'cover' as const,
  },
  imagePlaceholder: {
    width: '100%', height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingOverlay: {
    position: 'absolute' as const, inset: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  spinner: {
    width: 30, height: 30, border: '3px solid #fff',
    borderTopColor: '#7c3aed', borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  promptTextarea: {
    width: '100%', padding: 6, border: '1px solid #d1d5db',
    borderRadius: 4, fontSize: 10, lineHeight: 1.4,
    resize: 'vertical' as const, outline: 'none', fontFamily: 'monospace',
  },
  btnTiny: {
    padding: '3px 8px', border: '1px solid #ddd', borderRadius: 4,
    fontSize: 10, cursor: 'pointer', background: '#f9fafb',
  },
  btnAction: {
    padding: '5px 8px', border: 'none', borderRadius: 6,
    color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
};
