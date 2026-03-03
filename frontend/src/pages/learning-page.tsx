import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { formatDuration } from "../lib/format";
import type { LearnResponse, Lesson } from "../types";

export function LearningPage() {
  const { courseId = "" } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState<LearnResponse | null>(null);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [percentage, setPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getLearningData(courseId, token)
      .then((res) => {
        setData(res);
        setCompletedIds(new Set(res.progress.completedLessonIds));
        setPercentage(res.progress.percentage);
        setCurrentLessonId(res.progress.resumeLessonId ?? res.flatLessons[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load learning data"))
      .finally(() => setLoading(false));
  }, [courseId, token]);

  const lessons = data?.flatLessons ?? [];
  const currentIndex = lessons.findIndex((lesson) => lesson.id === currentLessonId);
  const currentLesson = currentIndex >= 0 ? lessons[currentIndex] : null;
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 ? lessons[currentIndex + 1] : null;

  const bySection = useMemo(() => {
    const map = new Map<string, { id: string; title: string; lessons: Lesson[] }>();
    for (const lesson of lessons) {
      const key = lesson.sectionId;
      if (!map.has(key)) {
        map.set(key, { id: key, title: lesson.sectionTitle ?? "Section", lessons: [] });
      }
      map.get(key)!.lessons.push(lesson);
    }
    return Array.from(map.values());
  }, [lessons]);

  async function markLesson(status: "IN_PROGRESS" | "COMPLETED", lessonId: string) {
    if (!token) return;
    setSavingProgress(true);
    try {
      await api.markProgress({ courseId, lessonId, status }, token);
      if (status === "COMPLETED") {
        const updated = new Set(completedIds);
        updated.add(lessonId);
        setCompletedIds(updated);
        setPercentage(lessons.length === 0 ? 0 : Math.round((updated.size / lessons.length) * 100));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update progress");
    } finally {
      setSavingProgress(false);
    }
  }

  async function selectLesson(lessonId: string) {
    setCurrentLessonId(lessonId);
    await markLesson("IN_PROGRESS", lessonId);
  }

  async function completeAndNext() {
    if (!currentLesson) return;
    await markLesson("COMPLETED", currentLesson.id);
    if (nextLesson) {
      await selectLesson(nextLesson.id);
    }
  }

  if (loading) return <div className="centered">Loading learning page...</div>;
  if (error) return <div className="centered error">{error}</div>;
  if (!data || lessons.length === 0) return <div className="centered">No lessons yet in this course.</div>;

  return (
    <div className="learning-shell">
      <main className="learning-main">
        <Link to={`/courses/${courseId}`}>&lt;- Course details</Link>
        <h1>{data.course.title}</h1>
        {currentLesson && (
          <>
            <div className="video-wrap">
              <iframe
                src={`https://www.youtube.com/embed/${currentLesson.youtubeVideoId}`}
                title={currentLesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <h2>{currentLesson.title}</h2>
            <p className="muted">Duration: {formatDuration(currentLesson.durationSec)}</p>
            <div className="row">
              <button onClick={() => prevLesson && selectLesson(prevLesson.id)} disabled={!prevLesson || savingProgress}>
                Previous
              </button>
              <button onClick={completeAndNext} disabled={savingProgress}>
                {savingProgress ? "Saving..." : "Mark complete & Next"}
              </button>
              <button onClick={() => nextLesson && selectLesson(nextLesson.id)} disabled={!nextLesson || savingProgress}>
                Next
              </button>
            </div>
          </>
        )}
      </main>
      <aside className="sidebar">
        <div className="card progress-card">
          <h3>Progress</h3>
          <p>{percentage}% complete</p>
          <progress max={100} value={percentage} />
          <p className="muted">
            {completedIds.size} / {lessons.length} lessons completed
          </p>
        </div>
        <div className="card lesson-list">
          <h3>Lessons</h3>
          {bySection.map((section) => (
            <div key={section.id} className="section-block">
              <h4>{section.title}</h4>
              <ul>
                {section.lessons.map((lesson) => {
                  const isCurrent = currentLessonId === lesson.id;
                  const done = completedIds.has(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <button className={`lesson-btn ${isCurrent ? "active" : ""}`} onClick={() => void selectLesson(lesson.id)}>
                        <span>{lesson.title}</span>
                        <span>{done ? "Done" : formatDuration(lesson.durationSec)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
