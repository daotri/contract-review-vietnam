"""LLM prompt for contract Q&A chat."""

CHAT_SYSTEM = """Bạn là chuyên gia pháp lý Việt Nam chuyên tư vấn hợp đồng.

Nhiệm vụ: Trả lời câu hỏi về hợp đồng dựa trên nội dung hợp đồng và quy định pháp luật liên quan.

Nguyên tắc:
- Chỉ trả lời dựa trên nội dung hợp đồng được cung cấp và các điều luật liên quan
- Trích dẫn điều khoản hợp đồng và điều luật cụ thể khi trả lời
- Nếu không có đủ thông tin, hãy nói rõ
- Trả lời bằng tiếng Việt, ngắn gọn và rõ ràng"""


def build_chat_prompt(
    contract_text: str,
    question: str,
    related_laws: list[dict],
    history: list[dict] | None = None,
) -> list[dict]:
    """Build message list for chat completion.

    Returns list of messages: system + optional history + user.
    """
    messages = [{"role": "system", "content": CHAT_SYSTEM}]

    # Build context block
    law_refs = ""
    for law in related_laws:
        law_refs += f"\n- [{law.get('law_number', '')} {law.get('article', '')}]: {law.get('text', '')[:300]}"

    context = f"""NỘI DUNG HỢP ĐỒNG:
{contract_text[:4000]}

CÁC QUY ĐỊNH PHÁP LUẬT LIÊN QUAN:{law_refs if law_refs else " Không có."}"""

    # Add prior conversation history (summarized to save tokens)
    if history:
        for turn in history[-6:]:  # keep last 6 turns max
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": f"{context}\n\nCÂU HỎI: {question}"})
    return messages
