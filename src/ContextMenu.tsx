import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
  color?: string;
  separator?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Close menu when pressing escape
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (!menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width;
    }

    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height;
    }

    menuRef.current.style.left = `${adjustedX}px`;
    menuRef.current.style.top = `${adjustedY}px`;
  }, [position]);

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white shadow-lg rounded z-50 py-1 min-w-40 border border-gray-200"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.separator && <div className="border-t my-1"></div>}
          <div
            className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center ${item.color ? `text-${item.color}-600` : ''}`}
            onClick={() => handleItemClick(item.action)}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.label}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ContextMenu;