import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

function VoiceOrb({ color = "#1976d2", size = 32, glow = true }) {
  return (
    <span
      className="voice-orb-dribbble"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
    >
      <span className="orb-pulse orb-pulse1" style={{
        background: glow ? `radial-gradient(circle, ${color}55 60%, transparent 100%)` : color,
        borderColor: color,
      }} />
      <span className="orb-pulse orb-pulse2" style={{
        background: glow ? `radial-gradient(circle, ${color}33 60%, transparent 100%)` : color,
        borderColor: color,
      }} />
      <span className="orb-center" style={{
        background: color,
        boxShadow: glow ? `0 0 12px 2px ${color}88` : 'none',
      }} />
    </span>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const [playingIdx, setPlayingIdx] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Auto-scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-play audio for the latest AI message (only once)
  useEffect(() => {
    if (messages.length === 0) return;
    const lastIdx = messages.length - 1;
    const lastMsg = messages[lastIdx];
    if (
      lastMsg.sender === "ai" &&
      !lastMsg.autoPlayed
    ) {
      autoPlayAudio(lastMsg.text, lastIdx);
    }
    // eslint-disable-next-line
  }, [messages]);

  // Apply theme to body
  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Helper to auto-play and mark as played
  const autoPlayAudio = (text, idx) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      setPlayingIdx(idx);
      utterance.onend = () => setPlayingIdx(null);
      utterance.onerror = () => setPlayingIdx(null);
      window.speechSynthesis.speak(utterance);
      // Mark this message as auto-played
      setMessages((msgs) =>
        msgs.map((msg, i) =>
          i === idx ? { ...msg, autoPlayed: true } : msg
        )
      );
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setMessages((msgs) => [...msgs, { sender: "user", text: input }]);
    setLoading(true);
    setError(null);

    try {
      // 1. Get Gemini response
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(input);
      const aiText = result.response.text();

      // 2. Add AI text message (auto-play will trigger in useEffect)
      setMessages((msgs) => [
        ...msgs,
        { sender: "ai", text: aiText, autoPlayed: false }
      ]);
      setInput("");
    } catch (err) {
      setError("Failed to get advice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const speak = (text, idx) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      setPlayingIdx(idx);
      utterance.onend = () => setPlayingIdx(null);
      utterance.onerror = () => setPlayingIdx(null);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Sorry, your browser does not support speech synthesis.");
    }
  };

  return (
    <div className={`app-container${theme === 'dark' ? ' dark' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Advice GPT</h2>
        <button
          onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 22,
            cursor: 'pointer',
            color: theme === 'dark' ? '#ffd700' : '#333',
            outline: 'none',
            padding: 4,
            borderRadius: '50%',
            transition: 'background 0.2s',
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </div>
      <div className="chat-box">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-message ${msg.sender === "user" ? "user" : "ai"}`}
          >
            <div className="message-text" style={{ display: 'flex', alignItems: 'center' }}>
              {msg.sender === "ai" && playingIdx === idx && (
                <VoiceOrb color={theme === 'dark' ? "#ffd700" : "#1976d2"} size={32} />
              )}
              <span>{msg.text}</span>
              {msg.sender === "ai" && (
                <button
                  style={{ marginLeft: 8, fontSize: 16, cursor: "pointer" }}
                  onClick={() => speak(msg.text, idx)}
                  title="Play audio"
                  type="button"
                >
                  🔊
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="chat-message ai">Thinking...</div>}
        <div ref={chatEndRef} />
      </div>
      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
      <form className="input-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type your problem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              handleSend(e);
            }
          }}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#888" }}>
        Powered by Gemini
      </div>
    </div>
  );
}

export default App;