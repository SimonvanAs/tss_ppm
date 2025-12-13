import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

// Org Chart Node Component
function OrgNode({ user, children, level, expanded, onToggle, onDrop, onDragStart, onDragEnd, onEdit, highlightId, draggingId, t }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isHighlighted = highlightId === user.id;
  const isDragging = draggingId === user.id;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('userId', user.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image for better visual feedback
    try {
      const dragImage = e.currentTarget.cloneNode(true);
      dragImage.style.opacity = '0.8';
      dragImage.style.transform = 'rotate(2deg)';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.pointerEvents = 'none';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
      
      // Clean up drag image after a short delay
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 0);
    } catch (err) {
      // Fallback if drag image creation fails
      console.warn('Failed to create drag image:', err);
    }
    
    onDragStart(user.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent nodes
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only set to false if actually leaving the node (not entering a child)
    // relatedTarget might be null in some browsers (Safari), so we need to handle that
    const relatedTarget = e.relatedTarget;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent nodes
    setIsDragOver(false);
    const draggedUserId = e.dataTransfer.getData('userId');
    if (draggedUserId && draggedUserId !== user.id) {
      onDrop(draggedUserId, user.id);
    }
  };

  const handleDragEnd = () => {
    setIsDragOver(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const roleColors = {
    EMPLOYEE: '#1565c0',
    MANAGER: '#ef6c00',
    HR: '#7b1fa2',
    OPCO_ADMIN: '#2e7d32',
    TSS_SUPER_ADMIN: '#CC0E70',
  };

  return (
    <div className="org-node-wrapper" style={{ marginLeft: level > 0 ? '40px' : 0 }}>
      <div
        className={`org-node ${isDragOver ? 'drag-over' : ''} ${isHighlighted ? 'highlighted' : ''} ${isDragging ? 'dragging' : ''}`}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        style={{
          borderLeftColor: roleColors[user.role] || '#666',
        }}
      >
        <div className="org-node-content">
          <div className="org-node-avatar" style={{ background: roleColors[user.role] || '#666' }}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <div className="org-node-info">
            <div className="org-node-name">{user.firstName} {user.lastName}</div>
            <div className="org-node-title">{user.functionTitle?.name || user.role}</div>
          </div>
          <div className="org-node-actions">
            {children.length > 0 && (
              <button
                className="org-node-toggle"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(user.id);
                }}
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? '−' : '+'}
              </button>
            )}
            <button
              className="org-node-edit"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(user);
              }}
              aria-label="Edit"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          </div>
        </div>

        {children.length > 0 && (
          <div className="org-node-count">
            {children.length} {t('admin.orgChart.directReports')}
          </div>
        )}
      </div>

      {expanded && children.length > 0 && (
        <div className="org-children">
          {children.map(child => (
            <OrgNode
              key={child.id}
              user={child}
              children={child.directReports || []}
              level={level + 1}
              expanded={child._expanded}
              onToggle={onToggle}
              onDrop={onDrop}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onEdit={onEdit}
              highlightId={highlightId}
              draggingId={draggingId}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Edit Manager Modal
function EditManagerModal({ user, managers, onSave, onClose, t }) {
  const [managerId, setManagerId] = useState(user?.managerId || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(user.id, managerId || null);
      onClose();
    } catch (err) {
      console.error('Failed to update manager:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3 className="admin-modal-title">
            {t('admin.orgChart.editManager')}: {user?.firstName} {user?.lastName}
          </h3>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.orgChart.reportsTo')}</label>
              <select
                className="admin-form-select"
                value={managerId}
                onChange={e => setManagerId(e.target.value)}
              >
                <option value="">{t('admin.orgChart.noManager')}</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OrgChart() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [highlightId, setHighlightId] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [editingUser, setEditingUser] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await adminApi.getUsers();
      setUsers(usersData);

      // Auto-expand first two levels
      const topLevel = usersData.filter(u => !u.managerId);
      const expanded = new Set(topLevel.map(u => u.id));
      setExpandedNodes(expanded);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Build tree structure
  const buildTree = useCallback(() => {
    const userMap = new Map(users.map(u => [u.id, { ...u, directReports: [], _expanded: expandedNodes.has(u.id) }]));

    // Assign children to parents
    users.forEach(user => {
      if (user.managerId && userMap.has(user.managerId)) {
        userMap.get(user.managerId).directReports.push(userMap.get(user.id));
      }
    });

    // Get root nodes (no manager)
    return users
      .filter(u => !u.managerId)
      .map(u => userMap.get(u.id));
  }, [users, expandedNodes]);

  const handleToggle = (userId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedNodes(new Set(users.map(u => u.id)));
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  const handleSearch = (value) => {
    setSearch(value);
    if (value) {
      const match = users.find(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(value.toLowerCase()) ||
        u.email?.toLowerCase().includes(value.toLowerCase())
      );
      if (match) {
        setHighlightId(match.id);
        // Expand path to this user
        let current = match;
        const toExpand = new Set(expandedNodes);
        while (current.managerId) {
          toExpand.add(current.managerId);
          current = users.find(u => u.id === current.managerId);
          if (!current) break;
        }
        setExpandedNodes(toExpand);
      } else {
        setHighlightId(null);
      }
    } else {
      setHighlightId(null);
    }
  };

  const handleDrop = async (draggedUserId, newManagerId) => {
    if (draggedUserId === newManagerId) {
      setDraggingId(null);
      return;
    }

    // Check for circular reference
    let current = users.find(u => u.id === newManagerId);
    while (current) {
      if (current.id === draggedUserId) {
        alert(t('admin.orgChart.circularError'));
        setDraggingId(null);
        return;
      }
      current = users.find(u => u.id === current.managerId);
    }

    try {
      await adminApi.updateUser(draggedUserId, { managerId: newManagerId });
      await loadUsers();
    } catch (err) {
      console.error('Failed to update manager:', err);
    } finally {
      setDraggingId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleSaveManager = async (userId, newManagerId) => {
    await adminApi.updateUser(userId, { managerId: newManagerId });
    await loadUsers();
  };

  // Get eligible managers (anyone except the user and their descendants)
  const getEligibleManagers = (userId) => {
    const descendants = new Set();
    const findDescendants = (id) => {
      users.filter(u => u.managerId === id).forEach(u => {
        descendants.add(u.id);
        findDescendants(u.id);
      });
    };
    findDescendants(userId);

    return users.filter(u =>
      u.id !== userId &&
      !descendants.has(u.id) &&
      ['MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN'].includes(u.role)
    );
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        {t('common.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card">
        <div className="admin-empty">
          <div className="admin-empty-title">{t('admin.orgChart.error')}</div>
          <div className="admin-empty-text">{error}</div>
          <button className="admin-btn admin-btn-primary" onClick={loadUsers}>
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const tree = buildTree();

  return (
    <div>
      <style>{`
        .org-chart-container {
          padding: 20px;
          overflow-x: auto;
        }
        .org-node-wrapper {
          padding: 4px 0;
        }
        .org-node {
          display: inline-flex;
          flex-direction: column;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-left: 4px solid #666;
          border-radius: 8px;
          padding: 12px 16px;
          min-width: 220px;
          cursor: grab;
          transition: all 0.15s ease;
        }
        .org-node:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .org-node:active {
          cursor: grabbing;
        }
        .org-node.dragging {
          opacity: 0.5;
          transform: scale(0.98);
        }
        .org-node.drag-over {
          border-color: #004A91;
          background: #f0f7ff;
          box-shadow: 0 0 0 2px rgba(0, 74, 145, 0.2);
        }
        .org-node.highlighted {
          border-color: #CC0E70;
          box-shadow: 0 0 0 3px rgba(204, 14, 112, 0.2);
        }
        .org-node-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .org-node-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .org-node-info {
          flex: 1;
          min-width: 0;
        }
        .org-node-name {
          font-weight: 600;
          font-size: 14px;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .org-node-title {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .org-node-actions {
          display: flex;
          gap: 4px;
        }
        .org-node-toggle,
        .org-node-edit {
          width: 24px;
          height: 24px;
          border: none;
          background: #f5f5f5;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          color: #666;
        }
        .org-node-toggle:hover,
        .org-node-edit:hover {
          background: #e0e0e0;
        }
        .org-node-count {
          font-size: 11px;
          color: #999;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #f0f0f0;
        }
        .org-children {
          border-left: 2px solid #e0e0e0;
          margin-left: 20px;
          padding-left: 0;
        }
      `}</style>

      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('admin.orgChart.title')}</h1>
        <p className="admin-page-subtitle">{t('admin.orgChart.subtitle')}</p>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <svg className="admin-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder={t('admin.orgChart.searchPlaceholder')}
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        <button className="admin-btn admin-btn-secondary" onClick={handleExpandAll}>
          {t('admin.orgChart.expandAll')}
        </button>
        <button className="admin-btn admin-btn-secondary" onClick={handleCollapseAll}>
          {t('admin.orgChart.collapseAll')}
        </button>
      </div>

      {/* Drag hint */}
      <div className="admin-card" style={{ padding: '12px 16px', marginBottom: '16px', background: '#f8f9fa' }}>
        <span style={{ fontSize: '13px', color: '#666' }}>
          {t('admin.orgChart.dragHint')}
        </span>
      </div>

      {/* Org Chart */}
      <div className="admin-card">
        <div className="org-chart-container">
          {tree.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-title">{t('admin.orgChart.noUsers')}</div>
              <div className="admin-empty-text">{t('admin.orgChart.noUsersDesc')}</div>
            </div>
          ) : (
            tree.map(user => (
              <OrgNode
                key={user.id}
                user={user}
                children={user.directReports}
                level={0}
                expanded={expandedNodes.has(user.id)}
                onToggle={handleToggle}
                onDrop={handleDrop}
                onDragStart={setDraggingId}
                onDragEnd={handleDragEnd}
                onEdit={setEditingUser}
                highlightId={highlightId}
                draggingId={draggingId}
                t={t}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit Manager Modal */}
      {editingUser && (
        <EditManagerModal
          user={editingUser}
          managers={getEligibleManagers(editingUser.id)}
          onSave={handleSaveManager}
          onClose={() => setEditingUser(null)}
          t={t}
        />
      )}
    </div>
  );
}
