/**
 * ============================================================================
 * GROUPS.JS
 * ============================================================================
 *
 * Manages tab groups for organizing saved tabs in the Tab Saver extension.
 * Groups can be nested (subgroups) and support drag-and-drop reordering.
 *
 * Group Object Structure:
 * {
 *   id: string,          // Unique identifier (timestamp as string)
 *   name: string,        // Display name of the group
 *   expanded: boolean,   // Whether the group is expanded in UI
 *   parentId: string|null // Parent group ID for nesting, null for root
 * }
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// GROUP MODAL
// -----------------------------------------------------------------------------

/**
 * Shows the group creation/editing modal
 *
 * Used for both creating new groups and editing existing ones.
 * When creating a subgroup, parentId specifies the parent group.
 *
 * @param {Object|null} group - Existing group to edit, or null for new group
 * @param {string|null} parentId - Parent group ID when creating a subgroup
 */
function showGroupModal(group = null, parentId = null) {
  // Update modal title based on action
  modalTitle.textContent = group ? 'Edit Group' : 'Create Group';

  // Pre-fill name if editing
  groupNameInput.value = group ? group.name : '';

  // Store group ID and parent ID in modal's dataset for later use
  groupModal.dataset.groupId = group ? group.id : '';
  groupModal.dataset.parentId = parentId || '';

  groupModal.classList.remove('hidden');
  groupNameInput.focus();
}

/**
 * Hides the group modal and clears its state
 */
function hideGroupModal() {
  groupModal.classList.add('hidden');
  groupNameInput.value = '';
  groupModal.dataset.groupId = '';
  groupModal.dataset.parentId = '';
}

// -----------------------------------------------------------------------------
// GROUP CRUD OPERATIONS
// -----------------------------------------------------------------------------

/**
 * Handles saving a group (create or update)
 *
 * Called when user clicks Save in the group modal.
 * Creates a new group or updates an existing one based on
 * whether a groupId is stored in the modal's dataset.
 */
function handleSaveGroup() {
  const name = groupNameInput.value.trim();
  if (!name) return;

  const groupId = groupModal.dataset.groupId;
  const parentId = groupModal.dataset.parentId || null;

  if (groupId) {
    // Edit existing group - update name
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.name = name;
    }
  } else {
    // Create new group
    groups.push({
      id: generateStringId(),
      name: name,
      expanded: true,
      parentId: parentId
    });
  }

  saveData();
  renderAll();
  hideGroupModal();
}

/**
 * Deletes a group and all its subgroups
 *
 * Tabs in the deleted group(s) are moved back to the
 * ungrouped "Saved Tabs" section.
 *
 * @param {string} groupId - ID of the group to delete
 */
function deleteGroup(groupId) {
  // Get all groups to delete (this group and all descendants)
  const groupsToDelete = getGroupAndDescendants(groupId);

  // Move tabs from deleted groups to ungrouped
  savedTabs.forEach(tab => {
    if (groupsToDelete.includes(tab.groupId)) {
      tab.groupId = null;
    }
  });

  // Remove groups
  groups = groups.filter(g => !groupsToDelete.includes(g.id));

  saveData();
  renderAll();
}

// -----------------------------------------------------------------------------
// GROUP HIERARCHY UTILITIES
// -----------------------------------------------------------------------------

/**
 * Gets a group and all its descendant group IDs
 *
 * Recursively collects all subgroups of a given group.
 * Used when deleting a group to ensure all nested content is handled.
 *
 * @param {string} groupId - ID of the parent group
 * @returns {string[]} - Array of group IDs including the parent and all descendants
 */
function getGroupAndDescendants(groupId) {
  const result = [groupId];

  // Find direct children
  const children = groups.filter(g => g.parentId === groupId);

  // Recursively add each child's descendants
  for (const child of children) {
    result.push(...getGroupAndDescendants(child.id));
  }

  return result;
}

/**
 * Checks if a group is a descendant of another group
 *
 * Used to prevent circular references when drag-dropping
 * groups (can't drop a parent into its own child).
 *
 * @param {string} potentialChildId - ID of the potential child group
 * @param {string} parentGroupId - ID of the potential parent group
 * @returns {boolean} - True if potentialChild is a descendant of parent
 */
function isDescendantGroup(potentialChildId, parentGroupId) {
  const child = groups.find(g => g.id === potentialChildId);
  if (!child) return false;

  // Check if direct child
  if (child.parentId === parentGroupId) return true;

  // Check recursively up the tree
  if (child.parentId) {
    return isDescendantGroup(child.parentId, parentGroupId);
  }

  return false;
}

// -----------------------------------------------------------------------------
// GROUP NAVIGATION
// -----------------------------------------------------------------------------

/**
 * Toggles a group's expanded/collapsed state
 *
 * Called when user clicks the expand arrow or group name.
 *
 * @param {string} groupId - ID of the group to toggle
 */
function toggleGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (group) {
    group.expanded = !group.expanded;
    saveData();
    renderGroups();
  }
}

/**
 * Moves a group to become a child of another group
 *
 * Used by drag-and-drop to nest groups within each other.
 * Pass null as newParentId to move to root level.
 *
 * @param {string} groupId - ID of the group to move
 * @param {string|null} newParentId - ID of new parent, or null for root
 */
function moveGroupToParent(groupId, newParentId) {
  const group = groups.find(g => g.id === groupId);
  if (group) {
    group.parentId = newParentId;
    saveData();
    renderGroups();
  }
}

// -----------------------------------------------------------------------------
// GROUP TAB OPERATIONS
// -----------------------------------------------------------------------------

/**
 * Gets all tabs in a group and its subgroups recursively
 *
 * Used when opening all tabs in a group, including
 * tabs from nested subgroups.
 *
 * @param {string} groupId - ID of the parent group
 * @returns {Object[]} - Array of tab objects
 */
function getGroupTabsRecursive(groupId) {
  // Get tabs directly in this group
  let tabs = savedTabs.filter(t => t.groupId === groupId);

  // Get child groups
  const childGroups = groups.filter(g => g.parentId === groupId);

  // Recursively add tabs from child groups
  for (const child of childGroups) {
    tabs = tabs.concat(getGroupTabsRecursive(child.id));
  }

  return tabs;
}

/**
 * Counts total tabs in a group and all its subgroups
 *
 * Used to display the tab count in the group header.
 *
 * @param {string} groupId - ID of the group to count
 * @returns {number} - Total number of tabs
 */
function countGroupTabs(groupId) {
  // Count tabs directly in this group
  let count = savedTabs.filter(t => t.groupId === groupId).length;

  // Count tabs in child groups
  const childGroups = groups.filter(g => g.parentId === groupId);
  for (const child of childGroups) {
    count += countGroupTabs(child.id);
  }

  return count;
}
