import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { extractYoutubeVideoId, buildYoutubeWatchUrl } from "../utils/youtube.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const createCourseSchema = z.object({
  title: z.string().min(3),
  thumbnailUrl: z.string().url(),
  shortDescription: z.string().min(10).max(220),
  description: z.string().min(20),
  learningOutcomes: z.array(z.string().min(3)).min(1),
});

const createSectionSchema = z.object({
  title: z.string().min(2),
  orderNo: z.number().int().positive(),
});

const createLessonSchema = z.object({
  title: z.string().min(2),
  orderNo: z.number().int().positive(),
  youtubeUrlOrId: z.string().min(5),
  durationSec: z.number().int().positive(),
});

export const coursesRouter = Router();

coursesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        instructor: { select: { id: true, name: true } },
        sections: { include: { lessons: true } },
      },
    });

    const payload = courses.map((course) => {
      const lessons = course.sections.flatMap((section) => section.lessons);
      const totalLessons = lessons.length;
      const totalDurationSec = lessons.reduce((acc, lesson) => acc + lesson.durationSec, 0);
      return {
        id: course.id,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl,
        shortDescription: course.shortDescription,
        instructor: course.instructor,
        totalLessons,
        totalDurationSec,
      };
    });

    res.json({ courses: payload });
  }),
);

coursesRouter.get(
  "/:courseId",
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.courseId },
      include: {
        instructor: { select: { id: true, name: true } },
        sections: {
          orderBy: { orderNo: "asc" },
          include: {
            lessons: {
              orderBy: { orderNo: "asc" },
              select: { id: true, title: true, orderNo: true, durationSec: true },
            },
          },
        },
      },
    });

    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    const totalLessons = course.sections.reduce((acc, s) => acc + s.lessons.length, 0);
    const totalDurationSec = course.sections.reduce(
      (acc, s) => acc + s.lessons.reduce((sum, l) => sum + l.durationSec, 0),
      0,
    );

    res.json({
      course: {
        id: course.id,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl,
        shortDescription: course.shortDescription,
        description: course.description,
        learningOutcomes: course.learningOutcomes,
        instructor: course.instructor,
        totalLessons,
        totalDurationSec,
      },
    });
  }),
);

coursesRouter.post(
  "/",
  requireAuth,
  requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const input = createCourseSchema.parse(req.body);
    const instructorId = req.auth!.role === UserRole.INSTRUCTOR ? req.auth!.userId : req.body.instructorId ?? req.auth!.userId;
    const course = await prisma.course.create({
      data: {
        ...input,
        instructorId,
      },
    });
    res.status(201).json({ course });
  }),
);

coursesRouter.post(
  "/:courseId/sections",
  requireAuth,
  requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const input = createSectionSchema.parse(req.body);
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }
    if (req.auth!.role === UserRole.INSTRUCTOR && course.instructorId !== req.auth!.userId) {
      res.status(403).json({ message: "You cannot modify this course" });
      return;
    }
    const section = await prisma.section.create({
      data: { courseId: course.id, title: input.title, orderNo: input.orderNo },
    });
    res.status(201).json({ section });
  }),
);

coursesRouter.post(
  "/:courseId/sections/:sectionId/lessons",
  requireAuth,
  requireRole([UserRole.INSTRUCTOR, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const input = createLessonSchema.parse(req.body);
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }
    if (req.auth!.role === UserRole.INSTRUCTOR && course.instructorId !== req.auth!.userId) {
      res.status(403).json({ message: "You cannot modify this course" });
      return;
    }
    const section = await prisma.section.findUnique({ where: { id: req.params.sectionId } });
    if (!section || section.courseId !== course.id) {
      res.status(404).json({ message: "Section not found for this course" });
      return;
    }

    const videoId = extractYoutubeVideoId(input.youtubeUrlOrId);
    const lesson = await prisma.lesson.create({
      data: {
        sectionId: section.id,
        title: input.title,
        orderNo: input.orderNo,
        durationSec: input.durationSec,
        youtubeVideoId: videoId,
        youtubeUrl: buildYoutubeWatchUrl(videoId),
      },
    });

    res.status(201).json({ lesson });
  }),
);

coursesRouter.get(
  "/:courseId/learn",
  requireAuth,
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.courseId },
      include: {
        instructor: { select: { id: true, name: true } },
        sections: {
          orderBy: { orderNo: "asc" },
          include: { lessons: { orderBy: { orderNo: "asc" } } },
        },
      },
    });

    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    const isStudent = req.auth!.role === UserRole.STUDENT;
    if (isStudent) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.auth!.userId, courseId: course.id } },
      });
      if (!enrollment) {
        res.status(403).json({ message: "Enroll in course to continue learning" });
        return;
      }
    }
    if (req.auth!.role === UserRole.INSTRUCTOR && course.instructorId !== req.auth!.userId) {
      res.status(403).json({ message: "You cannot access this course learning data" });
      return;
    }

    const flatLessons = course.sections.flatMap((section) =>
      section.lessons.map((lesson) => ({
        id: lesson.id,
        sectionId: section.id,
        sectionTitle: section.title,
        sectionOrderNo: section.orderNo,
        title: lesson.title,
        orderNo: lesson.orderNo,
        youtubeVideoId: lesson.youtubeVideoId,
        youtubeUrl: lesson.youtubeUrl,
        durationSec: lesson.durationSec,
      })),
    );

    const progressRows = await prisma.progress.findMany({
      where: { userId: req.auth!.userId, courseId: course.id },
      orderBy: { lastWatchedAt: "desc" },
    });
    const completedLessonIds = progressRows.filter((p) => p.status === "COMPLETED").map((p) => p.lessonId);
    const completedSet = new Set(completedLessonIds);
    const firstIncomplete = flatLessons.find((lesson) => !completedSet.has(lesson.id));
    const lastWatchedLessonId = progressRows[0]?.lessonId;
    const resumeLessonId = lastWatchedLessonId ?? firstIncomplete?.id ?? flatLessons[0]?.id ?? null;
    const percentage = flatLessons.length === 0 ? 0 : Math.round((completedLessonIds.length / flatLessons.length) * 100);

    res.json({
      course: {
        id: course.id,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl,
        instructor: course.instructor,
      },
      sections: course.sections.map((section) => ({
        id: section.id,
        title: section.title,
        orderNo: section.orderNo,
        lessons: section.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          orderNo: lesson.orderNo,
          youtubeVideoId: lesson.youtubeVideoId,
          youtubeUrl: lesson.youtubeUrl,
          durationSec: lesson.durationSec,
        })),
      })),
      flatLessons,
      progress: {
        completedLessonIds,
        percentage,
        resumeLessonId,
      },
    });
  }),
);
