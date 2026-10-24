from fastapi.testclient import TestClient


def sample_quiz():
    """Return a valid quiz request for testing."""
    return {
        "subject": "Science",
        "topic": "Forces",
        "grade": 5,
        "number_of_questions": 1,
        "questions": [
            {
                "text": "What force pulls objects toward Earth?",
                "option_a": "Friction",
                "option_b": "Gravity",
                "option_c": "Magnetism",
                "option_d": "Air resistance",
                "correct_answer": "B",
                "explanation": "Gravity attracts objects toward Earth.",
            }
        ],
    }


def test_homepage(client: TestClient):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["message"] == (
        "Welcome to the AI Study Assistant!"
    )


def test_health_check(client: TestClient):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_create_quiz(client: TestClient):
    response = client.post(
        "/api/quizzes",
        json=sample_quiz(),
    )

    assert response.status_code == 201

    data = response.json()

    assert data["id"] > 0
    assert data["subject"] == "Science"
    assert data["topic"] == "Forces"
    assert data["grade"] == 5
    assert len(data["questions"]) == 1
    assert data["questions"][0]["correct_answer"] == "B"


def test_retrieve_saved_quiz(client: TestClient):
    created = client.post(
        "/api/quizzes",
        json=sample_quiz(),
    )

    assert created.status_code == 201
    quiz_id = created.json()["id"]

    response = client.get(f"/api/quizzes/{quiz_id}")

    assert response.status_code == 200
    assert response.json()["id"] == quiz_id
    assert response.json()["questions"][0]["text"] == (
        "What force pulls objects toward Earth?"
    )


def test_list_quizzes(client: TestClient):
    created = client.post(
        "/api/quizzes",
        json=sample_quiz(),
    )

    assert created.status_code == 201

    response = client.get("/api/quizzes")

    assert response.status_code == 200

    quizzes = response.json()

    assert len(quizzes) == 1
    assert quizzes[0]["id"] == created.json()["id"]


def test_missing_quiz_returns_404(client: TestClient):
    response = client.get("/api/quizzes/999999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Quiz not found"


def test_mismatched_question_count_is_rejected(
    client: TestClient,
):
    quiz = sample_quiz()
    quiz["number_of_questions"] = 2

    response = client.post(
        "/api/quizzes",
        json=quiz,
    )

    assert response.status_code == 422


def test_invalid_grade_is_rejected(client: TestClient):
    quiz = sample_quiz()
    quiz["grade"] = 13

    response = client.post(
        "/api/quizzes",
        json=quiz,
    )

    assert response.status_code == 422


def test_invalid_correct_answer_is_rejected(
    client: TestClient,
):
    quiz = sample_quiz()
    quiz["questions"][0]["correct_answer"] = "E"

    response = client.post(
        "/api/quizzes",
        json=quiz,
    )

    assert response.status_code == 422