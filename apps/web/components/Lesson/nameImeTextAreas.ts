/**
 * Monaco's native edit context (Chrome) adds a hidden, read-only `<textarea class="ime-text-area">`
 * to every editor, with neither an id nor a name, and Chrome reports it as a form field issue.
 * Names the ones inside `container` (an editor, or a diff editor and its two sides). The textarea
 * belongs to no form, so its name changes nothing else.
 */
export function nameImeTextAreas(container: HTMLElement | null, name: string): void {
  container?.querySelectorAll<HTMLTextAreaElement>('textarea.ime-text-area:not([name])').forEach((textArea) => {
    textArea.name = name;
  });
}
