/**
 * ============================================================================
 * DRAG-DROP.JS
 * ============================================================================
 *
 * Drag and drop functionality for organizing tabs and groups.
 *
 * Supported Drag Operations:
 * - Drag tabs between groups
 * - Drag tabs from Saved Tabs to groups
 * - Drag groups to nest them under other groups
 * - Drag groups to root level (ungrouping)
 *
 * Visual Feedback:
 * - 'dragging' class on item being dragged
 * - 'drop-target' class on valid drop zones
 * - 'drag-over' class on currently hovered drop zone
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// TAB DRAG HANDLERS
// -----------------------------------------------------------------------------

/**
 * Attaches drag event listeners to tab items
 *
 * @param {HTMLElement} container - Container with draggable tab items
 */
function attachDragListeners(container) {
  container.querySelectorAll('.tab-item[draggable="true"]').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
  });
}

/**
 * Handles the start of a tab drag operation
 *
 * Sets up the data transfer with the tab ID and adds visual classes.
 *
 * @param {DragEvent} e - The dragstart event
 */
function handleDragStart(e) {
  const tabItem = e.target.closest('.tab-item');
  if (!tabItem) return;

  const tabId = tabItem.dataset.tabId;

  // Set data for the drop handler
  e.dataTransfer.setData('text/plain', tabId);
  e.dataTransfer.effectAllowed = 'move';

  // Add visual feedback
  tabItem.classList.add('dragging');

  // Show drop zones on all groups
  document.querySelectorAll('.group-item').forEach(group => {
    group.classList.add('drop-target');
  });
}

/**
 * Handles the end of a tab drag operation
 *
 * Cleans up visual classes regardless of whether drop succeeded.
 *
 * @param {DragEvent} e - The dragend event
 */
function handleDragEnd(e) {
  const tabItem = e.target.closest('.tab-item');
  if (tabItem) {
    tabItem.classList.remove('dragging');
  }

  // Clean up all drop zone indicators
  document.querySelectorAll('.group-item').forEach(group => {
    group.classList.remove('drop-target', 'drag-over');
  });
}

// -----------------------------------------------------------------------------
// GROUP DROP ZONES
// -----------------------------------------------------------------------------

/**
 * Sets up drop zone event listeners on the groups list
 *
 * Handles both tab drops (into groups) and group drops
 * (nesting groups or moving to root).
 */
function setupGroupDropZones() {
  // Handle dragover to show drop feedback
  groupsList.addEventListener('dragover', (e) => {
    e.preventDefault();

    const groupItem = e.target.closest('.group-item');
    if (groupItem) {
      // Clear drag-over from other groups first
      document.querySelectorAll('.group-item.drag-over').forEach(g => {
        g.classList.remove('drag-over');
      });
      // Add to hovered group
      groupItem.classList.add('drag-over');
    }
  });

  // Handle dragleave to remove drop feedback
  groupsList.addEventListener('dragleave', (e) => {
    const groupItem = e.target.closest('.group-item');
    if (groupItem && !groupItem.contains(e.relatedTarget)) {
      groupItem.classList.remove('drag-over');
    }
  });

  // Handle the actual drop
  groupsList.addEventListener('drop', (e) => {
    e.preventDefault();

    const groupItem = e.target.closest('.group-item');

    // Check if dropping a group (for nesting)
    const draggedGroupId = e.dataTransfer.getData('application/group-id');

    if (draggedGroupId) {
      if (groupItem) {
        // Dropping onto another group - let group's own drop handler handle it
        // (This is handled in attachGroupListeners in render.js)
      } else {
        // Dropping onto empty area - move group to root level
        moveGroupToParent(draggedGroupId, null);
      }
    } else {
      // Dropping a tab
      if (groupItem) {
        const tabId = parseFloat(e.dataTransfer.getData('text/plain'));
        const groupId = groupItem.dataset.groupId;
        moveToGroup(tabId, groupId);
      }
    }

    // Clean up visual feedback
    document.querySelectorAll('.group-item').forEach(g => {
      g.classList.remove('drop-target', 'drag-over');
    });
  });
}
