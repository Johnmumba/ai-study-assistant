
from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, EmailStr, model_validator

class QuizGenerateRequest(BaseModel):
    subject: str = Field(
        min_length=1,
        max_length=100,
    )
    topic: str = Field(
        min_length=1,
        max_length=200,
    )
    grade: int = Field(
        ge=1,
        le=12,
    )
    number_of_questions: int = Field(
        ge=1,
        le=100,
    )
    difficulty: Literal["easy", "medium", "hard"] = "medium"

class QuestionCreate(BaseModel):
    text: str = Field(min_length=1)
    option_a: str = Field(min_length=1)
    option_b: str = Field(min_length=1)
    option_c: str = Field(min_length=1)
    option_d: str = Field(min_length=1)
    correct_answer: str = Field(pattern=r"^[ABCD]$")
    explanation: str = Field(min_length=1)


class QuizCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=100)
    topic: str = Field(min_length=1, max_length=200)
    grade: int = Field(ge=1, le=12)
    number_of_questions: int = Field(ge=1, le=100)
    questions: list[QuestionCreate] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def check_question_count(self):
        if self.number_of_questions != len(self.questions):
            raise ValueError(
                "number_of_questions must match the number of questions provided"
            )
        return self


class QuizGenerateRequest(BaseModel):
    subject: str = Field(
        min_length=1,
        max_length=100,
    )
    topic: str = Field(
        min_length=1,
        max_length=200,
    )
    grade: int = Field(
        ge=1,
        le=12,
    )
    number_of_questions: int = Field(
        ge=1,
        le=100,
    )
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    explanation: str


class QuizResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject: str
    topic: str
    grade: int
    number_of_questions: int
    created_at: datetime
    questions: list[QuestionResponse]

class AnswerSubmission(BaseModel):
    question_id: int = Field(gt=0)
    selected_answer: Literal["A", "B", "C", "D"]


class QuizSubmission(BaseModel):
    answers: list[AnswerSubmission] = Field(min_length=1, max_length=100)

class StudentQuestionResponse(BaseModel):
    id: int
    text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str

    model_config = ConfigDict(from_attributes=True)


class StudentQuizResponse(BaseModel):
    id: int
    subject: str
    topic: str
    grade: int
    number_of_questions: int
    questions: list[StudentQuestionResponse]

    model_config = ConfigDict(from_attributes=True)


class QuizAttemptResponse(BaseModel):
    id: int
    quiz_id: int
    subject: str
    topic: str
    score: int
    total_questions: int
    percentage: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubjectPerformance(BaseModel):
    subject: str
    average_percentage: float
    attempts: int


class LearningProgressResponse(BaseModel):
    total_attempts: int
    total_questions_answered: int
    average_percentage: float
    best_percentage: float
    recent_attempts: list[QuizAttemptResponse]
    subject_performance: list[SubjectPerformance]


class StudentRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class StudentLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class StudentResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



class StudentLoginResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    student: StudentResponse




class TutorQuestionRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=100)
    grade: int = Field(ge=1, le=12)
    question: str = Field(min_length=1, max_length=2000)
    conversation_history: list[dict[str, str]] = Field(
        default_factory=list,
        max_length=20,
    )


class TutorQuestionResponse(BaseModel):
    answer: str



class StudyMaterialRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=100)
    topic: str = Field(min_length=1, max_length=200)
    grade: int = Field(ge=1, le=12)


class StudyMaterialResponse(BaseModel):
    title: str
    introduction: str
    notes: list[str]
    key_terms: list[str]
    worked_examples: list[str]
    summary: list[str]

class SavedStudyMaterialResponse(BaseModel):
    id: int
    subject: str
    topic: str
    grade: int
    title: str
    created_at: datetime