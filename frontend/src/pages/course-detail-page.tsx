import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { formatDuration } from "../lib/format";
import type { CourseDetail } from "../types";

export function CourseDetailPage() {
  const { courseId = "" } = useParams();
  const { user, token } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .courseById(courseId)
      .then((res) => setCourse(res.course))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load course"))
      .finally(() => setLoading(false));
  }, [courseId]);

  async function enroll() {
    if (!token) return;
    setEnrolling(true);
    try {
      await api.enrollInCourse(courseId, token);
      navigate(`/courses/${courseId}/learn`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) return <div className="centered">Loading course...</div>;
  if (error) return <div className="centered error">{error}</div>;
  if (!course) return <div className="centered">Course not found</div>;

  return (
    <div className="container">
      <Link to="/courses">&lt;- Back to Courses</Link>
      <article className="card detail-card">
        <img src={course.thumbnailUrl} alt={course.title} className="hero-thumb" />
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <p className="muted">Instructor: {course.instructor.name}</p>
        <p className="muted">
          {course.totalLessons} lessons | {formatDuration(course.totalDurationSec)}
        </p>
        <h3>Learning outcomes</h3>
        <ul>
          {course.learningOutcomes.map((outcome) => (
            <li key={outcome}>{outcome}</li>
          ))}
        </ul>
        <div className="row">
          {user?.role === "STUDENT" && (
            <button onClick={enroll} disabled={enrolling}>
              {enrolling ? "Enrolling..." : "Enroll now"}
            </button>
          )}
          {user && <Link to={`/courses/${course.id}/learn`}>Go to Learning Page</Link>}
        </div>
      </article>
    </div>
  );
}
