
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Student
from app.auth import hash_password, verify_password

from app.models import Quiz, Question, QuizAttempt
from app.schemas import QuizCreate, QuizSubmission


def create_quiz(db: Session, request: QuizCreate) -> Quiz:
    quiz = Quiz(
        subject=request.subject,
        topic=request.topic,
        grade=request.grade,
        number_of_questions=request.number_of_questions,
        questions=[
            Question(**question.model_dump())
            for question in request.questions
        ],
    )

    db.add(quiz)
    db.commit()

    db.refresh(quiz)

    return quiz


def get_quiz(db: Session, quiz_id: int) -> Quiz | None:
    statement = (
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id)
    )

    return db.scalar(statement)


def list_quizzes(db: Session) -> list[Quiz]:
    statement = (
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .order_by(Quiz.id.desc())
    )

    return list(db.scalars(statement).all())



def mark_quiz(
    db: Session,
    quiz_id: int,
    submission: QuizSubmission,
    student_id: int | None = None,
) -> dict:
    # 1. Find the quiz and its saved questions.
    quiz = get_quiz(db, quiz_id)

    if quiz is None:
        raise LookupError("Quiz not found.")

    questions = quiz.questions

    # 2. Check that every question is answered exactly once.
    submitted_ids = [answer.question_id for answer in submission.answers]
    question_ids = {question.id for question in questions}

    if len(submitted_ids) != len(set(submitted_ids)):
        raise ValueError("A question cannot be answered more than once.")

    if set(submitted_ids) != question_ids:
        raise ValueError(
            "Submit exactly one answer for every question in this quiz."
        )

    # 3. Compare answers with the correct answers.
    answers_by_id = {
        answer.question_id: answer.selected_answer
        for answer in submission.answers
    }

    results = []
    score = 0

    for question in questions:
        selected = answers_by_id[question.id]
        is_correct = selected == question.correct_answer

        if is_correct:
            score += 1

        results.append({
            "question_id": question.id,
            "question": question.text,
            "selected_answer": selected,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "explanation": question.explanation,
        })

    # 4. Calculate the percentage.
    total = len(questions)
    percentage = round((score / total) * 100, 2) if total else 0.0

    # 5. Save the attempt and its student ID.
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_id=student_id,
        score=score,
        total_questions=total,
        percentage=percentage,
    )

    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "quiz_id": quiz.id,
        "subject": quiz.subject,
        "topic": quiz.topic,
        "total_questions": total,
        "score": score,
        "percentage": percentage,
        "submitted_at": attempt.created_at,
        "results": results,
    }



def get_quiz_attempts(
    db: Session,
    student_id: int,
    quiz_id: int | None = None,
):
    query = (
        db.query(QuizAttempt, Quiz.subject, Quiz.topic)
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(QuizAttempt.student_id == student_id)
    )

    if quiz_id is not None:
        query = query.filter(QuizAttempt.quiz_id == quiz_id)

    rows = query.order_by(QuizAttempt.created_at.desc()).all()

    return [
        {
            "id": attempt.id,
            "quiz_id": attempt.quiz_id,
            "subject": subject,
            "topic": topic,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "percentage": attempt.percentage,
            "created_at": attempt.created_at,
        }
        for attempt, subject, topic in rows
    ]




def get_learning_progress(db: Session, student_id: int):
    attempts = get_quiz_attempts(db, student_id=student_id)

    if not attempts:
        return {
            "total_attempts": 0,
            "total_questions_answered": 0,
            "average_percentage": 0.0,
            "best_percentage": 0.0,
            "recent_attempts": [],
            "subject_performance": [],
        }

    total_attempts = len(attempts)

    total_questions_answered = sum(
        attempt["total_questions"] for attempt in attempts
    )

    average_percentage = round(
        sum(attempt["percentage"] for attempt in attempts)
        / total_attempts,
        2,
    )

    best_percentage = max(
        attempt["percentage"] for attempt in attempts
    )

    subject_scores = {}

    for attempt in attempts:
        subject = attempt["subject"]

        if subject not in subject_scores:
            subject_scores[subject] = []

        subject_scores[subject].append(attempt["percentage"])

    subject_performance = [
        {
            "subject": subject,
            "average_percentage": round(
                sum(scores) / len(scores), 2
            ),
            "attempts": len(scores),
        }
        for subject, scores in subject_scores.items()
    ]

    subject_performance.sort(
        key=lambda item: item["average_percentage"],
        reverse=True,
    )

    return {
        "total_attempts": total_attempts,
        "total_questions_answered": total_questions_answered,
        "average_percentage": average_percentage,
        "best_percentage": round(best_percentage, 2),
        "recent_attempts": attempts[:10],
        "subject_performance": subject_performance,
    }



def register_student(db: Session, email: str, password: str):
    normalized_email = email.strip().lower()

    existing_student = (
        db.query(Student)
        .filter(Student.email == normalized_email)
        .first()
    )

    if existing_student:
        return None

    student = Student(
        email=normalized_email,
        hashed_password=hash_password(password),
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    return student



def authenticate_student(db: Session, email: str, password: str):
    normalized_email = email.strip().lower()

    student = (
        db.query(Student)
        .filter(Student.email == normalized_email)
        .first()
    )

    if student is None:
        return None

    if not verify_password(password, student.hashed_password):
        return None

    return student
