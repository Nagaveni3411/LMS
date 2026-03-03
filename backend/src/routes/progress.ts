import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireAuth } from "../middleware/auth.js";

const progressSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]),
});

export const progressRouter = Router();

function firstParam(param: string | string[] | undefined): string | null {
  if (typeof param === "string" && param.length > 0) return param;
  if (Array.isArray(param) && param[0]) return param[0];
  return null;
}

progressRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = progressSchema.parse(req.body);
    const lesson = await prisma.lesson.findUnique({
      where: { id: input.lessonId },
      include: { section: true },
    });
    if (!lesson || lesson.section.courseId !== input.courseId) {
      res.status(404).json({ message: "Lesson not found in course" });
      return;
    }
    if (req.auth!.role === UserRole.STUDENT) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.auth!.userId, courseId: input.courseId } },
      });
      if (!enrollment) {
        res.status(403).json({ message: "You must enroll to update lesson progress" });
        return;
      }
    }

    const progress = await prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: req.auth!.userId,
          lessonId: input.lessonId,
        },
      },
      create: {
        userId: req.auth!.userId,
        courseId: input.courseId,
        lessonId: input.lessonId,
        status: input.status,
        completedAt: input.status === "COMPLETED" ? new Date() : null,
        lastWatchedAt: new Date(),
      },
      update: {
        status: input.status,
        completedAt: input.status === "COMPLETED" ? new Date() : null,
        lastWatchedAt: new Date(),
      },
    });

    res.status(201).json({ progress });
  }),
);

progressRouter.get(
  "/:courseId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const courseId = firstParam(req.params.courseId);
    if (!courseId) {
      res.status(400).json({ message: "Invalid courseId" });
      return;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { sections: { include: { lessons: true } } },
    });
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }
    const totalLessons = course.sections.reduce((acc, section) => acc + section.lessons.length, 0);
    const progressRows = await prisma.progress.findMany({
      where: { userId: req.auth!.userId, courseId: course.id },
      orderBy: { lastWatchedAt: "desc" },
    });
    const completedLessonIds = progressRows.filter((row) => row.status === "COMPLETED").map((row) => row.lessonId);
    const percentage = totalLessons === 0 ? 0 : Math.round((completedLessonIds.length / totalLessons) * 100);
    const resumeLessonId = progressRows[0]?.lessonId ?? null;

    res.json({
      progress: {
        completedLessonIds,
        percentage,
        totalLessons,
        resumeLessonId,
      },
    });
  }),
);
