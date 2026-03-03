import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { formatDuration } from "../lib/format";
import type { CourseCard } from "../types";

export function CoursesPage() {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .courses()
      .then((res) => setCourses(res.courses))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load courses"))
      .finally(() => setLoading(false));
  }, []);

  async function handleEnroll(courseId: string) {
    if (!token) return;
    setEnrollingId(courseId);
    setNotice(null);
    try {
      await api.enrollInCourse(courseId, token);
      setNotice("Enrolled successfully. Open course details to start learning.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setEnrollingId(null);
    }
  }

  if (loading) return <div className="centered">Loading courses...</div>;
  if (error) return <div className="centered error">{error}</div>;

  return (
    <div className="container">
      <h1>Courses</h1>
      {notice && <p>{notice}</p>}
      <div className="course-grid">
        {courses.map((course) => (
          <article key={course.id} className="card course-card">
            <img src={course.thumbnailUrl} alt={course.title} className="thumb" />
            <h3>{course.title}</h3>
            <p>{course.shortDescription}</p>
            <p className="muted">Instructor: {course.instructor.name}</p>
            <p className="muted">
              {course.totalLessons} lessons | {formatDuration(course.totalDurationSec)}
            </p>
            <div className="row">
              <Link to={`/courses/${course.id}`}>View details</Link>
              {user?.role === "STUDENT" && (
                <button onClick={() => handleEnroll(course.id)} disabled={enrollingId === course.id}>
                  {enrollingId === course.id ? "Enrolling..." : "Enroll"}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
