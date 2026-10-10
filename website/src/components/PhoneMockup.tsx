import { AppPreview } from './AppPreview';
import './PhoneMockup.css';
import { useEffect, useState } from 'react';

const LIVE_EVENTS = [
  { eyebrow: 'Just now', title: 'Bill saved', detail: '₹450 · UPI', tone: 'success' },
  { eyebrow: 'Inventory', title: 'Stock updated', detail: 'Maggi · 8 left', tone: 'warning' },
  { eyebrow: 'Offline ready', title: 'Selling without internet', detail: 'Syncs automatically', tone: 'purple' },
] as const;

export function PhoneMockup() {
  const [eventIndex, setEventIndex] = useState(0);
  const event = LIVE_EVENTS[eventIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setEventIndex((current) => (current + 1) % LIVE_EVENTS.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="phone-stage">
      <div className={`live-event live-event-${event.tone}`} key={event.title}>
        <span className="live-event-dot" />
        <span className="live-event-copy">
          <small>{event.eyebrow}</small>
          <strong>{event.title}</strong>
          <em>{event.detail}</em>
        </span>
      </div>
      <div className="phone-device">
        <div className="phone-notch" />
        <div className="phone-screen">
          <AppPreview />
        </div>
        <div className="phone-home" />
      </div>
      <div className="phone-caption">
        <span className="live-pulse" />
        <p>Live store preview</p>
        <small>Tap the tabs to explore</small>
      </div>
    </div>
  );
}
