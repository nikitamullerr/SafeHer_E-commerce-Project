import api from "./api.js";

export async function getLessons() {
  const { data } = await api.get("/premium/lessons");
  return data;
}

export async function getLessonProgress() {
  const { data } = await api.get("/premium/progress");
  return data;
}

export async function markLessonComplete(lessonId) {
  const { data } = await api.post("/premium/progress", {
    lesson_id: lessonId,
  });
  return data;
}

export default {
  getLessons,
  getLessonProgress,
  markLessonComplete,
};
