import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';

interface KanbanItem {
  id: string;
  content: string;
  tags: string[];
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface KanbanColumn {
  id: string;
  title: string;
  items: KanbanItem[];
}

interface KanbanBoardProps {
  markdownContent: string;
  onBoardUpdate?: (updatedContent: string) => void;
  readOnly?: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ markdownContent, onBoardUpdate, readOnly = false }) => {
  const [columns, setColumns] = useState<Record<string, KanbanColumn>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    parseMarkdownToKanban(markdownContent);
  }, [markdownContent]);

  const parseMarkdownToKanban = async (content: string) => {
    try {
      setIsLoading(true);
      // In a real implementation, this would call your backend API
      const response = await axios.post('/api/kanban/parse', { content });
      setColumns(response.data.columns);
      setError(null);
    } catch (err) {
      setError('Failed to parse Kanban data');
      console.error('Error parsing Kanban data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (readOnly) return;

    const { source, destination } = result;
    if (!destination) return;

    // If dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Create a copy of our columns
    const newColumns = { ...columns };

    // Remove item from source column
    const sourceColumn = newColumns[source.droppableId];
    const [movedItem] = sourceColumn.items.splice(source.index, 1);

    // Add item to destination column
    const destColumn = newColumns[destination.droppableId];
    destColumn.items.splice(destination.index, 0, movedItem);

    setColumns(newColumns);

    // Convert updated kanban board back to markdown
    try {
      const response = await axios.post('/api/kanban/toMarkdown', { columns: newColumns });
      if (onBoardUpdate) {
        onBoardUpdate(response.data.markdown);
      }
    } catch (err) {
      setError('Failed to update Kanban data');
      console.error('Error updating Kanban data:', err);
    }
  };

  const getItemStyle = (isDragging: boolean, draggableStyle: any) => ({
    padding: '16px',
    margin: '0 0 8px 0',
    background: isDragging ? '#f0f0f0' : 'white',
    borderRadius: '4px',
    boxShadow: isDragging
      ? '0 5px 10px rgba(0, 0, 0, 0.1)'
      : '0 1px 3px rgba(0, 0, 0, 0.1)',
    ...draggableStyle,
  });

  const getColumnStyle = () => ({
    background: '#f7f7f7',
    padding: '8px',
    borderRadius: '4px',
    width: '280px',
    minHeight: '300px'
  });

  const renderPriorityIndicator = (priority?: string) => {
    if (!priority) return null;

    const colors = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336'
    };

    return (
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: colors[priority as keyof typeof colors] || '#ccc',
          display: 'inline-block',
          marginRight: '8px'
        }}
      />
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading Kanban board...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="kanban-board">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '16px' }}>
          {Object.values(columns).map((column) => (
            <div key={column.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ padding: '8px', margin: '0 0 8px 0', fontWeight: 'bold' }}>
                {column.title} ({column.items.length})
              </h3>
              <Droppable droppableId={column.id} isDropDisabled={readOnly}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={getColumnStyle()}
                  >
                    {column.items.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                        isDragDisabled={readOnly}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={getItemStyle(
                              snapshot.isDragging,
                              provided.draggableProps.style
                            )}
                          >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {renderPriorityIndicator(item.priority)}
                              <div>{item.content}</div>
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {item.tags.map((tag, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      backgroundColor: '#e0e0e0',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.dueDate && (
                              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                                Due: {item.dueDate}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;