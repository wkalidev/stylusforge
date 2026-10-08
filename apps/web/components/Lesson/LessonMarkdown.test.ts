import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LessonMarkdown } from "./LessonMarkdown";

const render = (markdown: string) => renderToStaticMarkup(createElement(LessonMarkdown, null, markdown));

describe("LessonMarkdown", () => {
  it("opens links in a new tab, without giving the page access to the opener", () => {
    const html = render("> See the [official notice](https://docs.arbitrum.io/notices/stylus-activation-pause-notice).");
    expect(html).toContain('<a href="https://docs.arbitrum.io/notices/stylus-activation-pause-notice" target="_blank" rel="noopener noreferrer"');
    expect(html).toContain(">official notice</a>");
    expect(html).toContain("<blockquote");
  });
});
