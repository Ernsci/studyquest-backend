import {
  firstDemoLesson,
  getDemoLesson,
  getDemoQuestion,
  getDemoSubject,
  lessonDemoQuestions,
  listDemoLessons,
  listDemoQuestions,
  listDemoSubjects,
} from "../demo/content";
import type { ContentSource } from "./types";

/**
 * Content reads backed by the bundled sample lessons. Ids are deterministic, so
 * progress recorded against them survives a restart of this process.
 */

export function createDemoContentSource(): ContentSource {
  return {
    async listSubjects() {
      return listDemoSubjects();
    },

    async getSubject(subjectSlug) {
      return getDemoSubject(subjectSlug);
    },

    async getLesson(subjectSlug, lessonSlug) {
      return getDemoLesson(subjectSlug, lessonSlug);
    },

    async listLessons() {
      return listDemoLessons();
    },

    async listQuestions(subjectSlug) {
      return subjectSlug ? listDemoQuestions(subjectSlug) : listDemoQuestions();
    },

    async getQuestion(id) {
      return getDemoQuestion(id);
    },

    async adjacentLesson(subjectSlug, lessonSlug) {
      const subject = getDemoSubject(subjectSlug);
      if (!subject) return { prev: null, next: null };
      const flat = subject.lessonIndex;
      const index = flat.findIndex((item) => item.slug === lessonSlug);
      if (index < 0) return { prev: null, next: null };
      const prev = flat[index - 1];
      const next = flat[index + 1];
      return {
        prev: prev ? { slug: prev.slug, title: prev.title } : null,
        next: next ? { slug: next.slug, title: next.title } : null,
      };
    },
  };
}

/** Questions belonging to one lesson of the bundled content. */
export function demoLessonQuestions(subjectSlug: string, lessonSlug: string) {
  return lessonDemoQuestions(subjectSlug, lessonSlug);
}

export function demoFirstLesson(subjectSlug: string) {
  return firstDemoLesson(subjectSlug);
}
