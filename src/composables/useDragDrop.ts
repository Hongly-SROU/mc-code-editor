import { ref } from 'vue';

export type DropRegion = 'left' | 'right' | 'top' | 'bottom' | 'center';

const draggedFileId = ref<string | null>(null);
const sourceGroupId = ref<string | null>(null);
const isDraggingTab = ref(false);
const dropRegion = ref<DropRegion | null>(null);
const dropTargetGroupId = ref<string | null>(null);

export function useDragDrop() {
  function startDrag(fileId: string, groupId: string) {
    draggedFileId.value = fileId;
    sourceGroupId.value = groupId;
    isDraggingTab.value = true;
  }

  function endDrag() {
    draggedFileId.value = null;
    sourceGroupId.value = null;
    isDraggingTab.value = false;
    dropRegion.value = null;
    dropTargetGroupId.value = null;
  }

  function setDropTarget(region: DropRegion | null, groupId: string | null) {
    dropRegion.value = region;
    dropTargetGroupId.value = groupId;
  }

  function clearDropTarget() {
    dropRegion.value = null;
    dropTargetGroupId.value = null;
  }

  return {
    draggedFileId,
    sourceGroupId,
    isDraggingTab,
    dropRegion,
    dropTargetGroupId,
    startDrag,
    endDrag,
    setDropTarget,
    clearDropTarget,
  };
}
