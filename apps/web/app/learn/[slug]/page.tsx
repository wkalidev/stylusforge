import { LessonLayout } from '@/components/Lesson/LessonLayout';

export default function LessonPage({ params }: { params: { slug: string } }) {
  return <LessonLayout slug={params.slug} />;
}
