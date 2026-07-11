export function openTaskFromKeyboard(event, onOpen) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onOpen();
  }
}

export function isRowControlTarget(target) {
  return Boolean(target?.closest?.("button,input,select,textarea,a,[role='button'],[data-row-control='true']"));
}

export function resizeTextareaToContent(element) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function scrollTaskSectionIntoView(sectionId) {
  if (typeof document === "undefined") return;
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
