import modules from '../../../../curriculum/modules.json';
import { LESSONS, type Lesson } from './lessons';

export interface CurriculumModule {
  id: string;
  name: string;
  /** The forge zone the module is shown as, next to its name. */
  zone: string;
  /** The module's lessons, in curriculum order. */
  lessons: Lesson[];
}

/** The modules of curriculum/modules.json, in order, each with its lessons. */
export const MODULES: CurriculumModule[] = modules.map(({ id, name, zone }) => ({
  id,
  name,
  zone,
  lessons: LESSONS.filter((lesson) => lesson.module === id),
}));
