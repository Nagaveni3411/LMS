import { Router } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const enrollmentsRouter = Router();

function firstParam(param: string | string[] | undefined): string | null {
  if (typeof param === "string" && param.length > 0) return param;
  if (Array.isArray(param) && param[0]) return param[0];
  return null;
}

enrollmentsRouter.post(
  "/courses/:courseId/enroll",
  requireAuth,
  requireRole([UserRole.STUDENT, UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const courseId = firstParam(req.params.courseId);
    if (!courseId) {
      res.status(400).json({ message: "Invalid courseId" });
      return;
    }
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: req.auth!.userId,
          courseId: course.id,
        },
      },
      create: {
        userId: req.auth!.userId,
        courseId: course.id,
      },
      update: {},
    });

    res.status(201).json({ enrollment });
  }),
);

enrollmentsRouter.get(
  "/me/enrollments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.auth!.userId },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true } },
            sections: { include: { lessons: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    res.json({
      enrollments: enrollments.map((item) => ({
        id: item.id,
        enrolledAt: item.enrolledAt,
        course: {
          id: item.course.id,
          title: item.course.title,
          thumbnailUrl: item.course.thumbnailUrl,
          shortDescription: item.course.shortDescription,
          instructor: item.course.instructor,
          totalLessons: item.course.sections.reduce((acc, s) => acc + s.lessons.length, 0),
        },
      })),
    });
  }),
);
