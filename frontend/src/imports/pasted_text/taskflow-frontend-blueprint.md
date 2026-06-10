As a senior full-stack architect and UI designer, I have analyzed the entire ecosystem of your TaskFlow application. Below is the comprehensive, code-free blueprint of the frontend. This document describes exactly how the application looks, feels, behaves, and handles data, bridging the gap between your Neo-Brutalist design system and the hardened Spring Boot backend.

---

### 1. The Design System & Global Layout
**The Aesthetic: Neo-Brutalist Minimalism**
The UI rejects modern "soft" SaaS trends (no drop shadows, no blur, no gradients, no rounded corners). It relies on stark contrasts, heavy structural borders (`border-2 border-black`), and raw typography. 
*   **Typography:** A dual-font system. **Monospace** (e.g., JetBrains Mono or Fira Code) is used for all metadata, dates, stats, tags, and labels to give it a "terminal/productivity" feel. **Sans-serif** (e.g., Inter or Geist) is used strictly for Task Titles and Descriptions for readability.
*   **Color Palette:** 
    *   *Canvas:* Off-white (`#F5F5F4`) to reduce eye strain.
    *   *Surfaces:* Pure white (`#FFFFFF`) for panels and cards.
    *   *Accents:* Stark Black (`#000000`) for borders/text, Vibrant Orange (`#F97316`) for primary actions (New Task), Semantic Red (Overdue), Emerald (Upcoming/Done), Amber (Today).
*   **Hover States (The Brutalist Pop):** Instead of soft glows, interactive elements (cards, buttons) use a hard translation on hover: they shift 2px left and 2px up, revealing a solid black "shadow" block underneath them.

**The Layout Structure**
The app is a fixed, full-viewport desktop application (no scrolling on the main body).
1.  **Topbar (Fixed, 48px height):** Spans the entire width. Black background, white text. Anchors the app.
2.  **Left Panel (Fixed, 320px width):** The "Command Center". Contains the Calendar, Stats, and Filters. Separated from the right panel by a heavy 2px black vertical border.
3.  **Right Panel (Flex-1, remaining width):** The "Action Area". Contains the Task List. Scrollable vertically.

---

### 2. Component Breakdown & Functionality

#### A. The Topbar
*   **Left Side:** The Logo. A stark black square icon followed by `TASKFLOW` in tracked-out, uppercase monospace.
*   **Right Side:** The Global `+ NEW TASK` button. Orange background, black border, white text. Clicking this instantly opens the Create Modal.

#### B. The Left Panel (Command Center)
*   **Month Navigator:** 
    *   Displays `JUNE 2026` in large, bold monospace. 
    *   Flanked by brutalist `[ < ]` and `[ > ]` square buttons to paginate the calendar.
    *   *Interaction:* Clicking the "JUNE 2026" text itself opens a minimal, brutalist dropdown overlay to quickly jump to a specific Year.
*   **The Calendar Grid:**
    *   A strict 7-column CSS grid. Days of the week (Mo Tu We...) in tiny, muted monospace.
    *   **Current Month:** Stark black text on white.
    *   **Next Month Preview:** The first 1-2 weeks of the next month are rendered at the bottom in a very light gray (`text-stone-300`), but remain fully clickable.
    *   **Today:** A solid black background with white text.
    *   **Selected Date:** A thick, 2px orange outline.
    *   **Task Indicators:** If a day has tasks, a small 4px orange square dot sits below the date number.
*   **Stats Row:** Three columns separated by vertical borders. Displays `OVERDUE` (Red), `TODAY` (Orange), and `WEEK` (Black) counts in large 24px font. Computed instantly on the client side.
*   **Category Filters:** A horizontal scrollable row of chips (`ALL`, `WORK`, `PERSONAL`). Active chip is solid black with white text; inactive is white with black border.

#### C. The Right Panel (Action Area)
*   **Panel Header:** 
    *   Shows the current context (e.g., `ALL TASKS` or `JUNE 9, 2026`).
    *   Includes a local search bar (monospace, bottom-border only) to instantly filter tasks by title.
    *   Includes status filter chips (`ACTIVE`, `DONE`).
*   **The Task List (Grouped & Sorted):**
    *   Tasks are not just a flat list; they are grouped under sticky, monospace section headers: `OVERDUE`, `TODAY`, `UPCOMING`, and `SOMEDAY` (for tasks with no due date).
    *   **Completed Tasks:** They do *not* disappear. They remain in their respective time groups but are visually dimmed (`opacity-40`), and the title gets a strikethrough.
*   **The Task Card:**
    *   A horizontal flex container with a left-side colored accent border (Red for overdue, Orange for today, Green for upcoming).
    *   **Left:** A custom, brutalist square checkbox.
    *   **Center:** Task Title (sans-serif, medium weight), and a meta-row below it containing the Date/Time (monospace) and Category Tag (small pill).
    *   **Right:** Priority Badge (e.g., `URGENT` in a red-tinted brutalist badge).
    *   *Interaction:* Clicking the card opens the Edit Modal. Clicking the checkbox toggles the status.

#### D. The Task Modal (Create / Edit)
*   **Overlay:** A semi-transparent black overlay (`bg-black/60`) that blurs the background slightly.
*   **The Box:** A pure white box with a thick black border. No rounded corners.
*   **Form Fields:** 
    *   Inputs have no top/side borders, only a thick 2px bottom border that turns orange on focus.
    *   **Title:** Large, sans-serif.
    *   **Description:** Textarea, monospace.
    *   **Due Date:** Native datetime-local picker, styled to match the brutalist theme.
    *   **Priority & Status:** Custom brutalist dropdowns or segmented controls.
