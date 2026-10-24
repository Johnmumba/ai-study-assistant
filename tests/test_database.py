
from unittest.mock import MagicMock, patch

from app.database import get_db


def test_get_db_closes_session():
    fake_session = MagicMock()

    with patch(
        "app.database.SessionLocal",
        return_value=fake_session,
    ):
        generator = get_db()

        # Start the generator and obtain the session.
        session = next(generator)

        assert session is fake_session

        # Finish the generator so its finally block runs.
        try:
            next(generator)
        except StopIteration:
            pass

        fake_session.close.assert_called_once()
