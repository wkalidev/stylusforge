import { notFound } from 'next/navigation';
import { LessonLayout } from '@/components/Lesson/LessonLayout';
import { LESSONS, getLesson } from '@/lib/curriculum/lessons';

/** Only available lessons have a page; any other slug is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return LESSONS.filter((lesson) => lesson.available).map((lesson) => ({ slug: lesson.slug }));
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getLesson(slug)?.available) {
    notFound();
  }
  return <LessonLayout slug={slug} />;
}
