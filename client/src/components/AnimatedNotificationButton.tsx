import React from 'react';

export interface AnimatedNotificationButtonProps {
  channel: 'email' | 'whatsapp';
  status: 'sent' | 'failed' | 'skipped' | 'read' | 'delivered' | undefined;
  onClick: () => void;
  isProcessing: boolean;
  animState: 'idle' | 'filling' | 'rippling' | 'resolving' | 'completed';
}

export const AnimatedNotificationButton: React.FC<AnimatedNotificationButtonProps> = ({
  channel,
  status,
  onClick,
  isProcessing,
  animState
}) => {
  const isEmail = channel === 'email';
  const label = isEmail ? 'Email' : 'WhatsApp';
  const defaultIconClass = isEmail ? 'fa-solid fa-envelope' : 'fa-brands fa-whatsapp';

  const colors = isEmail 
    ? {
        border: '#85b7eb',
        bg: '#e6f1fb',
        text: '#0c447c',
        primary: '#2554E8',
        accentBorder: 'rgba(37, 84, 232, 0.3)',
        accentBg: 'rgba(37, 84, 232, 0.1)',
        iconColor: '#185fa5'
      }
    : {
        border: '#5dcaa5',
        bg: '#e1f5ee',
        text: '#0f6e56',
        primary: '#10B981',
        accentBorder: 'rgba(16, 185, 129, 0.3)',
        accentBg: 'rgba(16, 185, 129, 0.1)',
        iconColor: '#1D9E75'
      };

  const renderIconSvg = (iconKey: 'mail' | 'whatsapp' | 'check' | 'tickSingle' | 'tickDouble', color: string) => {
    const paths = {
      mail: <path d="M3 5h18v14H3z M3 6l9 7 9-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
      whatsapp: <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.27-1.38a9.9 9.9 0 0 0 4.77 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.13.82.83-3.05-.2-.31a8.18 8.18 0 0 1-1.26-4.36c0-4.53 3.69-8.22 8.23-8.22 4.53 0 8.22 3.69 8.22 8.22 0 4.53-3.69 8.22-8.2 8.22zm4.5-6.16c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.96-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.71-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.85.83-.85 2.03 0 1.2.87 2.35 1 2.51.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" fill="currentColor" />,
      check: <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
      tickSingle: <path d="M4 13l4 4L18 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
      tickDouble: <><path d="M2 13l4 4L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M8 13l4 4L22 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>
    };

    return (
      <svg className="w-4 h-4 shrink-0 transition-all" viewBox="0 0 24 24" style={{ color }}>
        {paths[iconKey]}
      </svg>
    );
  };

  const isAnimating = animState !== 'idle';
  const isFilling = animState === 'filling';
  const showRing = animState === 'filling';
  const showRipple = animState === 'rippling';
  const showResolvedIcon = animState === 'resolving' || animState === 'completed';

  // If not animating and status is sent/read/delivered/failed
  if (!isAnimating) {
    if (status === 'sent' || status === 'read' || status === 'delivered') {
      const isRead = status === 'read';
      const isDelivered = status === 'delivered';
      return (
        <div 
          className="w-8 h-8 flex items-center justify-center rounded-full border transition-all animate-in fade-in duration-300"
          style={{
            borderColor: colors.accentBorder,
            backgroundColor: colors.accentBg,
          }}
          title={`${label} ${status}`}
        >
          {isEmail ? (
            renderIconSvg('check', colors.text)
          ) : (
            renderIconSvg(
              isRead ? 'tickDouble' : (isDelivered ? 'tickDouble' : 'tickSingle'), 
              isRead ? '#34B7F1' : '#9aa0a6'
            )
          )}
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <button 
          onClick={onClick}
          disabled={isProcessing}
          className="w-8 h-8 flex items-center justify-center text-red-500 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-all cursor-pointer animate-pulse"
          title={`${label} failed — click to retry`}
        >
          <i className={`${defaultIconClass} text-xs`}></i>
        </button>
      );
    }
  }

  // Animating or idle (not sent/failed/skipped)
  let btnStyle: React.CSSProperties = {};
  if (showResolvedIcon) {
    btnStyle = {
      borderColor: colors.border,
      backgroundColor: colors.bg,
    };
  }

  return (
    <button
      onClick={onClick}
      disabled={isProcessing || isAnimating}
      className={`animated-send-btn ${isFilling ? 'is-filling' : ''} ${isEmail ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'} w-8 h-8 border rounded-full flex items-center justify-center transition-all disabled:opacity-100 cursor-pointer`}
      style={btnStyle}
      title={`Send ${label}`}
    >
      <svg className="send-progress-ring" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="16" stroke={colors.border} />
      </svg>

      {showRipple && (
        <span className="animated-send-ripple" style={{ color: colors.border }} />
      )}

      <span className="icon" style={{ 
        opacity: showRing ? 0 : 1,
        transform: showResolvedIcon ? 'scale(1)' : 'scale(1)',
        transition: showResolvedIcon ? 'transform 0.45s cubic-bezier(.34,1.56,.64,1)' : 'none'
      }}>
        {showResolvedIcon ? (
          renderIconSvg(isEmail ? 'check' : 'tickSingle', isEmail ? colors.text : '#9aa0a6')
        ) : (
          <i className={`${defaultIconClass} text-xs`}></i>
        )}
      </span>
    </button>
  );
};
