import type { CourseCard, CourseDetail, LearnResponse, Role, User } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

type RequestOptions = {
  method?: "GET" | "POST";
  token?: string | null;
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? "API request failed");
  }
  return data as T;
}

export const api = {
  register: (payload: { name: string; email: string; password: string; role: Role }) =>
    request<{ token: string; user: User }>("/auth/register", { method: "POST", body: payload }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/login", { method: "POST", body: payload }),

  me: (token: string) => request<{ user: User }>("/auth/me", { token }),

  courses: () => request<{ courses: CourseCard[] }>("/courses"),

  courseById: (courseId: string) => request<{ course: CourseDetail }>(`/courses/${courseId}`),

  enrollInCourse: (courseId: string, token: string) =>
    request<{ enrollment: { id: string } }>(`/courses/${courseId}/enroll`, { method: "POST", token }),

  getLearningData: (courseId: string, token: string) =>
    request<LearnResponse>(`/courses/${courseId}/learn`, { token }),

  markProgress: (payload: { courseId: string; lessonId: string; status: "IN_PROGRESS" | "COMPLETED" }, token: string) =>
    request<{ progress: { id: string } }>("/progress", { method: "POST", token, body: payload }),
};
