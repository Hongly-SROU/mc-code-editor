import { ref, computed } from 'vue';
import type { EditorGroup, SplitDirection } from '../types/editor';

export function useEditorGroups(initialFileIds: string[] = []) {
  const splitDirection = ref<SplitDirection>('none');
  const splitRatio = ref<number>(50); // percentage 20% to 80%
  const activeGroupId = ref<string>('group-1');

  const groups = ref<EditorGroup[]>([
    {
      id: 'group-1',
      fileIds: [...initialFileIds],
      activeFileId: initialFileIds[0] || null,
    },
    {
      id: 'group-2',
      fileIds: [],
      activeFileId: null,
    },
  ]);

  const group1 = computed(() => groups.value[0]);
  const group2 = computed(() => groups.value[1]);
  const isSplit = computed(() => splitDirection.value !== 'none');

  const activeGroup = computed(() => {
    return (
      groups.value.find((g) => g.id === activeGroupId.value) || groups.value[0]
    );
  });

  const currentActiveFileId = computed(() => {
    return activeGroup.value ? activeGroup.value.activeFileId : null;
  });

  function setActiveGroup(id: string) {
    if (groups.value.some((g) => g.id === id)) {
      activeGroupId.value = id;
    }
  }

  function splitEditor(direction: 'vertical' | 'horizontal') {
    if (splitDirection.value === direction) return;
    splitDirection.value = direction;

    // If group-2 is empty, copy current active file to group-2 so it opens nicely
    if (groups.value[1].fileIds.length === 0 && groups.value[0].activeFileId) {
      groups.value[1].fileIds.push(groups.value[0].activeFileId);
      groups.value[1].activeFileId = groups.value[0].activeFileId;
    }
  }

  function closeSplit() {
    splitDirection.value = 'none';
    activeGroupId.value = 'group-1';
  }

  function openFileInGroup(fileId: string, targetGroupId?: string) {
    const targetId = targetGroupId || activeGroupId.value;
    const group = groups.value.find((g) => g.id === targetId);
    if (!group) return;

    if (!group.fileIds.includes(fileId)) {
      group.fileIds.push(fileId);
    }
    group.activeFileId = fileId;
    activeGroupId.value = group.id;
  }

  function closeTabInGroup(fileId: string, groupId: string) {
    const group = groups.value.find((g) => g.id === groupId);
    if (!group) return;

    const idx = group.fileIds.indexOf(fileId);
    if (idx === -1) return;

    group.fileIds.splice(idx, 1);

    // If the closed tab was active, activate adjacent tab
    if (group.activeFileId === fileId) {
      if (group.fileIds.length > 0) {
        const newIdx = Math.min(idx, group.fileIds.length - 1);
        group.activeFileId = group.fileIds[newIdx];
      } else {
        group.activeFileId = null;
      }
    }
  }

  function moveTabToOtherGroup(fileId: string, sourceGroupId: string) {
    const targetGroupId = sourceGroupId === 'group-1' ? 'group-2' : 'group-1';

    // If split is not active, open split vertically
    if (splitDirection.value === 'none') {
      splitDirection.value = 'vertical';
    }

    // Add to target group
    const targetGroup = groups.value.find((g) => g.id === targetGroupId);
    if (targetGroup) {
      if (!targetGroup.fileIds.includes(fileId)) {
        targetGroup.fileIds.push(fileId);
      }
      targetGroup.activeFileId = fileId;
    }

    // Remove from source group
    closeTabInGroup(fileId, sourceGroupId);
    activeGroupId.value = targetGroupId;
  }

  function removeFileFromAllGroups(fileId: string) {
    for (const g of groups.value) {
      closeTabInGroup(fileId, g.id);
    }
  }

  function updateSplitRatio(ratio: number) {
    // Clamp between 15% and 85%
    splitRatio.value = Math.max(15, Math.min(85, ratio));
  }

  return {
    splitDirection,
    splitRatio,
    activeGroupId,
    groups,
    group1,
    group2,
    isSplit,
    activeGroup,
    currentActiveFileId,
    setActiveGroup,
    splitEditor,
    closeSplit,
    openFileInGroup,
    closeTabInGroup,
    moveTabToOtherGroup,
    removeFileFromAllGroups,
    updateSplitRatio,
  };
}
