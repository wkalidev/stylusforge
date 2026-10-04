/** One step of a lesson explanation. */
export interface LessonStep {
  title: string;
  /** Markdown of the step, without its heading. */
  body: string;
}

/** An optional question shown after a step. */
export interface LessonQuiz {
  /** Title of the step the question follows. */
  afterStep: string;
  question: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  /** Shown once answered, right or wrong. */
  explanation: string;
}

/**
 * Splits a lesson explanation into steps: the `## ` title and its introduction form the first
 * step, then each `### ` section is a step titled by its heading.
 */
export function splitSteps(markdown: string): LessonStep[] {
  const steps: LessonStep[] = [];
  let title = '';
  let body: string[] = [];
  const flush = () => {
    const text = body.join('\n').trim();
    if (title || text) steps.push({ title, body: text });
  };
  for (const line of markdown.split('\n')) {
    if (line.startsWith('### ')) {
      flush();
      title = line.slice(4).trim();
      body = [];
    } else if (line.startsWith('## ') && steps.length === 0 && !title) {
      title = line.slice(3).trim();
    } else {
      body.push(line);
    }
  }
  flush();
  return steps;
}
