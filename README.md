# AI Study Assistant

An AI-powered learning platform designed to help primary and secondary school students in Grades 1–12 practise academic topics, test their understanding, and track their learning progress.

The application combines a **Next.js** frontend, a **FastAPI** backend, **PostgreSQL** for persistent storage, and **Google Gemini** for AI-powered learning support.

## Features

- **Student authentication** — registration, login, and authenticated endpoints.
- **AI quiz generation** — create practice quizzes based on subject, topic, grade, difficulty, and question count.
- **Quiz marking** — submit answers and receive results.
- **Quiz history** — review saved attempts.
- **Progress dashboard** — view performance statistics and subject-level progress.
- **AI Tutor** — ask learning questions with subject and grade-level context.
- **Persistent storage** — save student accounts, quizzes, questions, and quiz attempts.
- **Automated testing** — validate backend functionality with pytest.

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Python, FastAPI, Uvicorn |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI integration | Google Gemini |
| Authentication | JWT-based authentication and password hashing |
| Testing | pytest, HTTPX, pytest-cov |
| Frontend deployment | Vercel |
| Backend deployment | Render |

## Live Demo

- **Application:** https://ai-study-assistant-alpha-liart.vercel.app
- **API:** https://ai-study-assistant-nj2h.onrender.com
- **API documentation:** https://ai-study-assistant-nj2h.onrender.com/docs
