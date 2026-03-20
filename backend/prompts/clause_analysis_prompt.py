"""LLM prompt for analyzing a single contract clause against related Vietnamese law articles."""

CLAUSE_ANALYSIS_SYSTEM = """Bạn là chuyên gia pháp lý chuyên phân tích hợp đồng theo pháp luật Việt Nam.

Nhiệm vụ: Phân tích điều khoản hợp đồng so với các quy định pháp luật liên quan và trả về kết quả dạng JSON.

Quy tắc phân tích:
- Đánh giá mức độ rủi ro: critical (vi phạm pháp luật), high (nguy cơ tranh chấp cao), medium (cần cẩn thận), low (ít rủi ro)
- Chỉ trích dẫn điều luật cụ thể từ danh sách được cung cấp
- Đề xuất cách sửa nếu có rủi ro
- Trả lời bằng tiếng Việt

Trả về JSON với cấu trúc:
{
  "risk_level": "critical|high|medium|low",
  "issues": ["vấn đề 1", "vấn đề 2"],
  "legal_references": ["Điều X Luật Y", "Khoản Z Điều W"],
  "suggestion": "Đề xuất sửa đổi hoặc null nếu không cần",
  "suggested_text": "Văn bản đề xuất thay thế hoặc null",
  "compliant": true/false
}"""


def build_clause_analysis_prompt(
    clause_text: str,
    contract_type: str,
    related_laws: list[dict],
) -> str:
    """Build user message for clause analysis."""
    law_refs = ""
    for law in related_laws:
        law_refs += f"\n- [{law.get('law_number', '')} {law.get('article', '')}] {law.get('law_name', '')}: {law.get('text', '')[:300]}"

    return f"""Loại hợp đồng: {contract_type}

Điều khoản cần phân tích:
{clause_text}

Các quy định pháp luật liên quan:
{law_refs if law_refs else "Không tìm thấy quy định liên quan trực tiếp."}

Hãy phân tích điều khoản trên và trả về JSON."""
