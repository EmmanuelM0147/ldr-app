from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException

from app.deps import get_current_couple
from app.llm import LlmClient, LlmNotConfiguredError, LlmProviderError, get_llm_client
from app.models import Couple
from app.schemas.api import DateNightIdea, DateNightIdeaRequest

router = APIRouter()


@router.post("/ideas", response_model=DateNightIdea, operation_id="createDateNightIdea")
def create_date_night_idea(
    couple: Couple = Depends(get_current_couple),
    llm: LlmClient = Depends(get_llm_client),
    body: Annotated[DateNightIdeaRequest | None, Body()] = None,
) -> DateNightIdea:
    if not couple.ai_opt_in:
        raise HTTPException(status_code=403, detail="Turn on AI ideas in settings first.")
    request = body or DateNightIdeaRequest()
    try:
        idea = llm.suggest_date_night(request.vibe)
    except LlmNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail="Date-night ideas are not configured.") from exc
    except LlmProviderError as exc:
        raise HTTPException(status_code=503, detail="Could not get an idea right now.") from exc
    return DateNightIdea(idea=idea)
