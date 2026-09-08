import api from "./api";

export async function getLessons() {
  const { data } = await api.get("/premium/lessons");
  return data;
}

export async function markLessonComplete(lessonId) {
  const { data } = await api.post("/premium/progress", {
    lesson_id: lessonId,
  });
  return data;
}
