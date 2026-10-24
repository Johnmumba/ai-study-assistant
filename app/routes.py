
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import QuizSubmission
from app.services import mark_quiz

from app.schemas import QuizAttemptResponse
from app.services import get_quiz_attempts

from app.schemas import StudentRegister, StudentResponse
from app.services import register_student

from app.schemas import StudentLogin, StudentLoginResponse
from app.services import authenticate_student

from app.schemas import LearningProgressResponse
from app.services import get_learning_progress
from fastapi import Depends
from app.models import StudyMaterial
from app.auth import get_current_student_id
from app.auth import create_access_token
from app.schemas import TutorQuestionRequest,TutorQuestionResponse
from app.schemas import QuizCreate, QuizResponse, StudentQuizResponse
from app.services import create_quiz, get_quiz, list_quizzes
from app.schemas import QuizGenerateRequest
from app.ai_service import (
    generate_quiz_content,
    GeminiServiceError,
    answer_tutor_question,
    generate_study_material,
)

from app.schemas import (
    StudyMaterialRequest,
    StudyMaterialResponse,
    SavedStudyMaterialResponse,
)

router = APIRouter()


@router.get("/")
def home():
    return {
        "message": "Welcome to the AI Study Assistant!"
    }


@router.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@router.post(
    "/quizzes",
    response_model=QuizResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_quiz_endpoint(
    request: QuizCreate,
    db: Session = Depends(get_db),
):
    return create_quiz(db, request)


@router.get("/quizzes", response_model=list[StudentQuizResponse])
def list_quizzes_endpoint(
    db: Session = Depends(get_db),
):
    return list_quizzes(db)


@router.get("/quizzes/{quiz_id}", response_model=StudentQuizResponse)
def get_quiz_endpoint(
    quiz_id: int,
    db: Session = Depends(get_db),
):
    quiz = get_quiz(db, quiz_id)

    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found",
        )

    return quiz


@router.post(
    "/quizzes/generate",
    response_model=StudentQuizResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_quiz_endpoint(
    request: QuizGenerateRequest,
    db: Session = Depends(get_db),
):
    try:
        quiz_data = generate_quiz_content(request)
    except GeminiServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.public_message,
        ) from exc

    return create_quiz(db, quiz_data)


@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz_endpoint(
    quiz_id: int,
    submission: QuizSubmission,
    db: Session = Depends(get_db),
    student_id: int = Depends(get_current_student_id),
):
    try:
        return mark_quiz(
            db,
            quiz_id,
            submission,
            student_id=student_id,
        )

    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


@router.get(
    "/quiz-attempts",
    response_model=list[QuizAttemptResponse],
)
def quiz_attempts_endpoint(
    quiz_id: int | None = None,
    db: Session = Depends(get_db),
    student_id: int = Depends(get_current_student_id),
):
    return get_quiz_attempts(
        db,
        student_id=student_id,
        quiz_id=quiz_id,
    )



@router.get("/progress", response_model=LearningProgressResponse)
def learning_progress_endpoint(
    db: Session = Depends(get_db),
    student_id: int = Depends(get_current_student_id),
):
    return get_learning_progress(
        db,
        student_id=student_id,
    )




@router.post(
    "/auth/register",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    student_data: StudentRegister,
    db: Session = Depends(get_db),
):
    student = register_student(
        db=db,
        email=str(student_data.email),
        password=student_data.password,
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    return student


@router.post(
    "/auth/login",
    response_model=StudentLoginResponse,
)
def login(
    login_data: StudentLogin,
    db: Session = Depends(get_db),
):
    student = authenticate_student(
        db=db,
        email=str(login_data.email),
        password=login_data.password,
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return {
        "message": "Login successful.",
        "access_token": create_access_token(student.id),
        "token_type": "bearer",
        "student": student,
    }


@router.get("/auth/me")
def get_my_account(
    student_id: int = Depends(get_current_student_id),
    db: Session = Depends(get_db),
):
    from app.models import Student

    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Student account not found.",
        )

    return {
        "id": student.id,
        "email": student.email,
    }


@router.post("/tutor/ask", response_model=TutorQuestionResponse)
def ask_tutor(
    request: TutorQuestionRequest,
    student_id: int = Depends(get_current_student_id),
):
    try:
        answer = answer_tutor_question(request)
        return TutorQuestionResponse(answer=answer)

    except GeminiServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.public_message,
        ) from exc



@router.post(
    "/study-materials/generate",
    response_model=StudyMaterialResponse,
)
def create_study_materials(
    request: StudyMaterialRequest,
    db: Session = Depends(get_db),
    student_id: int = Depends(get_current_student_id),
):
    try:
        material = generate_study_material(request)

        saved_material = StudyMaterial(
            student_id=student_id,
            subject=request.subject,
            topic=request.topic,
            grade=request.grade,
            title=material.title,
            content=json.dumps(
                material.model_dump(),
                ensure_ascii=False,
            ),
        )

        db.add(saved_material)
        db.commit()

        return material

    except GeminiServiceError as exc:
        db.rollback()
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.public_message,
        ) from exc

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to generate and save study materials.",
        )

@router.get(
    "/study-materials",
    response_model=list[SavedStudyMaterialResponse],
)
def get_saved_study_materials(
    db: Session = Depends(get_db),
    student_id: int = Depends(get_current_student_id),
):
    return (
        db.query(StudyMaterial)
        .filter(StudyMaterial.student_id == student_id)
        .order_by(StudyMaterial.created_at.desc())
        .all()
    )



@router.get(
    "/study-materials/{material_id}",
    response_model=StudyMaterialResponse,
)
def get_saved_study_material(
    material_id: int,
    db: Session = Depends(get_db),
    student_id: int = Depends(get_current_student_id),
):
    saved_material = (
        db.query(StudyMaterial)
        .filter(
            StudyMaterial.id == material_id,
            StudyMaterial.student_id == student_id,
        )
        .first()
    )

    if saved_material is None:
        raise HTTPException(
            status_code=404,
            detail="Study material not found.",
        )

    try:
        content = json.loads(saved_material.content)
        return StudyMaterialResponse(**content)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=500,
            detail="Unable to load the saved study material.",
        )
