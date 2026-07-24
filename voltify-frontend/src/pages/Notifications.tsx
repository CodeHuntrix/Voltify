import { useState, useEffect } from 'react';
import { Bell, Flame, Coins, ShieldAlert, CheckCircle, Info, Zap } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../lib/mockData';
import GlassCard from '../components/ui/GlassCard';

function ClientTime({ dateStr }: { dateStr: string }) {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    setTimeString(
      new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, [dateStr]);

  return <span className="text-[10px] font-mono text-outline">{timeString}</span>;
}

export default function Notifications() {
  const [list, setList] = useState(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-8 font-headline">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-semibold text-3xl tracking-tight text-gradient">🔔 NOTIFICATIONS & ALERTS</h1>
          <p className="text-sm text-on-surface-variant">Review historical savings warnings and active saving milestones</p>
        </div>
        <button
          onClick={markAllRead}
          className="border border-outline-variant text-on-surface hover:text-primary px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold transition-all"
        >
          Mark All as Read
        </button>
      </div>

      <div className="max-w-3xl space-y-4">
        {list.map((n) => {
          return (
            <GlassCard
              key={n.id}
              className={`p-5 transition-all duration-300 ${
                n.read ? 'opacity-70 hover:opacity-90' : 'border-primary/30 shadow-md'
              }`}
            >
              <div className="flex gap-4 items-start text-xs">
                <div className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  n.type === 'bill_alert'
                    ? 'bg-rose-500/10 text-rose-400'
                    : n.type === 'streak'
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-primary-container/20 text-primary-container'
                }`}>
                  <Zap className="size-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-on-surface">{n.title}</h3>
                    <ClientTime dateStr={n.created_at} />
                  </div>
                  <p className="text-on-surface-variant text-xs font-sans leading-relaxed">{n.message}</p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
export { Notifications };
