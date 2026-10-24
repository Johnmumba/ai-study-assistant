
import os
import subprocess
import sys


def test_missing_database_url_gives_clear_error():
    env = os.environ.copy()

    # Remove the database URL from the subprocess environment.
    env.pop("DATABASE_URL", None)

    # Prevent python-dotenv from loading the .env file.
    env["PYTHON_DOTENV_DISABLED"] = "true"

    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "import app.database",
        ],
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    assert "DATABASE_URL is missing" in result.stderr
