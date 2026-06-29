"""POST /score — synchronous single-transaction scoring."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.schemas.transaction import ScoredTransaction, TransactionIn
from backend.services.model_service import model_service

router = APIRouter(tags=["scoring"])


@router.post("/score", response_model=ScoredTransaction)
def score_transaction(txn: TransactionIn) -> ScoredTransaction:
    if not model_service.loaded:
        raise HTTPException(status_code=503, detail="model not loaded")
    result = model_service.score(
        transaction_id=txn.transaction_id,
        amount=txn.amount,
        time=txn.time,
        features=txn.features,
        is_replay=False,
    )
    return ScoredTransaction(**result)
