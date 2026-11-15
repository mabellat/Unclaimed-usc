from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"

# Settings live in <repo>/.env (git-ignored; see .env.example). Values already set in the
# shell win, so `export X=...` still overrides the file.
load_dotenv(ROOT / ".env", override=False)
