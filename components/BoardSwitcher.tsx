import React, { useState } from 'react';
import { FolderPlus, Plus, ChevronDown } from 'lucide-react';

interface BoardSwitcherProps {
  workspaces: { id: string; name: string }[];
  boards: { id: string; name: string }[];
  activeWorkspaceId: string | null;
  activeBoardId: string | null;
  onSelectWorkspace: (id: string) => void;
  onSelectBoard: (id: string | null) => void;
  onCreateWorkspace: (name: string) => void;
  onCreateBoard: (name: string) => void;
  isOwner: boolean;
}

export const BoardSwitcher: React.FC<BoardSwitcherProps> = ({
  workspaces,
  boards,
  activeWorkspaceId,
  activeBoardId,
  onSelectWorkspace,
  onSelectBoard,
  onCreateWorkspace,
  onCreateBoard,
  isOwner,
}) => {
  const [showWsCreate, setShowWsCreate] = useState(false);
  const [showBoardCreate, setShowBoardCreate] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [wsDropdown, setWsDropdown] = useState(false);

  const activeWs = workspaces.find((ws) => ws.id === activeWorkspaceId);

  // No workspaces yet — show create prompt for owner, nothing for non-owner
  if (workspaces.length === 0 && !isOwner) return null;

  return (
    <div className="board-switcher flex items-center gap-3 flex-wrap text-[10px] tracking-[0.2em] uppercase">
      {/* Workspace selector */}
      <div className="relative">
        {workspaces.length === 0 && isOwner ? (
          showWsCreate ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newWsName.trim();
                if (!name) return;
                onCreateWorkspace(name);
                setNewWsName('');
                setShowWsCreate(false);
              }}
            >
              <input
                autoFocus
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="Workspace name"
                className="bg-transparent border border-edge rounded-lg px-3 py-1.5 text-primary text-[10px] tracking-widest w-40 focus:border-accent/50 outline-none"
              />
              <button type="submit" className="text-accent hover:text-accent/80 font-bold">GO</button>
              <button type="button" onClick={() => setShowWsCreate(false)} className="text-muted/40 hover:text-primary">×</button>
            </form>
          ) : (
            <button
              onClick={() => setShowWsCreate(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-accent/30 rounded-lg text-accent/60 hover:text-accent hover:border-accent/60 transition-all font-bold"
            >
              <FolderPlus size={12} /> NEW WORKSPACE
            </button>
          )
        ) : (
          <button
            onClick={() => setWsDropdown(!wsDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 border border-edge rounded-lg text-muted hover:text-primary transition-all font-bold"
          >
            {activeWs?.name || 'WORKSPACE'}
            {workspaces.length > 1 && <ChevronDown size={12} />}
          </button>
        )}
        {wsDropdown && workspaces.length > 1 && (
          <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-edge rounded-xl shadow-xl min-w-[160px] py-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { onSelectWorkspace(ws.id); setWsDropdown(false); }}
                className={`block w-full text-left px-4 py-2 text-[10px] tracking-widest font-bold transition-colors ${
                  ws.id === activeWorkspaceId ? 'text-accent bg-accent/5' : 'text-muted hover:text-primary hover:bg-card/30'
                }`}
              >
                {ws.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      {activeWorkspaceId && <span className="text-muted/20">|</span>}

      {/* Board pills */}
      {activeWorkspaceId && (
        <>
          <button
            onClick={() => onSelectBoard(null)}
            className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
              !activeBoardId
                ? 'text-accent border-accent/40 bg-accent/10'
                : 'text-muted/50 border-edge hover:text-primary hover:border-edge'
            }`}
          >
            ALL
          </button>
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => onSelectBoard(board.id)}
              className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                activeBoardId === board.id
                  ? 'text-accent border-accent/40 bg-accent/10'
                  : 'text-muted/50 border-edge hover:text-primary hover:border-edge'
              }`}
            >
              {board.name}
            </button>
          ))}

          {/* New board inline creator — owner only */}
          {isOwner && (
            showBoardCreate ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newBoardName.trim();
                  if (!name) return;
                  onCreateBoard(name);
                  setNewBoardName('');
                  setShowBoardCreate(false);
                }}
              >
                <input
                  autoFocus
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Board name"
                  className="bg-transparent border border-edge rounded-lg px-3 py-1.5 text-primary text-[10px] tracking-widest w-32 focus:border-accent/50 outline-none"
                />
                <button type="submit" className="text-accent hover:text-accent/80 font-bold">GO</button>
                <button type="button" onClick={() => setShowBoardCreate(false)} className="text-muted/40 hover:text-primary">×</button>
              </form>
            ) : (
              <button
                onClick={() => setShowBoardCreate(true)}
                className="flex items-center gap-1 px-2 py-1.5 text-muted/30 hover:text-accent transition-colors"
                title="Create new board"
              >
                <Plus size={12} />
              </button>
            )
          )}
        </>
      )}
    </div>
  );
};
