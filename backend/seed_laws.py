"""Seed law definitions for Vietnamese legal knowledge base."""

# Priority 1 — Foundation for all contracts
# Priority 2 — Contract-type specific
# Priority 3 — Litigation & dispute resolution
# Source: thuvienphapluat.vn (static HTML, no JS rendering needed)

SEED_LAWS: list[dict] = [
    # Priority 1
    {
        "law_number": "91/2015/QH13",
        "law_name": "Bộ luật Dân sự 2015",
        "source_url": "https://thuvienphapluat.vn/van-ban/Quyen-dan-su/Bo-luat-dan-su-2015-296215.aspx",
        "priority": 1,
        "applies_to": ["all"],
    },
    {
        "law_number": "36/2005/QH11",
        "law_name": "Luật Thương mại 2005",
        "source_url": "https://thuvienphapluat.vn/van-ban/Thuong-mai/Luat-Thuong-mai-2005-36-2005-QH11-2636.aspx",
        "priority": 1,
        "applies_to": ["mua_ban", "dai_ly", "dich_vu"],
    },
    {
        "law_number": "54/2010/QH12",
        "law_name": "Luật Trọng tài thương mại 2010",
        "source_url": "https://thuvienphapluat.vn/van-ban/Thu-tuc-To-tung/Luat-trong-tai-thuong-mai-2010-108083.aspx",
        "priority": 1,
        "applies_to": ["all"],
    },
    # Priority 2
    {
        "law_number": "45/2019/QH14",
        "law_name": "Bộ luật Lao động 2019",
        "source_url": "https://thuvienphapluat.vn/van-ban/Lao-dong-Tien-luong/Bo-Luat-lao-dong-2019-333670.aspx",
        "priority": 2,
        "applies_to": ["lao_dong"],
    },
    {
        "law_number": "145/2020/ND-CP",
        "law_name": "Nghị định 145/2020/NĐ-CP hướng dẫn Bộ luật Lao động",
        "source_url": "https://thuvienphapluat.vn/van-ban/Lao-dong-Tien-luong/Nghi-dinh-145-2020-ND-CP-huong-dan-Bo-luat-Lao-dong-ve-dieu-kien-lao-dong-460128.aspx",
        "priority": 2,
        "applies_to": ["lao_dong"],
    },
    {
        "law_number": "50/2014/QH13",
        "law_name": "Luật Xây dựng 2014",
        "source_url": "https://thuvienphapluat.vn/van-ban/Xay-dung-Do-thi/Luat-Xay-dung-2014-238644.aspx",
        "priority": 2,
        "applies_to": ["xay_dung"],
    },
    {
        "law_number": "37/2015/ND-CP",
        "law_name": "Nghị định 37/2015/NĐ-CP về hợp đồng xây dựng",
        "source_url": "https://thuvienphapluat.vn/van-ban/Xay-dung-Do-thi/Nghi-dinh-37-2015-ND-CP-hop-dong-xay-dung-271954.aspx",
        "priority": 2,
        "applies_to": ["xay_dung"],
    },
    {
        "law_number": "13/2023/ND-CP",
        "law_name": "Nghị định 13/2023/NĐ-CP bảo vệ dữ liệu cá nhân",
        "source_url": "https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-13-2023-ND-CP-bao-ve-du-lieu-ca-nhan-556614.aspx",
        "priority": 2,
        "applies_to": ["dich_vu", "cong_nghe"],
    },
    # Priority 3
    {
        "law_number": "92/2015/QH13",
        "law_name": "Bộ luật Tố tụng Dân sự 2015",
        "source_url": "https://thuvienphapluat.vn/van-ban/Thu-tuc-To-tung/Bo-luat-to-tung-dan-su-2015-296861.aspx",
        "priority": 3,
        "applies_to": ["all"],
    },
]
