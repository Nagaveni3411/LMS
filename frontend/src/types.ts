export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type CourseCard = {
  id: string;
  title: string;
  thumbnailUrl: string;
  shortDescription: string;
  instructor: { id: string; name: string };
  totalLessons: number;
  totalDurationSec: number;
};

export type CourseDetail = {
  id: string;
  title: string;
  thumbnailUrl: string;
  shortDescription: string;
  description: string;
  learningOutcomes: string[];
  instructor: { id: string; name: string };
  totalLessons: number;
  totalDurationSec: number;
};

export type Lesson = {
  id: string;
  sectionId: string;
  sectionTitle?: string;
  sectionOrderNo?: number;
  title: string;
  orderNo: number;
  youtubeVideoId: string;
  youtubeUrl: string;
  durationSec: number;
};

export type LearnResponse = {
  course: { id: string; title: string; thumbnailUrl: string; instructor: { id: string; name: string } };
  sections: {
    id: string;
    title: string;
    orderNo: number;
    lessons: Omit<Lesson, "sectionTitle" | "sectionOrderNo" | "sectionId">[];
  }[];
  flatLessons: Lesson[];
  progress: {
    completedLessonIds: string[];
    percentage: number;
    resumeLessonId: string | null;
  };
};
