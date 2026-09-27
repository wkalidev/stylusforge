import { LessonLayout } from '@/components/Lesson/LessonLayout';

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LessonLayout slug={slug} />;
}