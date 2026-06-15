from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


_is_sqlite = settings.database_url.startswith("sqlite")

# SQLite ignores pool sizing; Postgres uses a deliberately small pool (see config).
# pool_recycle guards against RDS idle-timeout killing a connection a frozen Lambda
# container would otherwise try to reuse.
_engine_kwargs: dict = {"pool_pre_ping": True, "future": True}
if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs.update(
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=900,
    )
    # RDS Postgres enforces TLS by default. pg8000 takes an ssl.SSLContext via
    # connect_args; the link is private (in-VPC) so we encrypt but skip CA checks.
    if "pg8000" in settings.database_url:
        import ssl

        _ssl_ctx = ssl.create_default_context()
        _ssl_ctx.check_hostname = False
        _ssl_ctx.verify_mode = ssl.CERT_NONE
        _engine_kwargs["connect_args"] = {"ssl_context": _ssl_ctx}

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

if _is_sqlite:
    # WAL improves read/write concurrency for the single-server deployment;
    # busy_timeout makes brief write locks wait instead of erroring.
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.close()


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
