import { useEffect, useRef, useState } from 'react';
import { Send, Users, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { PageLoader, Spinner } from '../components/Spinner';
import { formatDateTime } from '../utils/format';

export default function GroupChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const load = async (initial = false) => {
    try {
      const { data } = await api.get('/chat/messages?limit=100');
      setMessages(data.data.messages);
      if (initial) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 0);
    } catch (err) {
      if (initial) setError(apiError(err));
    }
  };

  useEffect(() => {
    load(true);
    const timer = setInterval(() => load(), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (messages?.length) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post('/chat/messages', { body: text });
      setMessages((items) => [...(items || []), data.data.message]);
      setBody('');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const removeMessage = async (message) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await api.delete(`/chat/messages/${message.id}`);
      setMessages((items) => items.filter((item) => item.id !== message.id));
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!messages) return <PageLoader label="Loading group chat…" />;

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Users className="h-6 w-6 text-primary-600" /> Group Chat
        </h1>
        <p className="mt-1 text-sm text-slate-500">Chat with everyone in the Growth Circle community.</p>
      </div>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No messages yet. Start the conversation!</p>
          ) : messages.map((message) => {
            const mine = message.author?.id === user?.id;
            return (
              <div key={message.id} className={`flex items-end gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                <Avatar user={message.author} size="sm" />
                <div className={`max-w-[80%] ${mine ? 'items-end' : ''}`}>
                  <p className={`mb-1 text-xs text-slate-400 ${mine ? 'text-right' : ''}`}>
                    {mine ? 'You' : message.author?.name} · {formatDateTime(message.createdAt)}
                  </p>
                  <p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
                    mine ? 'rounded-br-md bg-primary-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-700'
                  }`}>{message.body}</p>
                  {(mine || user?.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => removeMessage(message)}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"
                      aria-label="Delete message"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-4">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message…"
            maxLength={2000}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <button type="submit" disabled={busy || !body.trim()} className="btn-primary !px-4" aria-label="Send message">
            {busy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
