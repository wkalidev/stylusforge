'use client';
import { getLesson } from '@/lib/curriculum/lessons';
import { LessonWorkspace } from './LessonWorkspace';

export function LessonLayout({ slug }: { slug: string }) {
  const lesson = getLesson(slug);
  if (!lesson?.available) {
    return (
      <div className='flex min-h-[50vh] items-center justify-center'>
        <p className='text-steel-400'>Lesson not found</p>
      </div>
    );
  }
  return <LessonWorkspace lesson={lesson} />;
}
