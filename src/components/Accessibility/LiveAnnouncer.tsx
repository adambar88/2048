import React from 'react';

interface LiveAnnouncerProps {
  announcement: string;
}

export const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({ announcement }) => {
  return (
    <div
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {announcement}
    </div>
  );
};
