import { describe, expect, it } from "vitest";

import { nameImeTextAreas } from "./nameImeTextAreas";

/** A container whose querySelectorAll returns the given textareas, recording the selector asked for. */
function container(textAreas: { name: string }[]) {
  const asked: string[] = [];
  const element = {
    querySelectorAll(selector: string) {
      asked.push(selector);
      return textAreas;
    },
  } as unknown as HTMLElement;
  return { element, asked };
}

describe("nameImeTextAreas", () => {
  it("names the IME textareas that have no name yet", () => {
    const textAreas = [{ name: "" }, { name: "" }];
    const { element, asked } = container(textAreas);
    nameImeTextAreas(element, "compare-editor-ime");
    expect(asked).toEqual(["textarea.ime-text-area:not([name])"]);
    expect(textAreas.map((textArea) => textArea.name)).toEqual(["compare-editor-ime", "compare-editor-ime"]);
  });

  it("does nothing without a container", () => {
    expect(() => nameImeTextAreas(null, "lesson-editor-ime")).not.toThrow();
  });
});
