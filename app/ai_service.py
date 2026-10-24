
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError
from typing import Literal

from app.schemas import (
    QuizCreate,
    QuizGenerateRequest,
    QuestionCreate,
    StudyMaterialRequest,
    StudyMaterialResponse,
)
load_dotenv()


class GeneratedQuestion(BaseModel):
    text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: Literal["A", "B", "C", "D"]
    explanation: str


class GeneratedQuiz(BaseModel):
    questions: list[GeneratedQuestion]


class GeminiServiceError(Exception):
    def __init__(self, status_code: int, public_message: str):
        self.status_code = status_code
        self.public_message = public_message
        super().__init__(public_message)


def generate_quiz_content(request: QuizGenerateRequest) -> QuizCreate:
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

    if not api_key:
        raise GeminiServiceError(
            503,
            "Gemini API key is missing. Check your .env file.",
        )

    prompt = f"""
You are an educational quiz generator for school students.

Create a multiple-choice quiz using these details:
Subject: {request.subject}
Topic: {request.topic}
Grade: {request.grade}
Difficulty: {request.difficulty}
Number of questions: {request.number_of_questions}


Rules:
1. Write questions appropriate for the specified grade and the student's age.
2. Match the requested difficulty level:
   - easy: test basic recall and understanding using straightforward questions.
   - medium: test understanding and application using familiar examples.
   - hard: test deeper reasoning, multi-step thinking, and application to less familiar examples.
3. Create exactly the requested number of questions.
4. Provide exactly four plausible options for every question: option_a, option_b, option_c, and option_d.
5. Ensure exactly one option is correct.
6. Set correct_answer to A, B, C, or D, matching the correct option.
7. Give a clear explanation that teaches why the correct answer is right, including a short worked step when appropriate.
8. Make incorrect options plausible but clearly wrong, avoiding ambiguous answers.
9. Avoid duplicate questions and repeated testing of the same fact.
10. Keep every question relevant to the specified subject, topic, grade, and difficulty.
11. Return valid JSON matching the required response schema.
12. Do not include markdown or introductory text.
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeneratedQuiz,
                temperature=0.4,
            ),
        )

        if response.parsed is not None:
            generated = GeneratedQuiz.model_validate(response.parsed)
        elif response.text:
            generated = GeneratedQuiz.model_validate_json(response.text)
        else:
            raise ValueError("Gemini returned an empty response.")

        if len(generated.questions) != request.number_of_questions:
            raise ValueError(
                "Gemini returned an unexpected number of questions."
            )

        questions = [
            QuestionCreate.model_validate(question.model_dump())
            for question in generated.questions
        ]

        return QuizCreate(
            subject=request.subject,
            topic=request.topic,
            grade=request.grade,
            number_of_questions=len(questions),
            questions=questions,
        )

    except GeminiServiceError:
        raise

    except Exception as exc:
        error_code = getattr(exc, "code", None)
        if error_code is None:
            error_code = getattr(exc, "status_code", None)

        error_message = str(exc).lower()

        if (
            error_code == 429
            or "resource_exhausted" in error_message
            or "quota" in error_message
        ):
            raise GeminiServiceError(
                429,
                "Gemini quota exceeded. Check your API quota and try again later.",
            ) from exc

        if (
            error_code in (400, 401, 403)
            or "api key" in error_message
            or "permission denied" in error_message
        ):
            raise GeminiServiceError(
                502,
                "Gemini rejected the request. Check your API key and model access.",
            ) from exc

        if isinstance(exc, (ValidationError, ValueError)):
            raise GeminiServiceError(
                502,
                "Gemini returned invalid quiz data. Please try again.",
            ) from exc

        print("Gemini error type:", type(exc).__name__)
        print("Gemini error details:", str(exc))

        raise GeminiServiceError(
            502,
            "Gemini could not generate the quiz. Check the server terminal.",
        ) from exc




def answer_tutor_question(request):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

    if not api_key:
        raise GeminiServiceError(
            503,
            "The AI Tutor is temporarily unavailable. Please try again later.",
        )

    prompt = f"""
You are a friendly, patient AI tutor for school students in grades 1 to 12.

Student's grade: {request.grade}
Subject: {request.subject}

