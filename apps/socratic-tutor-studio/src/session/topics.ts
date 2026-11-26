import type { Topic } from "./types"

/**
 * Demo starters. These are visual exercises for the studio, not a Jane Street curriculum.
 * Each script hits diagnostic → teaching (wrong answer, then a narrower question) →
 * spaced review → one assessment beat.
 */
export const TOPICS: Topic[] = [
  {
    id: "css-grid",
    title: "CSS Grid placement",
    summary: "Tracks, named areas, and line numbers, on a small layout you can see.",
    caption: "Header across the top, side and main below. A demo layout, not a Jane Street curriculum.",
    subskills: [
      { id: "fr-tracks", name: "Fractional tracks" },
      { id: "named-areas", name: "Named areas" },
      { id: "line-placement", name: "Line placement" },
      { id: "gaps", name: "Gaps" },
    ],
    frames: [
      {
        id: "d-fr",
        phase: "diagnostic",
        focusId: "fr-tracks",
        tutor:
          "Diagnostic, one question at a time. Nothing is taught until this pass is done. A grid container is 300px wide with `grid-template-columns: 1fr 2fr` and no gap. How many pixels wide is the second column?",
        accept: ["200"],
        match: "any",
        scripted: "200px",
        onCorrect: [
          { type: "set-level", subskillId: "fr-tracks", level: 3, announce: false },
          { type: "covered", text: "fractional tracks with no gap" },
        ],
        onWrong: [
          { type: "set-level", subskillId: "fr-tracks", level: 1, announce: false },
          { type: "misconception", text: "missed the 1:2 split of a fixed container" },
        ],
        tell: "The two tracks share 300px in the ratio 1:2, so the second column is 200px.",
      },
      {
        id: "d-areas",
        phase: "diagnostic",
        focusId: "named-areas",
        tutor:
          'Next diagnostic question. The template is `"header header" "side main"`. Which area is the cell in row 2, column 2?',
        accept: ["main"],
        match: "any",
        scripted: "main",
        onCorrect: [
          { type: "set-level", subskillId: "named-areas", level: 3, announce: false },
          { type: "covered", text: "named template areas" },
        ],
        onWrong: [{ type: "set-level", subskillId: "named-areas", level: 1, announce: false }],
        tell: "Row 2, column 2 of that template is the area named main.",
      },
      {
        id: "d-lines",
        phase: "diagnostic",
        focusId: "line-placement",
        tutor:
          "Last diagnostic question. The grid has 3 explicit columns. An item sets `grid-column: 1 / -1`. How many column tracks does that item span?",
        accept: ["3", "three"],
        match: "any",
        scripted: "2",
        wrongEvidence: true,
        onWrong: [
          { type: "set-level", subskillId: "line-placement", level: 1, announce: false },
          { type: "misconception", text: "counted 1 / -1 as spanning two tracks" },
        ],
        onCorrect: [
          { type: "set-level", subskillId: "line-placement", level: 3, announce: false },
          { type: "covered", text: "negative line spans" },
        ],
        wrongNext: "t-lines",
        correctNext: "review-gap",
        tell: "On a 3-column grid, -1 is the last line (line 4), so 1 / -1 spans all 3 tracks.",
      },
      {
        id: "t-lines",
        phase: "teaching",
        focusId: "line-placement",
        tutorEvidence: "narrower",
        tutor:
          "I am not going to give that span. Count the vertical lines in a 3-column grid: both outer edges, and the lines between the columns. How many vertical lines is that?",
        tutorEasier: "Easier wording. Sketch three boxes in a row. How many vertical lines do you draw if you include both outer edges?",
        tutorHarder: "Harder wording. Answer with a number only. Vertical lines in a 3-column explicit grid, including both outer edges.",
        accept: ["4", "four"],
        match: "any",
        scripted: "4",
        onWrong: [],
        wrongNext: "t-lines",
        correctNext: "t-neg",
        tell: "A 3-column grid has 4 vertical lines: one before each column and one after the last.",
      },
      {
        id: "t-neg",
        phase: "teaching",
        focusId: "line-placement",
        tutor:
          "Number those lines from the left, starting at 1. `grid-column: 1 / -1` ends on the line you hit first when you count backward from the far edge. Which line number is that?",
        accept: ["4", "four"],
        match: "any",
        scripted: "4",
        onCorrect: [
          { type: "set-level", subskillId: "line-placement", level: 2, announce: true },
          { type: "covered", text: "negative line numbers" },
        ],
        correctNext: "t-retest",
        tell: "Counting backward, -1 names line 4, the line after the last column.",
      },
      {
        id: "t-retest",
        phase: "teaching",
        focusId: "line-placement",
        tutor:
          "Different angle, still one question: how many column tracks does `grid-column: 1 / -1` cover on that 3-column grid?",
        tutorEasier: "Easier wording. The item starts on the first line and stops on the last line of a 3-column grid. How many columns is that?",
        tutorHarder: "Harder wording. Reply with the track count only, for `grid-column: 1 / -1` on 3 columns.",
        accept: ["3", "three"],
        match: "any",
        scripted: "3",
        onCorrect: [{ type: "covered", text: "span from the first line through the end line" }],
        correctNext: "review-gap",
        tell: "From line 1 through line 4 covers 3 tracks.",
      },
      {
        id: "review-gap",
        phase: "review",
        focusId: "gaps",
        tutor:
          "Spaced review, no warning. The container is 300px wide with `grid-template-columns: 1fr 2fr`, and now `column-gap: 12px`. Is the second column still 200px? Give the new width if it changed.",
        accept: ["192"],
        match: "any",
        scripted: "No. The gap takes 12px, so the free space is 288px and the second column is 192px.",
        onCorrect: [
          { type: "set-level", subskillId: "gaps", level: 2, announce: false },
          { type: "covered", text: "a gap reduces free space before fr units are resolved" },
        ],
        onWrong: [{ type: "misconception", text: "treated a column gap as leaving the 1fr/2fr pixel widths unchanged" }],
        correctNext: "assess",
        tell: "12px of gap leaves 288px of free space. Two thirds of 288 is 192px, so the second column is no longer 200px.",
      },
      {
        id: "assess",
        phase: "assessment",
        focusId: "line-placement",
        tutor:
          "Final assessment beat for this pass. This is not a claim that every subskill is at the target. On a 3-column grid, what is the end line of `grid-column: 1 / -1`, and how many tracks does that span?",
        accept: ["4", "3"],
        match: "all",
        scripted: "End line 4, and it spans 3 tracks.",
        onCorrect: [{ type: "covered", text: "assessment beat: end line and span" }],
        tell: "The end line is 4, and the span is 3 tracks.",
      },
    ],
  },
  {
    id: "event-loop",
    title: "Browser event loop",
    summary: "Call stack, microtask checkpoint, and the task queue — which callback runs first.",
    caption: "The stack runs now. Promise callbacks wait in the microtask checkpoint. setTimeout waits on the task queue.",
    subskills: [
      { id: "call-stack", name: "Call stack" },
      { id: "microtasks", name: "Microtask checkpoint" },
      { id: "tasks", name: "Task queue" },
      { id: "order", name: "Promise vs timer order" },
    ],
    frames: [
      {
        id: "d-stack",
        phase: "diagnostic",
        focusId: "call-stack",
        tutor:
          "Diagnostic. A function `a` calls `b`, and `b` has not returned. Which function is on top of the call stack?",
        accept: ["b"],
        match: "any",
        scripted: "b",
        onCorrect: [
          { type: "set-level", subskillId: "call-stack", level: 3, announce: false },
          { type: "covered", text: "the call stack is the functions currently running" },
        ],
        onWrong: [{ type: "set-level", subskillId: "call-stack", level: 1, announce: false }],
        tell: "`b` is on top. It was called later and has not returned.",
      },
      {
        id: "d-micro",
        phase: "diagnostic",
        focusId: "microtasks",
        tutor: "A `Promise.then` callback is queued as which kind of job — a microtask, or a task?",
        accept: ["microtask"],
        match: "any",
        scripted: "a microtask",
        onCorrect: [
          { type: "set-level", subskillId: "microtasks", level: 2, announce: false },
          { type: "covered", text: "promise callbacks are microtasks" },
        ],
        onWrong: [{ type: "set-level", subskillId: "microtasks", level: 1, announce: false }],
        tell: "A `Promise.then` callback is a microtask.",
      },
      {
        id: "d-order",
        phase: "diagnostic",
        focusId: "order",
        tutor:
          "The call stack is empty. One callback was queued with `Promise.then`, and one with `setTimeout(fn, 0)`. Which callback runs first?",
        accept: ["promise callback", "promise.then"],
        match: "any",
        scripted: "the setTimeout callback",
        wrongEvidence: true,
        onWrong: [
          { type: "set-level", subskillId: "order", level: 1, announce: false },
          { type: "misconception", text: "expected setTimeout(0) to run before an already queued promise callback" },
        ],
        onCorrect: [
          { type: "set-level", subskillId: "order", level: 3, announce: false },
          { type: "covered", text: "a queued promise callback runs before the next timer task" },
        ],
        wrongNext: "t-where",
        correctNext: "review-stack",
        tell: "The promise callback runs first. It is a microtask, and that checkpoint is emptied before the next task.",
      },
      {
        id: "t-where",
        phase: "teaching",
        focusId: "order",
        tutorEvidence: "narrower",
        tutor:
          "I will not name the winner. Where is the `Promise.then` callback waiting — in the microtask checkpoint, or in the task queue?",
        accept: ["microtask"],
        match: "any",
        scripted: "in the microtask checkpoint",
        correctNext: "t-which",
        tell: "A `Promise.then` callback waits in the microtask checkpoint, not the task queue.",
      },
      {
        id: "t-which",
        phase: "teaching",
        focusId: "order",
        tutor:
          "The promise callback is in the microtask checkpoint. The timer callback is a task. Which of those does the event loop finish before it starts a new task — the checkpoint, or the task queue?",
        accept: ["checkpoint", "microtask"],
        match: "any",
        scripted: "the microtask checkpoint",
        onCorrect: [
          { type: "set-level", subskillId: "order", level: 2, announce: true },
          { type: "covered", text: "the microtask checkpoint is emptied before the next task" },
        ],
        correctNext: "t-retest",
        tell: "The event loop finishes the microtask checkpoint before it takes the next task.",
      },
      {
        id: "t-retest",
        phase: "teaching",
        focusId: "order",
        tutor: "Different angle. The stack is empty and both callbacks are queued. Which callback runs first?",
        tutorEasier: "Easier wording. The checkpoint is emptied before a new task starts. Which callback is in that checkpoint?",
        tutorHarder: "Harder wording. Name only the callback that runs first. Do not describe the queues.",
        accept: ["promise callback", "promise.then"],
        match: "any",
        scripted: "the promise callback",
        onCorrect: [{ type: "covered", text: "retest: the promise callback runs before the timer" }],
        correctNext: "review-stack",
        tell: "The promise callback runs first.",
      },
      {
        id: "review-stack",
        phase: "review",
        focusId: "call-stack",
        tutor: "Spaced review. Function `a` is running and calls `b`. `b` has not returned. Which function is on top of the call stack?",
        accept: ["b"],
        match: "any",
        scripted: "b",
        onCorrect: [{ type: "covered", text: "review: the callee is on top of the stack until it returns" }],
        correctNext: "assess",
        tell: "`b` is on top until it returns.",
      },
      {
        id: "assess",
        phase: "assessment",
        focusId: "tasks",
        tutor:
          "Assessment beat for this pass. Name the queue that holds `setTimeout(fn, 0)`, and say whether that callback runs before or after an already queued `Promise.then`.",
        accept: ["the task queue", "after"],
        match: "all",
        scripted: "setTimeout sits on the task queue, and it runs after the promise callback.",
        onCorrect: [
          { type: "set-level", subskillId: "tasks", level: 2, announce: false },
          { type: "covered", text: "assessment beat: timers are tasks and run after queued microtasks" },
        ],
        tell: "`setTimeout` sits on the task queue, and that callback runs after the promise callback.",
      },
    ],
  },
  {
    id: "svg-viewbox",
    title: "SVG viewBox coordinates",
    summary: "How min-x, min-y, width, and height map user units onto the viewport.",
    caption: "The element is 200 by 200 CSS pixels. viewBox is 0 0 100 100. The circle is at cx=100.",
    subskills: [
      { id: "viewbox-numbers", name: "viewBox numbers" },
      { id: "user-units", name: "User units" },
      { id: "aspect", name: "preserveAspectRatio" },
      { id: "point-map", name: "Point mapping" },
    ],
    frames: [
      {
        id: "d-numbers",
        phase: "diagnostic",
        focusId: "viewbox-numbers",
        tutor:
          'Diagnostic. `viewBox="0 0 100 50"`. What do the third and fourth numbers describe — the viewport CSS size, or the width and height of the user coordinate system?',
        accept: ["user coordinate"],
        match: "any",
        scripted: "the width and height of the user coordinate system",
        onCorrect: [
          { type: "set-level", subskillId: "viewbox-numbers", level: 3, announce: false },
          { type: "covered", text: "the last two viewBox numbers are the user-space width and height" },
        ],
        onWrong: [{ type: "set-level", subskillId: "viewbox-numbers", level: 1, announce: false }],
        tell: "The third and fourth numbers are the width and height of the user coordinate system, not the CSS pixel size of the element.",
      },
      {
        id: "d-point",
        phase: "diagnostic",
        focusId: "point-map",
        tutor:
          'The SVG element is 200 by 200 CSS pixels. `viewBox="0 0 100 100"`. A circle has `cx="100"`. Where does that circle sit, left to right, in the viewport — the center, or the far edge?',
        accept: ["far edge", "right edge"],
        match: "any",
        scripted: "the center",
        wrongEvidence: true,
        onWrong: [
          { type: "set-level", subskillId: "point-map", level: 1, announce: false },
          { type: "misconception", text: "treated viewBox x=100 as the center of a 200px viewport" },
        ],
        onCorrect: [
          { type: "set-level", subskillId: "point-map", level: 3, announce: false },
          { type: "covered", text: "viewBox max x maps to the far side of the viewport" },
        ],
        wrongNext: "t-units",
        correctNext: "review-numbers",
        tell: "cx=100 is the maximum x of the viewBox, so the circle sits on the far edge of the viewport, not the center.",
      },
      {
        id: "t-units",
        phase: "teaching",
        focusId: "user-units",
        tutorEvidence: "narrower",
        tutor:
          "I will not place the circle for you. The viewBox width is 100 user units. The circle's cx is 100. Is cx at the middle of that viewBox, or at its maximum x?",
        accept: ["maximum"],
        match: "any",
        scripted: "at its maximum x",
        onCorrect: [
          { type: "set-level", subskillId: "user-units", level: 2, announce: false },
          { type: "covered", text: "a viewBox width of 100 makes x=100 the maximum, not the midpoint" },
        ],
        correctNext: "t-map",
        tell: "cx=100 is the maximum x of a viewBox whose width is 100, not the middle.",
      },
      {
        id: "t-map",
        phase: "teaching",
        focusId: "point-map",
        tutor:
          "The viewBox x runs from 0 to 100 and is mapped across the viewport width. cx is 100, the end of that range. Does the circle land halfway across the viewport, or at the end of the viewport width?",
        accept: ["end of the viewport"],
        match: "any",
        scripted: "at the end of the viewport width",
        onCorrect: [
          { type: "set-level", subskillId: "point-map", level: 2, announce: true },
          { type: "covered", text: "the end of the viewBox x range maps to the end of the viewport width" },
        ],
        correctNext: "t-retest",
        tell: "It lands at the end of the viewport width, because cx is the end of the viewBox x range.",
      },
      {
        id: "t-retest",
        phase: "teaching",
        focusId: "point-map",
        tutor:
          'Different angle. Same SVG. A rect has `x="0"` and `width="50"` in user units. Does that rect cover the left half of the viewport, or a quarter of it?',
        tutorEasier: "Easier wording. 50 is what fraction of the viewBox width 100? The viewport shows that same fraction.",
        tutorHarder: "Harder wording. Answer with half or quarter only.",
        accept: ["half"],
        match: "any",
        scripted: "the left half",
        onCorrect: [{ type: "covered", text: "half of the viewBox width is half of the viewport" }],
        correctNext: "review-numbers",
        tell: "50 is half of the viewBox width 100, so the rect covers the left half of the viewport.",
      },
      {
        id: "review-numbers",
        phase: "review",
        focusId: "viewbox-numbers",
        tutor: 'Spaced review. In `viewBox="10 20 100 50"`, what does 20 set — min-y, or the height?',
        accept: ["min-y"],
        match: "any",
        scripted: "min-y",
        onCorrect: [{ type: "covered", text: "review: the second viewBox number is min-y" }],
        correctNext: "assess",
        tell: "20 is min-y. The height is the fourth number, 50.",
      },
      {
        id: "assess",
        phase: "assessment",
        focusId: "point-map",
        tutor:
          'Assessment beat for this pass. `viewBox="0 0 100 100"` on a 200 by 200 viewport. Give the user-unit x of the far edge, and say which viewport edge that x touches.',
        accept: ["100", "right"],
        match: "all",
        scripted: "The far edge is user-unit x 100, and it touches the right edge of the viewport.",
        onCorrect: [{ type: "covered", text: "assessment beat: viewBox max x and the viewport edge" }],
        tell: "The far edge is user-unit x 100, and it touches the right edge of the viewport.",
      },
    ],
  },
]

export function topicById(topicId: string): Topic {
  const topic = TOPICS.find((item) => item.id === topicId)
  if (!topic) throw new Error(`Unknown topic: ${topicId}`)
  return topic
}

export function topicByTitle(title: string): Topic | null {
  return TOPICS.find((item) => item.title === title) ?? null
}

export function frameById(topic: Topic, frameId: string): Topic["frames"][number] {
  const frame = topic.frames.find((item) => item.id === frameId)
  if (!frame) throw new Error(`Unknown frame ${frameId} on ${topic.id}`)
  return frame
}
