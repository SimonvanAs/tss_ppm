# Org Chart Drag-and-Drop Analysis

## Issue Investigation

### Current Implementation Review

The org chart drag-and-drop functionality is implemented in `hr-performance-app/src/pages/admin/OrgChart.jsx`. After analyzing the code, several issues have been identified that could cause drag-and-drop to malfunction.

---

## Identified Issues

### 1. **handleDragLeave Fires on Child Elements** ⚠️ **CRITICAL**

**Problem:**
```javascript
const handleDragLeave = () => {
  setIsDragOver(false);
};
```

The `handleDragLeave` event fires not only when leaving the node, but also when entering child elements (buttons, avatar, text). This causes the `isDragOver` state to flicker or reset incorrectly.

**Impact:**
- Visual feedback (drag-over highlighting) disappears when hovering over buttons
- Drop zone becomes unreliable
- User experience is confusing

**Why it happens:**
- When dragging over the node, `handleDragOver` sets `isDragOver = true`
- When the mouse moves over a child element (e.g., the toggle button), `handleDragLeave` fires on the parent
- This sets `isDragOver = false` even though you're still over the drop zone
- The visual feedback disappears, making it seem like you can't drop

---

### 2. **Missing onDragEnd Handler** ⚠️ **MEDIUM**

**Problem:**
There's no `onDragEnd` handler to clean up state when:
- Drag is cancelled (ESC key, mouse released outside)
- Drag fails
- User abandons the drag operation

**Current code:**
```javascript
const [draggingId, setDraggingId] = useState(null);

const handleDragStart = (e) => {
  e.dataTransfer.setData('userId', user.id);
  e.dataTransfer.effectAllowed = 'move';
  onDragStart(user.id); // Sets draggingId
};
```

**Impact:**
- `draggingId` state may remain set after failed drags
- No visual feedback when drag is cancelled
- Potential memory leaks or UI inconsistencies

---

### 3. **Button Elements Interfere with Drag** ⚠️ **MEDIUM**

**Problem:**
The toggle and edit buttons inside the node are interactive elements that can interfere with drag operations:

```jsx
<button
  className="org-node-toggle"
  onClick={() => onToggle(user.id)}
  aria-label={expanded ? 'Collapse' : 'Expand'}
>
  {expanded ? '−' : '+'}
</button>
<button
  className="org-node-edit"
  onClick={() => onEdit(user)}
  aria-label="Edit"
>
  {/* SVG icon */}
</button>
```

**Impact:**
- Clicking buttons might trigger drag instead of button action
- Buttons might prevent drop events from firing
- User might accidentally drag when trying to click buttons

**Solution needed:**
- Add `draggable={false}` to buttons
- Or add `onMouseDown={(e) => e.stopPropagation()}` to prevent drag start
- Or use `pointer-events: none` on buttons during drag (complex)

---

### 4. **Nested Node Event Bubbling** ⚠️ **LOW-MEDIUM**

**Problem:**
When dragging over nested child nodes, the drag events bubble up to parent nodes. This could cause:
- Multiple nodes showing drag-over state simultaneously
- Drop events firing on wrong node
- Confusing visual feedback

**Current structure:**
```jsx
<div className="org-node" draggable onDragOver={handleDragOver} onDrop={handleDrop}>
  {/* Content */}
  {expanded && children.length > 0 && (
    <div className="org-children">
      {children.map(child => (
        <OrgNode ... /> {/* Nested draggable nodes */}
      ))}
    </div>
  )}
</div>
```

**Impact:**
- When dragging over a child node, the parent node might also receive drag events
- Could cause incorrect drop target selection

---

### 5. **Missing Event Target Validation** ⚠️ **LOW**

**Problem:**
The `handleDragLeave` doesn't check if the related target is actually leaving the node or just entering a child:

```javascript
const handleDragLeave = () => {
  setIsDragOver(false); // Always sets to false
};
```

**Better approach:**
```javascript
const handleDragLeave = (e) => {
  // Only set to false if actually leaving the node (not entering a child)
  if (!e.currentTarget.contains(e.relatedTarget)) {
    setIsDragOver(false);
  }
};
```

**Note:** `relatedTarget` might be null in some browsers, so this needs careful handling.

