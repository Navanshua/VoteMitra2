import { useState, useRef, useEffect } from 'react';
import { getIdToken } from '../gcp/auth';
import { lookupPincode, saveProfile } from '../utils/pincode';
import { Send, Bot } from 'lucide-react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 p-3">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

export default function PincodeAgent({ user, onPersonalize }) {
  const [messages, setMessages] = useState([
    {
      role: 'mitra',
      content:
        'Namaste! 🙏 I\'m Mitra, your personal election guide. Share your 6-digit Pincode to personalize your dashboard.',
    },
  ]);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function addMessage(role, content) {
    setMessages((prev) => [...prev, { role, content }]);
  }

  async function sendToMitra(text) {
    setTyping(true);
    try {
      const token = await getIdToken();
      const resp = await fetch(`${BACKEND}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role === 'mitra' ? 'model' : 'user', content: m.content })),
        }),
      });
      const data = await resp.json();
      return data;
    } catch {
      return { reply: 'Sorry, I had trouble connecting. Please try again.' };
    } finally {
      setTyping(false);
    }
  }

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;

    addMessage('user', text);
    setInput('');

    // Check if it's a confirmation
    if (pendingData && /^(yes|confirm|ok|haan|ha|correct|right)/i.test(text)) {
      setTyping(true);
      try {
        const token = await getIdToken();
        await saveProfile(
          {
            pincode:    pendingData.pincode,
            district:   pendingData.district,
            state:      pendingData.state,
            block:      pendingData.block,
            ac_name:    pendingData.ac_name,
            language:   'en',
          },
          token
        );
        addMessage(
          'mitra',
          `✅ Perfect! Your dashboard for **${pendingData.district}, ${pendingData.state}** is ready. Loading now…`
        );
        setConfirmed(true);
        setTimeout(() => onPersonalize(pendingData), 1200);
      } catch {
        addMessage('mitra', 'Oops! Could not save your profile. Please try again.');
      } finally {
        setTyping(false);
      }
      return;
    }

    // Check if it's a 6-digit pincode
    const pincodeMatch = text.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      const pincode = pincodeMatch[0];
      setTyping(true);
      try {
        const data = await lookupPincode(pincode);
        setPendingData(data);
        addMessage(
          'mitra',
          `📍 Found it! Your location:\n\n**District:** ${data.district}\n**State:** ${data.state}\n**Constituency:** ${data.ac_name}\n\nIs this correct? Type **Yes** to confirm or share a different pincode.`
        );
      } catch (err) {
        addMessage('mitra', `❌ I couldn't find that pincode. ${err.message}. Please try a different one.`);
      } finally {
        setTyping(false);
      }
      return;
    }

    // General chat via Mitra
    const result = await sendToMitra(text);
    if (result.action === 'personalize' && result.pincode) {
      try {
        const data = await lookupPincode(result.pincode);
        setPendingData(data);
        addMessage(
          'mitra',
          `📍 I found your location:\n\n**District:** ${data.district}\n**State:** ${data.state}\n**Constituency:** ${data.ac_name}\n\nType **Yes** to confirm.`
        );
      } catch {
        addMessage('mitra', result.reply || 'Please share your pincode to continue.');
      }
    } else {
      addMessage('mitra', result.reply || 'Please share your 6-digit pincode to get started.');
    }
  }

  return (
    <div className="flex flex-col h-[500px] max-w-lg w-full mx-auto card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <div className="font-heading text-base font-semibold text-textPrimary">Mitra</div>
          <div className="text-xs text-textMuted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-secondary inline-block animate-pulse" />
            Online — Your Election Guide
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-navy/50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}
          >
            {msg.role === 'mitra' && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[78%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-tr-sm'
                  : 'bg-surface border border-border text-textPrimary rounded-tl-sm'
              }`}
              dangerouslySetInnerHTML={{
                __html: msg.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br/>'),
              }}
            />
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-surface border border-border rounded-2xl rounded-tl-sm">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!confirmed && (
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-4 py-3 border-t border-border bg-surface"
        >
          <input
            id="pincode-agent-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your pincode or ask anything…"
            className="input-base flex-1 px-3 py-2 text-sm"
            disabled={typing}
          />
          <button
            type="submit"
            id="pincode-agent-send"
            disabled={typing || !input.trim()}
            className="btn-primary p-2.5 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