*   **Actions:** `CANCEL` (ghost button), `DELETE` (red, only in Edit mode), `SAVE` (solid black).

---

### 3. API Integration & State Management

**The "Background Hydration" Strategy (Solving the Pagination Conflict)**
Your backend strictly limits responses to 10 tasks per page to prevent memory spikes. However, your frontend requires *instant, client-side filtering* (e.g., clicking the "Work" category must instantly show all Work tasks, even if they are on page 5).
*   **The Solution:** On initial app mount, the frontend fires a background loop. It requests Page 0, then Page 1, then Page 2, sequentially, until the backend returns `last: true`. It stitches these together into a single master array in the React state. 
*   **Result:** The user sees a skeleton loader for 0.5 seconds, and then the app feels 100% native and instantaneous. All subsequent filtering, grouping, and searching happens locally in milliseconds.
*   **Mutations:** When a task is created, updated, or deleted, the frontend sends the `POST/PUT/DELETE` request. On success, it updates the local master array and re-renders. 

**Handling API Responses**
*   **200 / 201 (Success):** The local state is updated. A subtle "slide-in" toast notification appears at the bottom right: `TASK SAVED`.
*   **204 (Delete):** The card instantly collapses (height animation to 0) and is removed from the local array.
*   **400 (Validation Error):** The backend returns the `errors` object (e.g., `{ "title": "Title cannot be blank" }`). The frontend maps these directly to the Modal form fields, turning the specific input's bottom border red and displaying the error message in tiny red monospace text below it.
*   **500 (Server Error):** A persistent, dismissible red banner drops down from the Topbar: `SYSTEM ERROR: UNABLE TO REACH SERVER`.

---

### 4. Interactions, Scroll Effects & Micro-animations

*   **Calendar to Task Scroll-Linking:** 
    If the user is viewing "All Tasks" and clicks a past date on the calendar (e.g., May 12th), the right panel does *not* filter the list. Instead, it smoothly auto-scrolls (`scroll-behavior: smooth`) down the list until the May 12th task is centered in the viewport, and the task card flashes orange for 1 second to draw the eye.
*   **Sticky Section Headers:** As the user scrolls down the Right Panel through a massive list of tasks, the `OVERDUE` and `TODAY` monospace headers stick to the top of the panel, overlapping the scrolling cards slightly, providing constant context.
*   **Optimistic UI Toggles:** When the user clicks a task's checkbox, the UI *instantly* strikes through the text and dims the card *before* the network request finishes. If the backend returns a 500 error, the card snaps back to its original state and an error toast appears.
*   **Modal Transitions:** Modals do not just fade in. They "drop" in from the top with a slight bounce effect, and the background overlay fades in over 150ms.

---

### 5. The "Missed" Senior-Level Additions (The Polish)

To make this truly interview-ready and production-minded, we must add these UX and architectural safeguards:

1.  **Empty States:**
    *   If the user has zero tasks, the Right Panel doesn't just show blank white space. It displays a massive, muted, brutalist typography graphic in the center: `NOTHING TO DO.` with a subtext: `Press [N] to create your first task.`
    *   If a specific calendar month has no tasks, the calendar dots simply don't render, but the stats row updates to show `0`.
2.  **Keyboard Shortcuts (The Power User Feature):**
    *   `N` or `C` -> Opens Create Modal.
    *   `Esc` -> Closes Modal or clears Calendar Date filter.
    *   `Enter` -> Submits Modal.
    *   `/` -> Focuses the Search Bar.
3.  **Soft Delete Confirmation:**
    *   Because clicking "Delete" in the modal is a destructive action (even if it's a soft delete in the DB), clicking the red `DELETE` button does not immediately fire the API. It changes the button text to `SURE?` and turns it darker red. The user must click it a second time to confirm. This prevents accidental data loss.
4.  **Skeleton Loaders:**
    *   During the initial "Background Hydration" fetch, the Right Panel displays 5 pulsing, gray, brutalist rectangular blocks instead of a spinning loader. This matches the aesthetic and reduces perceived wait time.
5.  **Error Boundaries:**
    *   If a malformed date from the backend crashes the `date-fns` parsing logic in the Task List component, a React Error Boundary catches it. Instead of the whole app going white/blank, the Right Panel is replaced with a terminal-style error log, while the Calendar on the left remains functional.
6.  **Timezone Awareness:**
    *   The frontend explicitly converts all incoming UTC ISO-8601 strings from the backend into the user's *local browser timezone* for display, but ensures that when sending updates back to the backend, it converts them back to UTC. This prevents the "Task shifted by 5 hours" bug.

---

### Summary of the User Journey
1. The user opens the app. A skeleton loader flashes for 300ms while the frontend silently hydrates the paginated backend data.
2. The screen resolves into a crisp, high-contrast Neo-Brutalist dashboard.
3. The user clicks `WORK` in the left panel. Instantly, the right panel filters to show only work tasks, grouped by Overdue/Today/Upcoming.
4. They press `N`. A modal drops down. They type "Fix Docker Compose", ignore the date and priority fields, and hit `Enter`.
5. The API defaults the priority to LOW and saves it. The modal snaps shut. The task appears at the bottom of the "Upcoming" (or "Someday") list with a satisfying micro-animation. 

This is a highly polished, deeply considered, and structurally sound application. **Shall we begin generating the Vite + React + Tailwind v4 setup commands and the foundational code for Phase 1?**