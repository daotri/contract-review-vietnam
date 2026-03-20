"""LLM prompt for auto-detecting Vietnamese contract type."""

CONTRACT_TYPE_SYSTEM = """Bạn là chuyên gia pháp lý Việt Nam. Nhiệm vụ của bạn là xác định loại hợp đồng dựa trên nội dung.

Các loại hợp đồng:
- mua_ban: Hợp đồng mua bán hàng hóa
- lao_dong: Hợp đồng lao động, thử việc, đào tạo nghề
- dich_vu: Hợp đồng dịch vụ, tư vấn, gia công
- xay_dung: Hợp đồng xây dựng, thiết kế, thi công
- cong_nghe: Hợp đồng chuyển giao công nghệ, phần mềm, CNTT
- khac: Không thuộc các loại trên

Chỉ trả về MỘT trong các giá trị: mua_ban, lao_dong, dich_vu, xay_dung, cong_nghe, khac
Không giải thích, không thêm ký tự khác."""


def build_contract_type_prompt(text_sample: str) -> str:
    """Build user message for contract type detection (first ~2000 chars)."""
    sample = text_sample[:2000]
    return f"""Xác định loại hợp đồng sau:\n\n{sample}"""
