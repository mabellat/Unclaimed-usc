import os
from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from unclaimed import admin, agents_api, match, repo, students
from unclaimed.db import get_session
from unclaimed.vocab import NEEDS

app = FastAPI(title="Unclaimed API")
app.include_router(admin.router)
app.include_router(students.router)
app.include_router(agents_api.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("WEB_ORIGINS", "http://localhost:3000,http://localhost:3001").split(","),
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


# Public routes read through repo only, so they can never return a non-approved record.
@app.get("/resources")
def list_resources(session: Session = Depends(get_session)):
    return {
        "data_version": repo.current_data_version(session),
        "resources": [repo.public_dict(r) for r in repo.list_approved(session)],
    }


@app.get("/resources/{resource_id}")
def get_resource(resource_id: str, session: Session = Depends(get_session)):
    r = repo.get_approved(session, resource_id)
    if r is None:
        raise HTTPException(404, "not found")
    return {"data_version": r.data_version, "resource": repo.public_dict(r)}


class MatchRequest(BaseModel):
    facts: dict[str, Any] = Field(default_factory=dict, description="Self-reported answers. A missing or null field is unknown.")
    needs: list[str] = Field(default_factory=list)


@app.post("/match")
def run_match(body: MatchRequest, session: Session = Depends(get_session)):
    if bad := sorted(set(body.needs) - set(NEEDS)):
        raise HTTPException(422, f"unknown needs: {', '.join(bad)}")
    resources = [repo.public_dict(r) for r in repo.list_approved(session)]
    try:
        return match.run_match(resources, body.facts, body.needs)
    except match.ProfileError as e:
        raise HTTPException(422, str(e))
