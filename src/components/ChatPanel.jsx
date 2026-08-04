import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Bot, Sparkles, Smile } from 'lucide-react';

const QUICK_EMOJIS = ['👍', '🔥', '👏', '😂', '🤔', '🏆', '🎯'];

export default function ChatPanel({ messages, onSendMessage, activePlayerName }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickEmoji = (emoji) => {
    onSendMessage(emoji);
  };

  return (
    <div className="chat-panel-container">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-title">
          <MessageSquare size={18} color="var(--accent-cyan)" />
          <span>Sohbet ve Oyun Günlüğü</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="chat-messages-area">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="chat-msg msg-system">
                <Sparkles size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                {msg.text}
              </div>
            );
          }

          const isMe = msg.sender === activePlayerName;
          return (
            <div key={msg.id} className={`chat-msg ${isMe ? 'msg-me' : 'msg-other'}`}>
              <div className="msg-sender">
                <span>{msg.avatar || (msg.isBot ? '🤖' : '👤')}</span>
                <span>{msg.sender}</span>
                {msg.isBot && <Bot size={12} color="var(--accent-blue)" />}
              </div>
              <div className="msg-bubble">
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form & Emojis */}
      <div className="chat-input-area">
        <div className="quick-emojis">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className="emoji-btn"
              onClick={() => handleQuickEmoji(emoji)}
              title="Hızlı Tepki Gönder"
            >
              {emoji}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            className="chat-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Mesaj yazın..."
            maxLength={120}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0.55rem 0.85rem' }}
            disabled={!inputText.trim()}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
