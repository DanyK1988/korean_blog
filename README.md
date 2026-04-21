# 한국어 블로그 · Korean Blog

A full-stack Korean language-learning blog. Readers click any Korean word in
a post and save it to a personal dictionary — the core feature that turns a
blog into a language-learning tool.

- **Backend:** Django 5 + Django REST Framework + SimpleJWT + SQLite
- **Frontend:** React 18 + Vite + Tailwind CSS + React Router + Axios

---

## Table of contents

1. [Architecture](#architecture)
2. [Project layout](#project-layout)
3. [Getting started](#getting-started)
4. [Environment & configuration](#environment--configuration)
5. [Data model](#data-model)
6. [REST API reference](#rest-api-reference)
7. [Authentication (JWT)](#authentication-jwt)
8. [The Word Saver feature](#the-word-saver-feature)
9. [Frontend architecture](#frontend-architecture)
10. [Seed data](#seed-data)
11. [Troubleshooting](#troubleshooting)

---

## Architecture

```
 ┌──────────────────────┐   REST/JSON   ┌───────────────────────┐   ORM   ┌───────────┐
 │  React Frontend      │  ───────────► │  Django REST API      │ ──────► │ SQLite DB │
 │  (Vite · Tailwind)   │  ◄─────────── │  (DRF + SimpleJWT)    │         │           │
 └──────────────────────┘   Bearer JWT  └───────────────────────┘         └───────────┘
```

The Vite dev server proxies `/api/*` to Django on port 8000, so the
frontend can be developed without extra CORS friction. In production you
would serve the built `dist/` bundle from any static host and point it at
the Django API.

---

## Project layout

```
Korean_blog/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/
│   │   ├── settings.py         # DRF + JWT + CORS config
│   │   ├── urls.py             # Root router
│   │   ├── wsgi.py / asgi.py
│   ├── users/                  # Custom user model (email login) + auth views
│   │   └── management/commands/seed_data.py
│   ├── posts/                  # Blog post model, serializers, viewset
│   └── words/                  # Word + UserWord (M2M through) dictionary
└── frontend/
    ├── package.json
    ├── vite.config.js          # /api proxy → localhost:8000
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx / App.jsx
        ├── api/
        │   ├── client.js       # Axios instance with JWT refresh interceptor
        │   └── endpoints.js    # Typed wrappers around every API route
        ├── context/
        │   └── AuthContext.jsx # useAuth() hook + <AuthProvider>
        ├── components/
        │   ├── Navbar.jsx
        │   ├── PrivateRoute.jsx
        │   ├── KoreanWord.jsx  # ★ per-word popover + save button
        │   └── PostBody.jsx    # ★ parses post HTML and wraps Korean tokens
        └── pages/
            ├── Home.jsx
            ├── PostDetail.jsx
            ├── Dictionary.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── PostEditor.jsx
            └── NotFound.jsx
```

---

## Getting started

### Prerequisites

- Python **3.11+**
- Node **18+** and npm

### 1 · Backend

```bash
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt

python manage.py migrate
python manage.py seed_data       # creates demo user + 3 Korean grammar posts
python manage.py runserver 8000
```

The API is now available at `http://localhost:8000/api/`.

Seed credentials (for development only):

| Email                      | Password       |
| -------------------------- | -------------- |
| `demo@korean-blog.dev`     | `demopass123`  |

### 2 · Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Log in with the seed user, open any post, and
click a Korean word — the popover lets you save it to your personal
dictionary.

### 3 · Optional: create a superuser

```bash
cd backend
source ../.venv/bin/activate
python manage.py createsuperuser
# then visit http://localhost:8000/admin/
```

---

## Environment & configuration

`backend/config/settings.py` is intentionally simple and commits sensible
development defaults:

- `DEBUG = True`
- `SECRET_KEY` is hard-coded — **replace it with an env var in production**.
- SQLite lives at `backend/db.sqlite3`.
- CORS is open for `http://localhost:5173` and `http://127.0.0.1:5173`.
- JWT access tokens live 60 minutes; refresh tokens live 7 days.

For production, surface these as environment variables (e.g. `DJANGO_SECRET_KEY`,
`DJANGO_DEBUG`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`) using a tool like
`django-environ` or `pydantic-settings`.

---

## Data model

### `users.User` (extends `AbstractUser`)

| Field            | Type          | Notes                                    |
| ---------------- | ------------- | ---------------------------------------- |
| `email`          | `EmailField`  | **unique**, used as the login identifier |
| `username`       | `CharField`   | display name                             |
| `native_language`| `CharField`   | default `"English"`                      |
| `bio`            | `TextField`   | optional                                 |
| `avatar`         | `URLField`    | optional                                 |
| `created_at` / `updated_at` | auto |                                          |

`USERNAME_FIELD = "email"` / `REQUIRED_FIELDS = ["username"]`, with a custom
manager so `createsuperuser` still works.

### `posts.Post`

| Field          | Type                | Notes                                              |
| -------------- | ------------------- | -------------------------------------------------- |
| `title`        | `CharField(300)`    |                                                    |
| `body`         | `TextField`         | HTML or Markdown                                   |
| `author`       | `FK → User`         | `on_delete=CASCADE`, `related_name="posts"`        |
| `published`    | `BooleanField`      | default `False`                                    |
| `created_at`   | auto                |                                                    |
| `published_at` | nullable            | **auto-set** to `timezone.now()` when `published` flips to `True`; cleared when flipped back to `False` |
| `changed_at`   | auto_now            |                                                    |

`Meta.ordering = ["-created_at"]`.

### `words.Word` and `words.UserWord`

A `Word` is the **shared** record for a given (`korean_word`, `translation`)
pair. `UserWord` is the through table that connects users to words and
stores per-user metadata:

```python
users = models.ManyToManyField(User, through="UserWord", related_name="saved_words")
```

`UserWord` has a `unique_together = ("user", "word")` so the same word is
never added twice to the same user's dictionary, plus an editable
`personal_note` field and an `added_at` timestamp.

---

## REST API reference

All endpoints live under `/api/`. JSON in, JSON out. Paginated list
endpoints return `{ count, next, previous, results }` (10 items per page).

### Auth

| Method | URL                          | Auth | Description                      |
| ------ | ---------------------------- | ---- | -------------------------------- |
| POST   | `/api/auth/register/`        | —    | Create account; returns user + JWT tokens |
| POST   | `/api/auth/login/`           | —    | Exchange email+password for JWT tokens |
| POST   | `/api/auth/token/refresh/`   | —    | Refresh an access token          |
| GET    | `/api/auth/me/`              | ✅   | Current user's profile           |
| PATCH  | `/api/auth/me/`              | ✅   | Update the current user's profile |

Example registration:

```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"jane","email":"jane@example.com","password":"secret12345","native_language":"English"}'
```

Response:

```json
{
  "user": { "id": 2, "username": "jane", "email": "jane@example.com", ... },
  "access": "eyJhbGci...",
  "refresh": "eyJhbGci..."
}
```

### Posts

| Method | URL                          | Auth            | Description                         |
| ------ | ---------------------------- | --------------- | ----------------------------------- |
| GET    | `/api/posts/`                | —               | List posts (published + own drafts) |
| GET    | `/api/posts/<id>/`           | —               | Post detail                         |
| POST   | `/api/posts/`                | ✅              | Create post (author = current user) |
| PATCH  | `/api/posts/<id>/`           | ✅ author only  | Update post                         |
| DELETE | `/api/posts/<id>/`           | ✅ author only  | Delete post                         |
| POST   | `/api/posts/<id>/publish/`   | ✅ author only  | Toggle `published` flag             |

Filters (via `django-filter` + DRF):

- `?author=<id>` — posts by a specific user
- `?published=true|false`
- `?search=<term>` — full-text search over title + body
- `?ordering=-created_at` (also `published_at`, `title`)

### Words / Personal Dictionary

All routes require authentication. The viewset is scoped to the current
user, so you only ever see (and can only ever modify) your own entries.

| Method | URL                         | Description                                |
| ------ | --------------------------- | ------------------------------------------ |
| GET    | `/api/words/`               | List saved words (supports `?q=` search)   |
| POST   | `/api/words/`               | Add a word to the current user's dictionary |
| PATCH  | `/api/words/<id>/`          | Update `personal_note`                     |
| DELETE | `/api/words/<id>/`          | Remove from the user's dictionary          |
| GET    | `/api/words/due/`           | Cards due for review (SRS queue)           |
| POST   | `/api/words/<id>/review/`   | Submit an SM-2 flashcard review            |
| GET    | `/api/words/stats/`         | Dashboard counters for the Study page      |

`POST /api/words/` body:

```json
{
  "korean_word": "책",
  "translation": "book",
  "romanization": "chaek",
  "example_sentence": "",
  "source_post_id": 3,
  "personal_note": ""
}
```

Returned row (flat view of `UserWord` + its underlying `Word`):

```json
{
  "id": 17,
  "korean_word": "책",
  "translation": "book",
  "romanization": "chaek",
  "example_sentence": "",
  "source_post_id": 3,
  "personal_note": "",
  "added_at": "2026-04-21T09:12:00Z"
}
```

If the same user `POST`s the same word twice, the server de-duplicates
via `get_or_create` — so the frontend can safely retry without creating
duplicates.

#### SRS endpoints in detail

`GET /api/words/due/` returns every `UserWord` whose `next_review` is in
the past, ordered by `next_review` ascending. Each row carries the full
word data **plus** the SM-2 scheduling fields (`easiness_factor`,
`interval`, `repetitions`, `next_review`, `last_reviewed`) so the
frontend can label the rating buttons without a second round-trip.

`POST /api/words/<id>/review/` body:

```json
{ "quality": 5 }
```

Quality is an integer 0-5 as defined by the SM-2 paper (see
[The Study page / SM-2](#the-study-page--sm-2-flashcards) below).
The response is the updated `UserWord` with a bonus `preview` field
mapping each rating button (`1`, `2`, `4`, `5`) to the interval it would
produce *next* time — used to label the buttons with "Again / Hard /
Good / Easy" intervals.

`GET /api/words/stats/` returns:

```json
{
  "due_today": 12,
  "new_cards": 5,
  "total_words": 48,
  "streak_days": 3,
  "next_due": "2026-04-22T09:00:00Z"
}
```

`streak_days` counts consecutive days (ending today, in UTC) on which
the user reviewed at least one card — calculated from the set of
distinct `last_reviewed` dates across all of the user's `UserWord`s.

---

## Authentication (JWT)

The backend uses `djangorestframework-simplejwt`:

- Login/Register return `{ access, refresh }`.
- Frontend stores both in `localStorage` under `kb.access` / `kb.refresh`.
- Axios attaches `Authorization: Bearer <access>` on every request.
- A response interceptor transparently calls `/api/auth/token/refresh/`
  on the first `401` and retries the original request. If refresh also
  fails, tokens are cleared and the user is effectively logged out.

In React, `useAuth()` exposes `{ user, ready, login, register, logout }`.
`<PrivateRoute>` redirects to `/login` (preserving the intended
destination in `location.state.from`) when there is no user.

---

## The Word Saver feature

This is the product hook, so it deserves its own section.

### Flow

1. `PostDetail.jsx` fetches both the post and (if logged in) the user's
   saved words, then passes them to `PostBody`.
2. `PostBody.jsx` runs a tiny HTML tokenizer over the post body. It
   preserves a safe subset of tags (`<p>`, `<h2>`, `<strong>`, …) and
   walks every text run with the Korean regex
   `/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/g`. Every match is
   replaced by a `<KoreanWord>` component while surrounding text stays
   as plain React children.  This means no `dangerouslySetInnerHTML`,
   so an XSS vector on malicious post bodies is closed.
3. `<KoreanWord>` shows the token with a subtle hover style. Clicking
   opens a popover with:
   - The word in Korean (large, `font-ko`)
   - An editable **Translation** input
   - An editable **Romanization** input
   - A **Save to My Dictionary** button
4. On save it calls `POST /api/words/` and receives the flat `UserWord`
   payload. The parent `PostDetail` merges the new row into `savedWords`,
   and the `savedDict` map (`Map<koreanWord, savedRow>`) is recomputed —
   so every other occurrence of that same token on the page immediately
   switches to the `✓ In your dictionary` badge.
5. If the user isn't logged in, the popover shows a prompt and the save
   button fails gracefully.

### Why a Map<string, row>?

A blog post often contains the same Korean word many times. Tracking
saved words in a `Map` keyed by the token lets `PostBody` render each
occurrence with the `saved` visual state in **O(1)** per token — without
re-rendering the whole tree when a new word is saved.

---

## The Study page / SM-2 flashcards

The Study page at `/study` turns the user's personal dictionary into an
Anki-style review deck using the **SM-2** spaced-repetition algorithm.

### How SM-2 works (as implemented in `backend/words/srs.py`)

Each `UserWord` carries three pieces of scheduling state:

* `easiness_factor` (EF) — float, starts at `2.5`, floor `1.3`
* `interval` — days until the next review
* `repetitions` — consecutive correct answers (quality ≥ 3)

On each review the user rates quality 0-5:

| Quality | Meaning                                    |
| ------- | ------------------------------------------ |
| 0       | complete blackout                          |
| 1       | wrong, but remembered on seeing the answer |
| 2       | wrong, but easy to recall                  |
| 3       | correct, with significant difficulty       |
| 4       | correct, with some hesitation              |
| 5       | perfect response                           |

Rules:

* **Quality < 3**: `repetitions = 0`, `interval = 1`.
* **Quality ≥ 3**:
  * `repetitions == 0` → `interval = 1`
  * `repetitions == 1` → `interval = 6`
  * `repetitions ≥ 2`  → `interval = round(interval * EF)`
  * Then `repetitions += 1`.
* **EF update**: `EF += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)`;
  clamp to a minimum of `1.3`.
* `next_review = now() + interval days`; `last_reviewed = now()`.

The algorithm is exposed as three pure functions:

```python
from words.srs import SrsState, next_state, sm2_review, preview_intervals

# Pure: returns the state a review would produce, no DB writes.
next_state(SrsState(easiness_factor=2.5, interval=0, repetitions=0), quality=5)

# Mutating: runs SM-2 on a UserWord and saves it.
sm2_review(user_word, quality=5)

# Returns {quality: interval_days} for the 4 rating buttons.
preview_intervals(user_word)
```

### Frontend session machine

The Study page owns a **local** session queue. The server's
`/api/words/due/` is only fetched once, at session start; thereafter the
order is entirely client-side so that "Again" (quality=1) and "Hard"
(quality=2) reviews can push the same card back to the end of the
current session without waiting for its server-side `next_review` to
come due again.

Flow:

1. On mount, call `GET /api/words/due/` → `queue` + `currentIndex = 0`.
2. Show **front** of card (Korean + romanization + "Show Answer").
3. On "Show Answer", `flipped = true` → CSS 3D flip reveals translation,
   example sentence, personal note, and the rating row.
4. On rate:
   * `POST /api/words/<id>/review/` with `{ quality }`.
   * Animate the card out (`translate-x-10 opacity-0` for 280 ms).
   * If `quality < 3` → remove the card from `currentIndex` and push to
     the end of `queue`; leave `currentIndex` where it is.
   * If `quality ≥ 3` → advance `currentIndex`.
   * Call `refresh()` on the global stats context so the Navbar badge
     updates immediately.
5. When `currentIndex >= queue.length` → "Session complete!" screen with
   the time of the next upcoming card (from `stats.next_due`).

### Edge cases (all handled)

* Dictionary empty → friendly empty-state with a link to the blog.
* Dictionary non-empty but nothing due → "Nothing to review right now!"
  plus the next-due timestamp.
* Network error during review → error message shown inline, the card
  does **not** advance, and the queue is not mutated.
* Rapid double-click on a rating button → the button row is disabled
  (`busy`) until the API call + animation complete.

### Navbar badge

A small `StatsContext` polls `GET /api/words/stats/` on app load (and
whenever `refresh()` is called from the Study page after a review).
`stats.due_today` is rendered as a red pill next to the "Study" nav
link — familiar territory for any Anki user.

---

## Frontend architecture

- **Routing** (`App.jsx`): `/`, `/posts/:id`, `/posts/new`, `/posts/:id/edit`,
  `/dictionary`, `/login`, `/register`. The last three are wrapped in
  `<PrivateRoute>`.
- **State**: a single global `AuthContext` for the user; everything else
  is local component state. For a real-world app you might introduce
  React Query / SWR for caching, but plain `useEffect` keeps the demo
  readable.
- **Styling**: Tailwind with a small set of themed utilities (`btn`,
  `btn-primary`, `input`, `card`, `korean-word`) defined in
  `src/index.css`. Korean glyphs use Noto Sans KR via Google Fonts.
- **Design tokens**:
  - Canvas `#ffffff`, paper `#f8f8f6`, ink `#1f2430`
  - Accent (coral-rose) `#e05c5c`, accent-dark `#c44848`, accent-soft `#fbeaea`
  - 12 px card radius, subtle card shadow, pronounced popover shadow.

---

## Seed data

`backend/users/management/commands/seed_data.py` creates:

- A demo author (`demo@korean-blog.dev` / `demopass123`)
- Three published posts on common Korean grammar topics:
  1. *Korean Particles 101: 은/는 vs 이/가*
  2. *Polite Speech: The 합니다 and 해요 Forms*
  3. *Counters in Korean: 개, 명, 마리*

The command is idempotent — re-running it updates the posts in place
rather than duplicating them. Run it any time you reset the database:

```bash
python manage.py migrate
python manage.py seed_data
```

---

## Troubleshooting

- **“CORS error” in the browser.** Make sure the backend is running on
  port 8000 and the frontend on port 5173. The Vite proxy (see
  `frontend/vite.config.js`) forwards `/api/*` to Django, but if you
  bypass it and hit `http://localhost:8000` directly, ensure your origin
  is listed in `CORS_ALLOWED_ORIGINS`.
- **“no such table: posts_post”.** You forgot to run migrations.
  `python manage.py migrate`.
- **401 even after login.** Your access token probably expired. The
  frontend will refresh it automatically; if that fails, clear
  `localStorage` and log in again.
- **Korean text looks like boxes.** Your browser can't find Noto Sans KR.
  Check that the Google Fonts `<link>` in `index.html` loaded.

Happy learning! 공부 열심히 하세요 🙂
