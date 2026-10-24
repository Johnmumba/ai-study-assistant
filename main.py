
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="AI Study Assistant")


@app.get("/")
def home():
    return {
        "message": "Welcome to the AI Study Assistant!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


class QuizRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=100)
    topic: str = Field(min_length=1, max_length=200)
    grade: int = Field(ge=1, le=12)
    number_of_questions: int = Field(ge=1, le=100)


@app.post("/api/quizzes/preview")
def preview_quiz(request: QuizRequest):
    return {
        "message": "Quiz request received successfully",
        "subject": request.subject,
        "topic": request.topic,
        "grade": request.grade,
        "number_of_questions": request.number_of_questions
    }
