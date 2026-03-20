"""Auto-detect Vietnamese contract type using LLM classification."""

import logging

from prompts.contract_type_prompt import CONTRACT_TYPE_SYSTEM, build_contract_type_prompt
from services.llm_service import llm_service

logger = logging.getLogger(__name__)

VALID_TYPES = {"mua_ban", "lao_dong", "dich_vu", "xay_dung", "cong_nghe", "khac"}
FALLBACK_TYPE = "khac"


async def detect_contract_type(text: str) -> str:
    """Classify contract type from text.

    Sends first ~2000 chars to LLM and returns one of:
    mua_ban, lao_dong, dich_vu, xay_dung, cong_nghe, khac
    """
    messages = [
        {"role": "system", "content": CONTRACT_TYPE_SYSTEM},
        {"role": "user", "content": build_contract_type_prompt(text)},
    ]

    try:
        # Use low temperature for deterministic classification
        result = await llm_service.complete(messages, temperature=0.0)
        detected = result.strip().lower().replace("-", "_")

        if detected in VALID_TYPES:
            logger.info("Detected contract type: %s", detected)
            return detected

        # Partial match fallback
        for valid in VALID_TYPES:
            if valid in detected:
                logger.info("Detected contract type (partial match): %s", valid)
                return valid

        logger.warning("LLM returned unexpected type '%s'; defaulting to '%s'", detected, FALLBACK_TYPE)
        return FALLBACK_TYPE

    except Exception as exc:
        logger.error("Contract type detection failed: %s; defaulting to '%s'", exc, FALLBACK_TYPE)
        return FALLBACK_TYPE