---

### 6. **No Visual Feedback During Drag** ⚠️ **LOW**

**Problem:**
When dragging a node, there's no visual indication of what's being dragged. The cursor changes to "grab" but the dragged element doesn't show a drag image or opacity change.

**Impact:**
- Users might not realize drag has started
- No clear feedback about what's being moved

---

## Recommended Fixes (Without Code Changes)

### Fix 1: Improve handleDragLeave Logic
**Issue:** Drag leave fires when entering child elements

**Solution:**
- Check if `relatedTarget` is a child of the current target
- Only set `isDragOver = false` if actually leaving the node boundary
- Handle null `relatedTarget` (some browsers)

### Fix 2: Add onDragEnd Handler
**Issue:** State not cleaned up after drag

**Solution:**
- Add `onDragEnd` handler to reset `draggingId`
- Reset `isDragOver` state in all nodes
- Provide visual feedback if drag was cancelled

### Fix 3: Prevent Button Interference
**Issue:** Buttons interfere with drag operations

**Solution:**
- Add `draggable={false}` to all button elements
- Add `onMouseDown={(e) => e.stopPropagation()}` to prevent drag start
- Or use CSS `pointer-events: none` on buttons when parent is being dragged

### Fix 4: Stop Event Propagation on Nested Nodes
**Issue:** Events bubble up to parent nodes

**Solution:**
- Add `e.stopPropagation()` in `handleDragOver` and `handleDrop` of child nodes
- Ensure only the target node receives drop events

### Fix 5: Add Drag Image/Visual Feedback
**Issue:** No clear visual feedback during drag

**Solution:**
- Use `e.dataTransfer.setDragImage()` to show custom drag image
- Or add CSS class to dragged element (opacity, transform)
- Show ghost/preview of dragged node

---

## Testing Scenarios to Verify Issues

### Scenario 1: Drag Over Button
1. Start dragging a node
2. Move mouse over the toggle (+) button
3. **Expected:** Drag-over highlight should remain
4. **Actual:** Highlight disappears (due to handleDragLeave firing)

### Scenario 2: Cancel Drag
1. Start dragging a node
2. Press ESC or release mouse outside drop zone
3. **Expected:** State should reset, no visual artifacts
4. **Actual:** `draggingId` might remain set

### Scenario 3: Click Button While Dragging
1. Start dragging a node
2. Try to click the edit button
3. **Expected:** Button should not interfere with drag
4. **Actual:** Button click might trigger drag or prevent drop

### Scenario 4: Drag Over Nested Node
1. Expand a node to show children
2. Drag a node over a child node
3. **Expected:** Only child node shows drag-over state
4. **Actual:** Both parent and child might show drag-over state

### Scenario 5: Drop on Nested Structure
1. Drag a node
2. Drop on a node that has children
3. **Expected:** Drop should work correctly
4. **Actual:** Might drop on wrong node due to event bubbling

---

## Browser Compatibility Notes

- **Safari**: `relatedTarget` in `dragLeave` might be null more often
- **Firefox**: Event propagation might differ slightly
- **Chrome/Edge**: Generally better drag-and-drop support
- **Mobile**: Drag-and-drop not supported (touch events needed)

---

## Summary of Root Causes

1. **Primary Issue**: `handleDragLeave` fires when entering child elements, causing visual feedback to disappear
2. **Secondary Issue**: Missing `onDragEnd` handler leaves state inconsistent
3. **Tertiary Issue**: Interactive child elements (buttons) interfere with drag operations
4. **Quaternary Issue**: Event bubbling in nested structures causes multiple nodes to receive events

---

## Priority for Fixes

1. **HIGH**: Fix `handleDragLeave` to check `relatedTarget`
2. **HIGH**: Add `onDragEnd` handler for cleanup
3. **MEDIUM**: Prevent button interference (`draggable={false}`)
4. **MEDIUM**: Stop event propagation in nested nodes
5. **LOW**: Add visual drag feedback (drag image)

---

**Analysis Date**: January 2025  
**Component**: `hr-performance-app/src/pages/admin/OrgChart.jsx`  
**Lines**: 6-114 (OrgNode component), 273-293 (handleDrop function)
