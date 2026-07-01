"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";

const MOBILE_EDGE_INSET_PX = 20;
const MAX_BOARD_WIDTH_PX = 560;

type BoardOrientation = "white" | "black";
type PlayerColor = "w" | "b";

interface CodexChessboardProps {
  position: string;
  boardOrientation?: BoardOrientation;
  arePiecesDraggable?: boolean;
  playerColor?: PlayerColor;
  onPieceDrop: (sourceSquare: string, targetSquare: string) => boolean;
}

function useBoardWidth(frameRef: React.RefObject<HTMLDivElement | null>) {
  const [boardWidth, setBoardWidth] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const update = () => {
      const width = Math.floor(frame.clientWidth);
      setBoardWidth(width > 0 ? Math.min(width, MAX_BOARD_WIDTH_PX) : 0);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frameRef]);

  return boardWidth;
}

function useMobileChessInput() {
  const [mobileInput, setMobileInput] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const narrow = window.matchMedia("(max-width: 767px)");
    const update = () => setMobileInput(coarse.matches || narrow.matches);
    update();
    coarse.addEventListener("change", update);
    narrow.addEventListener("change", update);
    return () => {
      coarse.removeEventListener("change", update);
      narrow.removeEventListener("change", update);
    };
  }, []);

  return mobileInput;
}

function buildSquareHighlights(
  fen: string,
  selectedSquare: string | null
): Record<string, Record<string, string | number>> {
  if (!selectedSquare) return {};

  const styles: Record<string, Record<string, string | number>> = {
    [selectedSquare]: {
      boxShadow: "inset 0 0 0 3px var(--color-accent)",
    },
  };

  const chess = new Chess(fen);
  const moves = chess.moves({ square: selectedSquare as Square, verbose: true });
  for (const move of moves) {
    const target = move.to;
    const occupied = Boolean(move.captured);
    styles[target] = occupied
      ? { boxShadow: "inset 0 0 0 4px rgba(234, 179, 8, 0.75)" }
      : {
          backgroundImage:
            "radial-gradient(circle, rgba(0, 0, 0, 0.18) 18%, transparent 19%)",
          backgroundSize: "100% 100%",
        };
  }

  return styles;
}

export function CodexChessboard({
  position,
  boardOrientation = "white",
  arePiecesDraggable = false,
  playerColor,
  onPieceDrop,
}: CodexChessboardProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const boardWidth = useBoardWidth(frameRef);
  const mobileInput = useMobileChessInput();
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const tapToMoveEnabled = arePiecesDraggable && Boolean(playerColor) && mobileInput;

  useEffect(() => {
    setSelectedSquare(null);
  }, [position, arePiecesDraggable]);

  const customSquareStyles = useMemo(
    () => (tapToMoveEnabled ? buildSquareHighlights(position, selectedSquare) : {}),
    [position, selectedSquare, tapToMoveEnabled]
  );

  const handleSquareClick = useCallback(
    (square: string, piece: string | undefined) => {
      if (!tapToMoveEnabled || !playerColor) return;

      const chess = new Chess(position);
      if (chess.turn() !== playerColor) return;

      if (!selectedSquare) {
        if (piece?.[0] === playerColor) {
          const moves = chess.moves({ square: square as Square, verbose: true });
          if (moves.length > 0) setSelectedSquare(square);
        }
        return;
      }

      if (square === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      const trial = new Chess(position);
      const move = trial.move({
        from: selectedSquare as Square,
        to: square as Square,
        promotion: "q",
      });
      if (move) {
        const accepted = onPieceDrop(selectedSquare, square);
        if (accepted) setSelectedSquare(null);
        return;
      }

      if (piece?.[0] === playerColor) {
        const moves = chess.moves({ square: square as Square, verbose: true });
        setSelectedSquare(moves.length > 0 ? square : null);
      } else {
        setSelectedSquare(null);
      }
    },
    [onPieceDrop, playerColor, position, selectedSquare, tapToMoveEnabled]
  );

  return (
    <div className="codex-chess-board">
      <div ref={frameRef} className="codex-chess-board__frame">
        {boardWidth > 0 && (
          <Chessboard
            position={position}
            boardWidth={boardWidth}
            boardOrientation={boardOrientation}
            arePiecesDraggable={arePiecesDraggable}
            allowDragOutsideBoard={false}
            onPieceDrop={(sourceSquare, targetSquare) =>
              onPieceDrop(sourceSquare, targetSquare)
            }
            onPieceDragBegin={
              tapToMoveEnabled ? () => setSelectedSquare(null) : undefined
            }
            onSquareClick={tapToMoveEnabled ? handleSquareClick : undefined}
            customSquareStyles={customSquareStyles}
            customBoardStyle={{
              borderRadius: "4px",
              boxShadow: "0 0 0 1px var(--color-border)",
            }}
          />
        )}
      </div>
      {tapToMoveEnabled && (
        <p className="codex-chess-board__hint">Tap a piece, then tap its destination.</p>
      )}
    </div>
  );
}
