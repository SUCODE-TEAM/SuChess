import React from 'react';

/**
 * High-definition vector chess piece icons (Standard Staunton / Neo style)
 * Matches standard tournament & Chess.com presentation.
 */
export const ChessPiece = ({ type, color, size = '80%' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#FFFFFF' : '#1A1A1A';
  const stroke = isWhite ? '#1A1A1A' : '#FFFFFF';
  const strokeWidth = 1.5;

  const renderSvgContent = () => {
    switch (type.toLowerCase()) {
      case 'p': // Pawn
        return (
          <g>
            <path
              d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {isWhite && (
              <path
                d="M14 36c1.5-1 4.5-1.5 8-1.5s6.5.5 8 1.5"
                stroke={stroke}
                strokeWidth={strokeWidth}
                fill="none"
              />
            )}
          </g>
        );

      case 'n': // Knight
        return (
          <g>
            <path
              d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.163-.377-1.558.5-2.5 1.5-1.63 2-3.75 2.5-5.5.5-1.75 2.25-4 4.5-5 2.25-1 4.5-1 5.5 0z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.5-11.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z"
              fill={stroke}
            />
            {isWhite && (
              <path
                d="M15 35.5c2-1 6-1 8 0m-9 3c2.5-1 8-1 10.5 0"
                stroke={stroke}
                strokeWidth={strokeWidth}
                fill="none"
              />
            )}
          </g>
        );

      case 'b': // Bishop
        return (
          <g>
            <path
              d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d="M17.5 26h10M22.5 21v10"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </g>
        );

      case 'r': // Rook
        return (
          <g>
            <path
              d="M9 39h27v-3H9v3zm3.5-7l1.5-17.5h17l1.5 17.5h-20zm-2.5-21l1-3h3v2h4v-2h6v2h4v-2h3l1 3H10z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d="M14 29.5v-13h17v13H14z"
              fill={isWhite ? '#ffffff' : '#222222'}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d="M12 35.5h21"
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </g>
        );

      case 'q': // Queen
        return (
          <g>
            <path
              d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-4-14-4.5 14-4.5-14-4 14-7-11 2 12z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <circle cx="6" cy="12" r="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <circle cx="14" cy="9" r="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <circle cx="22.5" cy="8" r="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <circle cx="31" cy="9" r="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <circle cx="39" cy="12" r="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          </g>
        );

      case 'k': // King
        return (
          <g>
            <path
              d="M22.5 11.5V6M20 8h5"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d="M22.5 25c0-4 4.5-6.5 4.5-11 0-2.5-2-4.5-4.5-4.5s-4.5 2-4.5 4.5c0 4.5 4.5 7 4.5 11z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-6.5 6-16.5 6-10 0-12.5-7-16.5-6-3 6 6 10.5 6 10.5v7z"
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            <path
              d="M11.5 30c5.5-3 16.5-3 22 0m-21 3.5c5.5-3 16.5-3 22 0m-21 3.5c5.5-3 16.5-3 22 0"
              stroke={stroke}
              strokeWidth={strokeWidth}
              fill="none"
            />
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      style={{ display: 'block', margin: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
    >
      {renderSvgContent()}
    </svg>
  );
};
