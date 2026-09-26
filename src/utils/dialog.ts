/** Close a <dialog> when the user clicks its ::backdrop (outside the dialog's own box).
 * A click landing in the dialog's own padding still reports the dialog as the target,
 * so genuine backdrop clicks are distinguished by also falling outside its rendered rect. */
export function closeDialogOnBackdropClick(dialog: HTMLDialogElement) {
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const outside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (event.target === dialog && outside) {
      dialog.close();
    }
  });
}
