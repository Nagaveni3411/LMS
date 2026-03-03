import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { extractYoutubeVideoId, buildYoutubeWatchUrl } from "../src/utils/youtube.js";

const prisma = new PrismaClient();

async function upsertUser(data: { name: string; email: string; role: UserRole; password: string }) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  return prisma.user.upsert({
    where: { email: data.email },
    create: { name: data.name, email: data.email, role: data.role, passwordHash },
    update: { name: data.name, role: data.role, passwordHash },
  });
}

async function main() {
  const instructor = await upsertUser({
    name: "Alex Instructor",
    email: "instructor@lms.dev",
    role: UserRole.INSTRUCTOR,
    password: "Password123!",
  });

  await upsertUser({
    name: "Sam Student",
    email: "student@lms.dev",
    role: UserRole.STUDENT,
    password: "Password123!",
  });

  await upsertUser({
    name: "Admin User",
    email: "admin@lms.dev",
    role: UserRole.ADMIN,
    password: "Password123!",
  });

  const course = await prisma.course.upsert({
    where: { id: "course-react-fundamentals" },
    create: {
      id: "course-react-fundamentals",
      title: "React Fundamentals for Production Apps",
      thumbnailUrl: "https://img.youtube.com/vi/w7ejDZ8SWv8/maxresdefault.jpg",
      shortDescription: "Build modern React applications with robust state and routing patterns.",
      description:
        "This course teaches practical React foundations for building maintainable web applications, from component architecture to API integration and route-based UX.",
      learningOutcomes: [
        "Build reusable React components",
        "Design route-based frontends",
        "Integrate APIs and handle loading/error states",
      ],
      instructorId: instructor.id,
    },
    update: {},
  });

  const section1 = await prisma.section.upsert({
    where: { id: "section-react-1" },
    create: { id: "section-react-1", courseId: course.id, title: "React Core", orderNo: 1 },
    update: {},
  });

  const section2 = await prisma.section.upsert({
    where: { id: "section-react-2" },
    create: { id: "section-react-2", courseId: course.id, title: "Routing and State", orderNo: 2 },
    update: {},
  });

  const lessons = [
    {
      id: "lesson-react-1",
      sectionId: section1.id,
      title: "What is React?",
      orderNo: 1,
      youtubeInput: "w7ejDZ8SWv8",
      durationSec: 780,
    },
    {
      id: "lesson-react-2",
      sectionId: section1.id,
      title: "Components and Props",
      orderNo: 2,
      youtubeInput: "I2UBjN5ER4s",
      durationSec: 1040,
    },
    {
      id: "lesson-react-3",
      sectionId: section2.id,
      title: "React Router Basics",
      orderNo: 1,
      youtubeInput: "Law7wfdg_ls",
      durationSec: 1180,
    },
    {
      id: "lesson-react-4",
      sectionId: section2.id,
      title: "Fetching API Data in React",
      orderNo: 2,
      youtubeInput: "0ZJgIjIuY7U",
      durationSec: 960,
    },
  ];

  for (const lesson of lessons) {
    const videoId = extractYoutubeVideoId(lesson.youtubeInput);
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      create: {
        id: lesson.id,
        sectionId: lesson.sectionId,
        title: lesson.title,
        orderNo: lesson.orderNo,
        youtubeVideoId: videoId,
        youtubeUrl: buildYoutubeWatchUrl(videoId),
        durationSec: lesson.durationSec,
      },
      update: {
        title: lesson.title,
        orderNo: lesson.orderNo,
        youtubeVideoId: videoId,
        youtubeUrl: buildYoutubeWatchUrl(videoId),
        durationSec: lesson.durationSec,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
