"""Test setup: runs against a REAL MySQL/MariaDB database named by TEST_DB_* env vars.

Create it first (see README 'Testing'). The test DB is dropped and recreated per session.
"""
import os
import pathlib
import subprocess

import pytest

os.environ.setdefault("DB_NAME", "orbitx_test")
os.environ.setdefault("DB_USER", "orbitx_app")
os.environ.setdefault("DB_PASSWORD", "testpw")

from fastapi.testclient import TestClient  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.services.ingest_service import load_many  # noqa: E402
from tests.fixtures import build_set  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]


def _apply_sql(path: pathlib.Path, db_name: str):
    sql = path.read_text().replace("utf8mb4_0900_ai_ci", "utf8mb4_unicode_ci")
    sql = sql.replace("orbitx", db_name) if path.name == "schema.sql" else sql
    cmd = ["mysql", "-uroot"]
    if os.getenv("TEST_DB_ROOT_ARGS"):
        cmd = ["mysql"] + os.environ["TEST_DB_ROOT_ARGS"].split()
    subprocess.run(cmd, input=sql, text=True, check=True)


@pytest.fixture(scope="session")
def db_ready():
    db_name = os.environ["DB_NAME"]
    _apply_sql(ROOT / "database" / "schema.sql", db_name)
    for mig in sorted((ROOT / "database" / "migrations").glob("*.sql")) if (ROOT / "database" / "migrations").exists() else []:
        sql = mig.read_text().replace("orbitx", db_name) if False else mig.read_text()
        subprocess.run(["mysql", "-uroot", db_name], input=sql, text=True, check=True)
    subprocess.run(["mysql", "-uroot", "-e", f"GRANT ALL ON {db_name}.* TO 'orbitx_app'@'%'; FLUSH PRIVILEGES;"], check=True)
    db = SessionLocal()
    for cat, tles in build_set().items():
        load_many(db, tles, cat)
    db.close()
    yield


@pytest.fixture()
def client(db_ready):
    return TestClient(app)