Explain concepts at the student's grade level using simple language.
Break difficult ideas into steps, give examples when helpful, and
encourage understanding rather than memorization.
If a question is unclear, ask for clarification.
Stay focused on education and do not invent facts.

The conversation history and latest student question follow.
Use the history to understand follow-up questions and avoid repeating
explanations unnecessarily.
"""

    contents = []

    for message in request.conversation_history:
        role = message.get("role")
        message_text = message.get("text", "").strip()

        if role in ("user", "model") and message_text:
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=message_text)],
                )
            )

    contents.append(
        types.Content(
            role="user",
            parts=[types.Part(text=request.question)],
        )
    )

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part(text=prompt)],
                ),
                *contents,
            ],
            config=types.GenerateContentConfig(
                temperature=0.4,
            ),
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        return response.text.strip()

    except GeminiServiceError:
        raise

    except Exception as exc:
        error_code = getattr(exc, "code", None)
        if error_code is None:
            error_code = getattr(exc, "status_code", None)

        error_message = str(exc).lower()
        
        if (
            error_code == 503
            or "unavailable" in error_message
            or "high demand" in error_message
        ):
            raise GeminiServiceError(
                503,
                "The AI Tutor is temporarily busy. Please wait a moment and try again.",
            ) from exc
            
        if (
            error_code == 429
            or "resource_exhausted" in error_message
            or "quota" in error_message
        ):
            raise GeminiServiceError(
                429,
                "The AI Tutor has reached its usage limit. Please try again later.",
            ) from exc

        if (
            error_code in (400, 401, 403)
            or "api key" in error_message
            or "permission denied" in error_message
        ):
            raise GeminiServiceError(
                502,
                "The AI Tutor could not access Gemini. Please check the server configuration.",
            ) from exc

        print("Gemini tutor error type:", type(exc).__name__)
        print("Gemini tutor error details:", str(exc))

        raise GeminiServiceError(
            502,
            "The AI Tutor could not answer right now. Please try again.",
        ) from exc



def generate_study_material(
    request: StudyMaterialRequest,
) -> StudyMaterialResponse:
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

    if not api_key:
        raise GeminiServiceError(
            503,
            "Study materials are temporarily unavailable. Please try again later.",
        )

    prompt = f"""
You are an educational study-material creator for school students.

Create accurate, helpful study materials using these details:
Subject: {request.subject}
Topic: {request.topic}
Grade: {request.grade}

Requirements:
1. Use language appropriate for the specified grade.
2. Explain the topic clearly and accurately.
3. Include a short introduction.
4. Provide 4 to 8 useful notes explaining key concepts.
5. Provide 4 to 8 key terms, each with its definition.
6. Provide 2 to 4 worked examples with clear steps.
7. Provide 3 to 6 concise summary points.
8. Keep all content relevant to the subject and topic.
9. Do not invent facts.
10. Return structured data matching the requested response schema.
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=StudyMaterialResponse,
                temperature=0.4,
            ),
        )

        if response.parsed is not None:
            material = StudyMaterialResponse.model_validate(
                response.parsed
            )
        elif response.text:
            material = StudyMaterialResponse.model_validate_json(
                response.text
            )
        else:
            raise ValueError("Gemini returned an empty response.")

        return material

    except GeminiServiceError:
        raise

    except Exception as exc:
        error_code = getattr(exc, "code", None)
        if error_code is None:
            error_code = getattr(exc, "status_code", None)

        error_message = str(exc).lower()

        if (
            error_code == 503
            or "unavailable" in error_message
            or "high demand" in error_message
        ):
            raise GeminiServiceError(
                503,
                "The AI study materials service is busy. Please try again shortly.",
            ) from exc

        if (
            error_code == 429
            or "resource_exhausted" in error_message
            or "quota" in error_message
        ):
            raise GeminiServiceError(
                429,
                "The AI study materials service has reached its usage limit. Please try again later.",
            ) from exc

        if (
            error_code in (400, 401, 403)
            or "api key" in error_message
            or "permission denied" in error_message
        ):
            raise GeminiServiceError(
                502,
                "Gemini could not process the study materials request. Check the server configuration.",
            ) from exc

        print("Gemini study materials error type:", type(exc).__name__)
        print("Gemini study materials error details:", str(exc))

        raise GeminiServiceError(
            502,
            "The AI study materials could not be generated. Please try again.",
        ) from exc
